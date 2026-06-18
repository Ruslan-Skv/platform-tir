import { Injectable } from '@nestjs/common';
import { KnowledgeMaterialType, Prisma, SalesCandidate } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

export type CandidateTrainingProgress = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  trackableCount: number;
  completedCount: number;
  completionPercent: number;
  videosCompleted: number;
  quizzesPassed: number;
  lastActivityAt: string | null;
  materials: Array<{
    materialId: string;
    title: string;
    type: KnowledgeMaterialType;
    categoryName: string;
    hasQuiz: boolean;
    completed: boolean;
    inProgress: boolean;
    videoProgressPercent: number | null;
    quizPassed: boolean | null;
    quizScorePercent: number | null;
  }>;
};

@Injectable()
export class RecruitmentKnowledgeSyncService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publishedMaterialWhere: Prisma.KnowledgeMaterialWhereInput = {
    deletedAt: null,
    status: 'PUBLISHED',
    category: { deletedAt: null },
    OR: [{ moduleId: null }, { module: { deletedAt: null } }],
  };

  async getTrainingProgress(userId: string): Promise<CandidateTrainingProgress | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, isActive: true },
    });

    if (!user) return null;

    const materialsRaw = await this.prisma.knowledgeMaterial.findMany({
      where: this.publishedMaterialWhere,
      select: {
        id: true,
        title: true,
        type: true,
        category: { select: { name: true } },
        quiz: { select: { id: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });

    const trackableMaterials = materialsRaw.filter(
      (m) => Boolean(m.quiz) || m.type === KnowledgeMaterialType.VIDEO,
    );
    const trackableIds = trackableMaterials.map((m) => m.id);
    const quizIds = trackableMaterials.filter((m) => m.quiz).map((m) => m.id);

    const [videoProgressRows, quizAttempts] = await Promise.all([
      trackableIds.length
        ? this.prisma.knowledgeVideoProgress.findMany({
            where: { userId, materialId: { in: trackableIds } },
            select: {
              materialId: true,
              progressPercent: true,
              completed: true,
              updatedAt: true,
            },
          })
        : Promise.resolve([]),
      quizIds.length
        ? this.prisma.knowledgeQuizAttempt.findMany({
            where: { userId, materialId: { in: quizIds } },
            select: {
              materialId: true,
              passed: true,
              scorePercent: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const videoByMaterial = new Map(videoProgressRows.map((r) => [r.materialId, r]));
    const quizByMaterial = new Map<string, (typeof quizAttempts)[0]>();
    for (const attempt of quizAttempts) {
      if (!quizByMaterial.has(attempt.materialId)) {
        quizByMaterial.set(attempt.materialId, attempt);
      }
    }

    let completedCount = 0;
    let videosCompleted = 0;
    let quizzesPassed = 0;

    const materials = trackableMaterials.map((material) => {
      const hasQuiz = Boolean(material.quiz);
      const video = videoByMaterial.get(material.id);
      const quiz = quizByMaterial.get(material.id);

      let completed = false;
      let inProgress = false;

      if (hasQuiz) {
        completed = Boolean(quiz?.passed);
        inProgress = Boolean(quiz && !quiz.passed);
        if (quiz?.passed) quizzesPassed += 1;
      } else if (material.type === KnowledgeMaterialType.VIDEO) {
        completed = Boolean(video?.completed);
        inProgress = Boolean(video && video.progressPercent > 0 && !video.completed);
        if (video?.completed) videosCompleted += 1;
      }

      if (completed) completedCount += 1;

      return {
        materialId: material.id,
        title: material.title,
        type: material.type,
        categoryName: material.category.name,
        hasQuiz,
        completed,
        inProgress,
        videoProgressPercent: video?.progressPercent ?? null,
        quizPassed: quiz?.passed ?? null,
        quizScorePercent: quiz?.scorePercent ?? null,
      };
    });

    let lastActivityAt: Date | undefined;
    for (const row of videoProgressRows) {
      if (!lastActivityAt || row.updatedAt > lastActivityAt) {
        lastActivityAt = row.updatedAt;
      }
    }
    for (const attempt of quizAttempts) {
      if (!lastActivityAt || attempt.createdAt > lastActivityAt) {
        lastActivityAt = attempt.createdAt;
      }
    }

    const trackableCount = trackableMaterials.length;
    const completionPercent =
      trackableCount > 0 ? Math.round((completedCount / trackableCount) * 1000) / 10 : 0;

    const lastActivityIso = lastActivityAt ? lastActivityAt.toISOString() : null;

    return {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      trackableCount,
      completedCount,
      completionPercent,
      videosCompleted,
      quizzesPassed,
      lastActivityAt: lastActivityIso,
      materials,
    };
  }
}

export type CandidateScoreBreakdown = {
  softSkillsScore: number | null;
  experienceScore: number | null;
  interviewScore: number | null;
  trainingScore: number | null;
  resumeScore: number | null;
  overallScore: number | null;
  recommendation: string;
  strengths: string[];
  weaknesses: string[];
};

export function calculateCandidateScore(
  candidate: SalesCandidate,
  trainingProgress: CandidateTrainingProgress | null,
): CandidateScoreBreakdown {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const skillValues = [
    candidate.communicationSkill,
    candidate.stressResistance,
    candidate.motivation,
    candidate.teamworkSkill,
    candidate.selfOrganization,
    candidate.pcSkill,
    candidate.presentationSkill,
  ].filter((v): v is number => v != null && v > 0);

  let softSkillsScore: number | null = null;
  if (skillValues.length > 0) {
    const avg = skillValues.reduce((a, b) => a + b, 0) / skillValues.length;
    softSkillsScore = Math.round((avg / 10) * 100);
    if (avg >= 8) strengths.push('Высокие оценки по soft skills');
    else if (avg < 5) weaknesses.push('Низкие оценки по soft skills');
  }

  let experienceScore: number | null = null;
  if (candidate.salesExperienceYears != null) {
    experienceScore = Math.round(Math.min(candidate.salesExperienceYears / 5, 1) * 100);
    if (candidate.salesExperienceYears >= 3) strengths.push('Опыт продаж от 3 лет');
    else if (candidate.salesExperienceYears < 1) weaknesses.push('Минимальный опыт продаж');
  }

  let interviewScore: number | null = null;
  if (candidate.interviewScore != null) {
    interviewScore = Math.round((candidate.interviewScore / 10) * 100);
    if (candidate.interviewScore >= 8) strengths.push('Высокая оценка на собеседовании');
    else if (candidate.interviewScore < 5) weaknesses.push('Низкая оценка на собеседовании');
  }

  let trainingScore: number | null = null;
  if (trainingProgress) {
    trainingScore = Math.round(trainingProgress.completionPercent);
    if (trainingProgress.completionPercent >= 80) strengths.push('Высокий прогресс обучения');
    else if (trainingProgress.completionPercent < 30)
      weaknesses.push('Низкий прогресс обучения на платформе');
  }

  let resumeScore: number | null = null;
  const parsed = candidate.resumeParsedData as Record<string, unknown> | null;
  if (parsed) {
    const skills = (parsed.skills as string[] | undefined) ?? [];
    const expYears = parsed.experienceYears as number | null | undefined;
    let score = 0;
    let parts = 0;
    if (skills.length > 0) {
      score += Math.min(skills.length / 5, 1) * 50;
      parts += 50;
      if (skills.length >= 4) strengths.push('Релевантные навыки в резюме');
    }
    if (expYears != null) {
      score += Math.min(expYears / 5, 1) * 50;
      parts += 50;
    }
    resumeScore = parts > 0 ? Math.round((score / parts) * 100) : null;
    if (!resumeScore) resumeScore = candidate.resumeParsedText ? 30 : null;
  } else if (candidate.resumeParsedText) {
    resumeScore = 30;
  }

  const components = [
    { score: softSkillsScore, weight: 25 },
    { score: experienceScore, weight: 20 },
    { score: interviewScore, weight: 20 },
    { score: trainingScore, weight: 20 },
    { score: resumeScore, weight: 15 },
  ].filter((c) => c.score != null);

  let overallScore: number | null = null;
  if (components.length > 0) {
    const totalWeight = components.reduce((s, c) => s + c.weight, 0);
    overallScore =
      Math.round(
        (components.reduce((s, c) => s + (c.score! * c.weight) / 100, 0) / totalWeight) * 1000,
      ) / 10;
  }

  let recommendation = 'Недостаточно данных для рекомендации';
  if (overallScore != null) {
    if (overallScore >= 80) recommendation = 'Рекомендуется к найму — сильный кандидат';
    else if (overallScore >= 65) recommendation = 'Рекомендуется — хороший кандидат с потенциалом';
    else if (overallScore >= 50) recommendation = 'Рассмотреть — требуется дополнительная оценка';
    else if (overallScore >= 35) recommendation = 'Сомнительный кандидат — высокие риски';
    else recommendation = 'Не рекомендуется';
  }

  if (candidate.status === 'REJECTED') {
    recommendation = 'Отклонён';
  } else if (candidate.status === 'HIRED') {
    recommendation = 'Принят на работу';
  }

  return {
    softSkillsScore,
    experienceScore,
    interviewScore,
    trainingScore,
    resumeScore,
    overallScore,
    recommendation,
    strengths,
    weaknesses,
  };
}
