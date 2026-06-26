import { Injectable } from '@nestjs/common';
import { KnowledgeMaterialType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  type KnowledgeTrainingAnalyticsParams,
  PUBLISHED_KNOWLEDGE_MATERIAL_WHERE,
  TRAINING_ANALYTICS_MATERIAL_SELECT,
  type TrainingAnalyticsVideoProgressRow,
  buildTrainingActivityTimeline,
  buildTrainingAnalyticsCategoryMetaMap,
  buildTrainingAnalyticsCategoryTimeline,
  eachTrainingAnalyticsDayIso,
  isTrainingAnalyticsTrackableMaterial,
  mapTrainingAnalyticsMaterials,
  resolveTrainingAnalyticsPeriod,
  resolveTrainingMaterialCompletionDate,
  roundTrainingAnalyticsPercent,
  sortTrainingAnalyticsCategories,
  trainingAnalyticsEndOfDay,
  type TrainingAnalyticsMaterialRow,
} from './knowledge-training-analytics.util';

export type KnowledgeMyTrainingProgressScope = {
  allowedCategoryIds: string[];
};

@Injectable()
export class KnowledgeMyTrainingProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyTrainingProgress(
    userId: string,
    params: KnowledgeTrainingAnalyticsParams,
    scope: KnowledgeMyTrainingProgressScope,
  ) {
    const period = resolveTrainingAnalyticsPeriod(params);
    const allowedCategoryIds = new Set(scope.allowedCategoryIds);

    const materialsRaw = await this.prisma.knowledgeMaterial.findMany({
      where: PUBLISHED_KNOWLEDGE_MATERIAL_WHERE,
      select: TRAINING_ANALYTICS_MATERIAL_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });

    const materials = mapTrainingAnalyticsMaterials(materialsRaw).filter((material) =>
      allowedCategoryIds.has(material.categoryId),
    );
    const trackableMaterials = materials.filter(isTrainingAnalyticsTrackableMaterial);
    const trackableIds = trackableMaterials.map((m) => m.id);
    const quizIds = trackableMaterials.filter((m) => m.hasQuiz).map((m) => m.id);

    const [
      videoProgressRows,
      quizPassedAttempts,
      quizAllAttempts,
      videoUpdatesInPeriod,
      quizAttemptsInPeriod,
    ] = await Promise.all([
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
            where: { userId, materialId: { in: quizIds }, passed: true },
            select: {
              materialId: true,
              passed: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
      quizIds.length
        ? this.prisma.knowledgeQuizAttempt.findMany({
            where: { userId, materialId: { in: quizIds } },
            select: {
              materialId: true,
              passed: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      trackableIds.length
        ? this.prisma.knowledgeVideoProgress.findMany({
            where: {
              userId,
              materialId: { in: trackableIds },
              updatedAt: { gte: period.from, lte: period.to },
            },
            select: { updatedAt: true },
          })
        : Promise.resolve([]),
      trackableIds.length
        ? this.prisma.knowledgeQuizAttempt.findMany({
            where: {
              userId,
              materialId: { in: trackableIds },
              createdAt: { gte: period.from, lte: period.to },
            },
            select: { createdAt: true, passed: true },
          })
        : Promise.resolve([]),
    ]);

    const videoByMaterial = new Map<string, TrainingAnalyticsVideoProgressRow>(
      videoProgressRows.map((row) => [`${userId}:${row.materialId}`, row]),
    );
    const quizPassedByUserMaterial = new Set<string>();
    const quizPassedAtByUserMaterial = new Map<string, Date>();
    const latestQuizAttemptByMaterial = new Map<string, (typeof quizAllAttempts)[0]>();
    for (const attempt of quizAllAttempts) {
      if (!latestQuizAttemptByMaterial.has(attempt.materialId)) {
        latestQuizAttemptByMaterial.set(attempt.materialId, attempt);
      }
    }
    for (const attempt of quizPassedAttempts) {
      const key = `${userId}:${attempt.materialId}`;
      quizPassedByUserMaterial.add(key);
      const prev = quizPassedAtByUserMaterial.get(key);
      if (!prev || attempt.createdAt < prev) {
        quizPassedAtByUserMaterial.set(key, attempt.createdAt);
      }
    }

    const isMaterialCompleted = (material: TrainingAnalyticsMaterialRow): boolean => {
      const key = `${userId}:${material.id}`;
      if (material.hasQuiz) return quizPassedByUserMaterial.has(key);
      if (material.type === KnowledgeMaterialType.VIDEO) {
        return Boolean(videoByMaterial.get(key)?.completed);
      }
      return false;
    };

    const isMaterialInProgress = (material: TrainingAnalyticsMaterialRow): boolean => {
      if (isMaterialCompleted(material)) return false;
      const key = `${userId}:${material.id}`;
      if (material.hasQuiz) {
        const latest = latestQuizAttemptByMaterial.get(material.id);
        return Boolean(latest && !latest.passed);
      }
      if (material.type === KnowledgeMaterialType.VIDEO) {
        const progress = videoByMaterial.get(key);
        return Boolean(progress && progress.progressPercent > 0);
      }
      return false;
    };

    let completedCount = 0;
    let videosCompleted = 0;
    let quizzesPassed = 0;
    let lastActivityAt: Date | null = null;

    for (const row of videoProgressRows) {
      if (!lastActivityAt || row.updatedAt > lastActivityAt) {
        lastActivityAt = row.updatedAt;
      }
    }
    for (const attempt of quizAllAttempts) {
      if (!lastActivityAt || attempt.createdAt > lastActivityAt) {
        lastActivityAt = attempt.createdAt;
      }
    }

    const categoryMeta = buildTrainingAnalyticsCategoryMetaMap(trackableMaterials);
    const categoryProgress = new Map<
      string,
      { completedCount: number; inProgressCount: number; notStartedCount: number }
    >();

    for (const category of categoryMeta.values()) {
      categoryProgress.set(category.categoryId, {
        completedCount: 0,
        inProgressCount: 0,
        notStartedCount: 0,
      });
    }

    for (const material of trackableMaterials) {
      const bucket = categoryProgress.get(material.categoryId);
      if (!bucket) continue;

      if (isMaterialCompleted(material)) {
        bucket.completedCount += 1;
        completedCount += 1;
        if (material.hasQuiz) {
          quizzesPassed += 1;
        } else if (material.type === KnowledgeMaterialType.VIDEO) {
          videosCompleted += 1;
        }
      } else if (isMaterialInProgress(material)) {
        bucket.inProgressCount += 1;
      } else {
        bucket.notStartedCount += 1;
      }
    }

    const trackableCount = trackableMaterials.length;
    const categories = sortTrainingAnalyticsCategories(
      [...categoryMeta.values()].map((category) => {
        const progress = categoryProgress.get(category.categoryId) ?? {
          completedCount: 0,
          inProgressCount: 0,
          notStartedCount: 0,
        };
        return {
          ...category,
          ...progress,
          completionPercent:
            category.trackableCount > 0
              ? roundTrainingAnalyticsPercent(
                  (progress.completedCount / category.trackableCount) * 100,
                )
              : 0,
        };
      }),
    );

    const timelineDays = eachTrainingAnalyticsDayIso(period.from, period.to);
    const personalCategoryPercentByDay = new Map<string, Map<string, number>>();
    for (const day of timelineDays) {
      const dayEnd = trainingAnalyticsEndOfDay(new Date(day));
      const percentByCategory = new Map<string, number>();
      for (const category of categoryMeta.values()) {
        let completedByDay = 0;
        for (const material of trackableMaterials) {
          if (material.categoryId !== category.categoryId) continue;
          const completedAt = resolveTrainingMaterialCompletionDate(
            userId,
            material,
            videoByMaterial,
            quizPassedByUserMaterial,
            quizPassedAtByUserMaterial,
          );
          if (completedAt && completedAt <= dayEnd) {
            completedByDay += 1;
          }
        }
        percentByCategory.set(
          category.categoryId,
          category.trackableCount > 0
            ? roundTrainingAnalyticsPercent((completedByDay / category.trackableCount) * 100)
            : 0,
        );
      }
      personalCategoryPercentByDay.set(day, percentByCategory);
    }

    const categoryTimeline = buildTrainingAnalyticsCategoryTimeline(
      timelineDays,
      categoryMeta,
      personalCategoryPercentByDay,
    );

    const activityTimeline = buildTrainingActivityTimeline(
      timelineDays,
      videoUpdatesInPeriod,
      quizAttemptsInPeriod,
    );

    return {
      period: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
      },
      summary: {
        trackableCount,
        completedCount,
        completionPercent:
          trackableCount > 0
            ? roundTrainingAnalyticsPercent((completedCount / trackableCount) * 100)
            : 0,
        videosCompleted,
        quizzesPassed,
        quizAttempts: quizAttemptsInPeriod.length,
        videoUpdates: videoUpdatesInPeriod.length,
        lastActivityAt: lastActivityAt?.toISOString() ?? null,
      },
      categories,
      categoryTimeline,
      activityTimeline,
    };
  }
}
