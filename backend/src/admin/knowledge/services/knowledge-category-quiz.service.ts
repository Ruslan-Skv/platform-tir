import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { SubmitKnowledgeQuizDto } from '../dto/submit-knowledge-quiz.dto';
import { compareKnowledgeMaterialsForCategoryList } from '../knowledge-material-list-order';
import { KnowledgeQuizAttemptLimits } from '../knowledge-quiz.service';
import { KnowledgePlatformSettingsService } from './knowledge-platform-settings.service';

type CategoryQuizMaterial = Prisma.KnowledgeMaterialGetPayload<{
  include: {
    module: { select: { id: true; name: true; order: true } };
    quiz: {
      include: {
        questions: {
          include: { options: true };
        };
      };
    };
  };
}>;

type CategoryQuizQuestion = NonNullable<CategoryQuizMaterial['quiz']>['questions'][number];

type CategoryQuizAttemptRow = {
  passed: boolean;
  createdAt: Date;
  scorePercent: number;
  id: string;
};

type CategoryQuizAttemptRecord = Pick<CategoryQuizAttemptRow, 'passed' | 'createdAt'>;

@Injectable()
export class KnowledgeCategoryQuizService {
  constructor(
    private prisma: PrismaService,
    private readonly platformSettings: KnowledgePlatformSettingsService,
  ) {}

