import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SubmitKnowledgeQuizDto } from './dto/submit-knowledge-quiz.dto';
import { UpsertKnowledgeQuizDto } from './dto/upsert-knowledge-quiz.dto';

type QuizWithQuestions = Prisma.KnowledgeMaterialQuizGetPayload<{
  include: {
    questions: {
      include: { options: true };
    };
  };
}>;

const QUIZ_RETRY_COOLDOWN_MS = 30 * 60 * 1000;
const QUIZ_MAX_ATTEMPTS_PER_DAY = 3;

type QuizAttemptRecord = {
  passed: boolean;
  createdAt: Date;
};

export type KnowledgeQuizAttemptLimits = {
  canStart: boolean;
  blockedReason: 'cooldown' | 'daily_limit' | null;
  nextAttemptAt: string | null;
  attemptsToday: number;
  maxAttemptsPerDay: number;
  cooldownMinutes: number;
};

@Injectable()
export class KnowledgeQuizService {
  constructor(private prisma: PrismaService) {}

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
    attempts: QuizAttemptRecord[],
    now = new Date(),
  ): KnowledgeQuizAttemptLimits {
    const base = {
      maxAttemptsPerDay: QUIZ_MAX_ATTEMPTS_PER_DAY,
      cooldownMinutes: QUIZ_RETRY_COOLDOWN_MS / 60_000,
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

    if (attemptsToday.length >= QUIZ_MAX_ATTEMPTS_PER_DAY) {
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
      const cooldownEndsAt = new Date(latestAttempt.createdAt.getTime() + QUIZ_RETRY_COOLDOWN_MS);
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

  private async getUserAttemptsForMaterial(materialId: string, userId: string) {
    if (!userId) return [];

    return this.prisma.knowledgeQuizAttempt.findMany({
      where: { materialId, userId },
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
      'Повторная попытка будет доступна через 30 минут после неуспешного прохождения.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private mapQuizForClient(quiz: QuizWithQuestions, editorView: boolean) {
    return {
      id: quiz.id,
      materialId: quiz.materialId,
      title: quiz.title,
      passingScorePercent: quiz.passingScorePercent,
      timePerQuestionMinutes: quiz.timePerQuestionMinutes,
      questions: [...quiz.questions]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((q) => ({
          id: q.id,
          sortOrder: q.sortOrder,
          text: q.text,
          explanation: editorView ? q.explanation : undefined,
          options: [...q.options]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((o) => ({
              id: o.id,
              sortOrder: o.sortOrder,
              text: o.text,
              ...(editorView ? { isCorrect: o.isCorrect } : {}),
            })),
        })),
    };
  }

  async getQuizForMaterial(materialId: string, userId: string, editorView = false) {
    const material = await this.prisma.knowledgeMaterial.findUnique({
      where: { id: materialId },
      select: { id: true, status: true, type: true },
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }
    if (!editorView && material.status !== 'PUBLISHED') {
      throw new NotFoundException('Материал не найден');
    }

    const quiz = await this.prisma.knowledgeMaterialQuiz.findUnique({
      where: { materialId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!quiz) {
      return null;
    }

    const attempts = userId ? await this.getUserAttemptsForMaterial(materialId, userId) : [];

    const bestAttempt = attempts.reduce<(typeof attempts)[0] | null>((best, current) => {
      if (!best) return current;
      if (current.scorePercent > best.scorePercent) return current;
      if (current.scorePercent === best.scorePercent && current.passed && !best.passed) {
        return current;
      }
      return best;
    }, null);

    const attemptLimits = this.buildAttemptLimits(attempts);

    return {
      quiz: this.mapQuizForClient(quiz, editorView),
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
      attemptLimits,
    };
  }

  async upsertQuiz(materialId: string, dto: UpsertKnowledgeQuizDto) {
    const material = await this.prisma.knowledgeMaterial.findUnique({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException('Материал не найден');
    }
    if (material.type !== 'ARTICLE') {
      throw new BadRequestException('Тест можно привязать только к статье');
    }

    if (!dto.questions.length) {
      await this.prisma.knowledgeMaterialQuiz.deleteMany({ where: { materialId } });
      return null;
    }

    for (const question of dto.questions) {
      const correctCount = question.options.filter((o) => o.isCorrect).length;
      if (correctCount !== 1) {
        throw new BadRequestException(
          `В каждом вопросе должен быть ровно один правильный ответ: «${question.text.slice(0, 60)}…»`,
        );
      }
      if (question.options.length < 2) {
        throw new BadRequestException('У каждого вопроса должно быть минимум 2 варианта ответа');
      }
    }

    const quiz = await this.prisma.knowledgeMaterialQuiz.upsert({
      where: { materialId },
      create: {
        materialId,
        title: dto.title?.trim() || 'Проверка знаний',
        passingScorePercent: dto.passingScorePercent ?? 85,
        timePerQuestionMinutes: dto.timePerQuestionMinutes ?? 1,
      },
      update: {
        title: dto.title?.trim() || 'Проверка знаний',
        passingScorePercent: dto.passingScorePercent ?? 85,
        timePerQuestionMinutes: dto.timePerQuestionMinutes ?? 1,
      },
    });

    await this.prisma.knowledgeQuizQuestion.deleteMany({ where: { quizId: quiz.id } });

    for (const [qIndex, question] of dto.questions.entries()) {
      await this.prisma.knowledgeQuizQuestion.create({
        data: {
          ...(question.id ? { id: question.id } : {}),
          quizId: quiz.id,
          sortOrder: question.sortOrder ?? qIndex,
          text: question.text.trim(),
          explanation: question.explanation?.trim() || null,
          options: {
            create: question.options.map((option, oIndex) => ({
              ...(option.id ? { id: option.id } : {}),
              sortOrder: option.sortOrder ?? oIndex,
              text: option.text.trim(),
              isCorrect: option.isCorrect,
            })),
          },
        },
      });
    }

    return this.getQuizForMaterial(materialId, '', true);
  }

  async submitAttempt(
    materialId: string,
    userId: string,
    dto: SubmitKnowledgeQuizDto,
    editorView = false,
  ) {
    const quiz = await this.prisma.knowledgeMaterialQuiz.findUnique({
      where: { materialId },
      include: {
        questions: {
          include: { options: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!quiz) {
      throw new NotFoundException('Тест для этого материала не найден');
    }

    const material = await this.prisma.knowledgeMaterial.findUnique({
      where: { id: materialId },
    });
    if (!material || (!editorView && material.status !== 'PUBLISHED')) {
      throw new NotFoundException('Материал не найден');
    }

    const previousAttempts = await this.getUserAttemptsForMaterial(materialId, userId);
    this.assertCanStartAttempt(this.buildAttemptLimits(previousAttempts));

    const questionIds = quiz.questions.map((q) => q.id);
    const answers = dto.answers ?? {};

    for (const qId of questionIds) {
      if (!answers[qId] && !dto.timedOut) {
        throw new BadRequestException('Ответьте на все вопросы теста');
      }
    }

    let correct = 0;
    const results = quiz.questions.map((question) => {
      const selectedOptionId = answers[question.id];
      const selected = selectedOptionId
        ? question.options.find((o) => o.id === selectedOptionId)
        : undefined;
      const correctOption = question.options.find((o) => o.isCorrect);
      const isCorrect = Boolean(selected?.isCorrect);
      if (isCorrect) correct += 1;

      return {
        questionId: question.id,
        questionText: question.text,
        selectedOptionId,
        selectedOptionText: selected?.text ?? null,
        correctOptionId: correctOption?.id ?? null,
        correctOptionText: correctOption?.text ?? null,
        isCorrect,
        explanation: question.explanation,
      };
    });

    const scorePercent = Math.round((correct / questionIds.length) * 100);
    const passed = scorePercent >= quiz.passingScorePercent;

    const attempt = await this.prisma.knowledgeQuizAttempt.create({
      data: {
        quizId: quiz.id,
        materialId,
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
      passingScorePercent: quiz.passingScorePercent,
      correctCount: correct,
      totalCount: questionIds.length,
      results,
    };
  }

  async getUserQuizStatusForMaterials(materialIds: string[], userId: string) {
    if (!materialIds.length) return {};

    const attempts = await this.prisma.knowledgeQuizAttempt.findMany({
      where: { materialId: { in: materialIds }, userId },
      orderBy: { createdAt: 'desc' },
    });

    const quizzes = await this.prisma.knowledgeMaterialQuiz.findMany({
      where: { materialId: { in: materialIds } },
      select: { materialId: true },
    });
    const hasQuiz = new Set(quizzes.map((q) => q.materialId));

    const statusMap: Record<
      string,
      { hasQuiz: boolean; passed: boolean; scorePercent: number | null }
    > = {};

    for (const materialId of materialIds) {
      if (!hasQuiz.has(materialId)) {
        statusMap[materialId] = { hasQuiz: false, passed: false, scorePercent: null };
        continue;
      }

      const materialAttempts = attempts.filter((a) => a.materialId === materialId);
      const best = materialAttempts.reduce<(typeof materialAttempts)[0] | null>((acc, cur) => {
        if (!acc) return cur;
        if (cur.scorePercent > acc.scorePercent) return cur;
        if (cur.passed && !acc.passed) return cur;
        return acc;
      }, null);

      statusMap[materialId] = {
        hasQuiz: true,
        passed: best?.passed ?? false,
        scorePercent: best?.scorePercent ?? null,
      };
    }

    return statusMap;
  }
}