  private startOfLocalDay(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private startOfNextLocalDay(date: Date): Date {
    const next = this.startOfLocalDay(date);
    next.setDate(next.getDate() + 1);
    return next;
  }

  private buildAttemptLimits(
    attempts: CategoryQuizAttemptRecord[],
    maxAttemptsPerDay: number,
    cooldownMinutes: number,
    now = new Date(),
  ): KnowledgeQuizAttemptLimits {
    const cooldownMs = cooldownMinutes * 60_000;
    const base = {
      maxAttemptsPerDay,
      cooldownMinutes,
    };

    const hasPassed = attempts.some((attempt) => attempt.passed);
    if (hasPassed) {
      const todayStart = this.startOfLocalDay(now);
      const attemptsToday = attempts.filter((attempt) => attempt.createdAt >= todayStart).length;
      return {
        ...base,
        canStart: true,
        blockedReason: null,
        nextAttemptAt: null,
        attemptsToday,
      };
    }

    const todayStart = this.startOfLocalDay(now);
    const attemptsToday = attempts.filter((attempt) => attempt.createdAt >= todayStart);

    if (attemptsToday.length >= maxAttemptsPerDay) {
      return {
        ...base,
        canStart: false,
        blockedReason: 'daily_limit',
        nextAttemptAt: this.startOfNextLocalDay(now).toISOString(),
        attemptsToday: attemptsToday.length,
      };
    }

    const latestAttempt = attempts[0];
    if (latestAttempt && !latestAttempt.passed) {
      const cooldownEndsAt = new Date(latestAttempt.createdAt.getTime() + cooldownMs);
      if (now < cooldownEndsAt) {
        return {
          ...base,
          canStart: false,
          blockedReason: 'cooldown',
          nextAttemptAt: cooldownEndsAt.toISOString(),
          attemptsToday: attemptsToday.length,
        };
      }
    }

    return {
      ...base,
      canStart: true,
      blockedReason: null,
      nextAttemptAt: null,
      attemptsToday: attemptsToday.length,
    };
  }

  private async getUserAttemptsForCategory(categoryId: string, userId: string) {
    if (!userId) return [];

    return this.prisma.knowledgeCategoryQuizAttempt.findMany({
      where: { categoryId, userId },
      orderBy: { createdAt: 'desc' },
      select: { passed: true, createdAt: true, scorePercent: true, id: true },
    });
  }

  private assertCanStartAttempt(limits: KnowledgeQuizAttemptLimits) {
    if (limits.canStart) return;

    if (limits.blockedReason === 'daily_limit') {
      throw new HttpException(
        'Исчерпан лимит попыток на сегодня. Следующая попытка будет доступна завтра.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    throw new HttpException(
      `Повторная попытка будет доступна через ${limits.cooldownMinutes} минут после неуспешного прохождения.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async loadCategoryQuizMaterials(
    categoryId: string,
    editorView: boolean,
  ): Promise<CategoryQuizMaterial[]> {
    const materials = await this.prisma.knowledgeMaterial.findMany({
      where: {
        categoryId,
        deletedAt: null,
        type: 'ARTICLE',
        ...(editorView ? {} : { status: PageStatus.PUBLISHED }),
        quiz: { questions: { some: {} } },
      },
      include: {
        module: { select: { id: true, name: true, order: true } },
        quiz: {
          include: {
            questions: {
              include: { options: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return materials
      .filter((material) => material.quiz && material.quiz.questions.length > 0)
      .sort((a, b) =>
        compareKnowledgeMaterialsForCategoryList(
          {
            id: a.id,
            status: a.status,
            sortOrder: a.sortOrder,
            isPinned: a.isPinned,
            createdAt: a.createdAt,
            publishedAt: a.publishedAt,
            module: a.module ? { order: a.module.order } : null,
          },
          {
            id: b.id,
            status: b.status,
            sortOrder: b.sortOrder,
            isPinned: b.isPinned,
            createdAt: b.createdAt,
            publishedAt: b.publishedAt,
            module: b.module ? { order: b.module.order } : null,
          },
        ),
      );
  }

  private mapQuestionForClient(question: CategoryQuizQuestion, editorView: boolean) {
    return {
      id: question.id,
      sortOrder: question.sortOrder,
      text: question.text,
      explanation: editorView ? question.explanation : undefined,
      options: [...question.options]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((option) => ({
          id: option.id,
          sortOrder: option.sortOrder,
          text: option.text,
          ...(editorView ? { isCorrect: option.isCorrect } : {}),
        })),
    };
  }

  private buildCategoryQuizPayload(
    category: { id: string; name: string; slug: string },
    materials: CategoryQuizMaterial[],
    editorView: boolean,
    timePerQuestionSeconds: number,
  ) {
    const sections = materials.map((material) => ({
      materialId: material.id,
      materialTitle: material.title,
      moduleName: material.module?.name ?? null,
      questions: [...(material.quiz?.questions ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((question) => this.mapQuestionForClient(question, editorView)),
    }));

    const questionCount = sections.reduce((sum, section) => sum + section.questions.length, 0);
    const passingScores = materials
      .map((material) => material.quiz?.passingScorePercent)
      .filter((value): value is number => typeof value === 'number');

    return {
      categoryId: category.id,
      title: `Итоговый тест: ${category.name}`,
      passingScorePercent: passingScores.length > 0 ? Math.max(...passingScores) : 80,
      timePerQuestionSeconds,
      questionCount,
      sections,
    };
  }

  async listCategoryTestsSummary(
    allowedCategoryIds: string[] | undefined,
    userId: string,
    editorView: boolean,
  ) {
    const categories = await this.prisma.knowledgeCategory.findMany({
      where: {
        deletedAt: null,
        ...(allowedCategoryIds ? { id: { in: allowedCategoryIds } } : {}),
      },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true },
    });

    const summaries = await Promise.all(
      categories.map(async (category) => {
        const materials = await this.loadCategoryQuizMaterials(category.id, editorView);
        const questionCount = materials.reduce(
          (sum, material) => sum + (material.quiz?.questions.length ?? 0),
          0,
        );

        if (questionCount === 0) {
          return null;
        }

        const attempts = userId ? await this.getUserAttemptsForCategory(category.id, userId) : [];
        const bestAttempt = attempts.reduce<CategoryQuizAttemptRow | null>((best, current) => {
          if (!best) return current;
          if (current.scorePercent > best.scorePercent) return current;
          if (current.scorePercent === best.scorePercent && current.passed && !best.passed) {
            return current;
          }
          return best;
        }, null);

        return {
          category,
          materialCount: materials.length,
          questionCount,
          myBestAttempt: bestAttempt
            ? {
                id: bestAttempt.id,
                scorePercent: bestAttempt.scorePercent,
                passed: bestAttempt.passed,
                createdAt: bestAttempt.createdAt,
              }
            : null,
        };
      }),
    );

    return summaries.filter((item): item is NonNullable<typeof item> => item !== null);
  }

  async getCategoryQuiz(categoryId: string, userId: string, editorView = false) {
    const category = await this.prisma.knowledgeCategory.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { id: true, name: true, slug: true },
    });
    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    const materials = await this.loadCategoryQuizMaterials(categoryId, editorView);
    if (materials.length === 0) {
      return null;
    }

    const timePerQuestionSeconds =
      await this.platformSettings.getCategoryQuizTimePerQuestionSeconds();
    const quiz = this.buildCategoryQuizPayload(
      category,
      materials,
      editorView,
      timePerQuestionSeconds,
    );
    if (quiz.questionCount === 0) {
      return null;
    }

    const attempts = userId ? await this.getUserAttemptsForCategory(categoryId, userId) : [];
    const bestAttempt = attempts.reduce<CategoryQuizAttemptRow | null>((best, current) => {
      if (!best) return current;
      if (current.scorePercent > best.scorePercent) return current;
      if (current.scorePercent === best.scorePercent && current.passed && !best.passed) {
        return current;
      }
      return best;
    }, null);

    const [maxAttemptsPerDay, cooldownMinutes] = await Promise.all([
      this.platformSettings.getCategoryQuizMaxAttemptsPerDay(),
      this.platformSettings.getCategoryQuizRetryCooldownMinutes(),
    ]);

    return {
      category,
      quiz,
      myBestAttempt: bestAttempt
        ? {
            id: bestAttempt.id,
            scorePercent: bestAttempt.scorePercent,
            passed: bestAttempt.passed,
            createdAt: bestAttempt.createdAt,
          }
        : null,
      myLatestAttempt: attempts[0]
        ? {
            id: attempts[0].id,
            scorePercent: attempts[0].scorePercent,
            passed: attempts[0].passed,
            createdAt: attempts[0].createdAt,
          }
        : null,
      attemptLimits: this.buildAttemptLimits(attempts, maxAttemptsPerDay, cooldownMinutes),
    };
  }

  async submitAttempt(
    categoryId: string,
    userId: string,
    dto: SubmitKnowledgeQuizDto,
    editorView = false,
  ) {
    const quizData = await this.getCategoryQuiz(categoryId, userId, editorView);
    if (!quizData) {
      throw new NotFoundException('Тест для этой категории не найден');
    }

    const previousAttempts = await this.getUserAttemptsForCategory(categoryId, userId);
    const [maxAttemptsPerDay, cooldownMinutes] = await Promise.all([
      this.platformSettings.getCategoryQuizMaxAttemptsPerDay(),
      this.platformSettings.getCategoryQuizRetryCooldownMinutes(),
    ]);
    this.assertCanStartAttempt(
      this.buildAttemptLimits(previousAttempts, maxAttemptsPerDay, cooldownMinutes),
    );

    const allQuestions = quizData.quiz.sections.flatMap((section) => section.questions);
    const questionIds = allQuestions.map((question) => question.id);
    const answers = dto.answers ?? {};

    for (const questionId of questionIds) {
      if (!answers[questionId] && !dto.timedOut) {
        throw new BadRequestException('Ответьте на все вопросы теста');
      }
    }

    const materialQuestions = await this.prisma.knowledgeQuizQuestion.findMany({
      where: { id: { in: questionIds } },
      include: { options: true },
    });
    const questionById = new Map(materialQuestions.map((question) => [question.id, question]));

    let correct = 0;
    const results = allQuestions.map((question) => {
      const dbQuestion = questionById.get(question.id);
      const selectedOptionId = answers[question.id];
      const selected = selectedOptionId
        ? dbQuestion?.options.find((option) => option.id === selectedOptionId)
        : undefined;
      const correctOption = dbQuestion?.options.find((option) => option.isCorrect);
      const isCorrect = Boolean(selected?.isCorrect);
      if (isCorrect) correct += 1;

      return {
        questionId: question.id,
        questionText: question.text,
        selectedOptionId,
        selectedOptionText: selected?.text ?? null,
        correctOptionId: isCorrect ? (correctOption?.id ?? null) : null,
        correctOptionText: isCorrect ? (correctOption?.text ?? null) : null,
        isCorrect,
        explanation: isCorrect ? (dbQuestion?.explanation ?? null) : null,
      };
    });

    const scorePercent = Math.round((correct / questionIds.length) * 100);
    const passed = scorePercent >= quizData.quiz.passingScorePercent;

    const attempt = await this.prisma.knowledgeCategoryQuizAttempt.create({
      data: {
        categoryId,
        userId,
        scorePercent,
        passed,
        answers: answers as Prisma.InputJsonValue,
      },
    });

    return {
      attemptId: attempt.id,
      scorePercent,
      passed,
      passingScorePercent: quizData.quiz.passingScorePercent,
      correctCount: correct,
      totalCount: questionIds.length,
      results,
    };
  }
}
