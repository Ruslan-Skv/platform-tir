import { Injectable } from '@nestjs/common';
import { KnowledgeMaterialType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  type KnowledgeTrainingAnalyticsParams,
  PUBLISHED_KNOWLEDGE_MATERIAL_WHERE,
  TRAINING_ANALYTICS_MATERIAL_SELECT,
  TRAINING_ANALYTICS_ROLES,
  DASHBOARD_TRAINING_ANALYTICS_ROLES,
  buildTrainingActivityTimeline,
  buildTrainingAnalyticsCategoryMetaMap,
  buildTrainingAnalyticsCategoryTimeline,
  buildTrainingOverallCompletionTimeline,
  eachTrainingAnalyticsDayIso,
  isTrainingAnalyticsTrackableMaterial,
  mapTrainingAnalyticsMaterials,
  resolveTrainingAnalyticsPeriod,
  resolveTrainingMaterialCompletionDate,
  roundTrainingAnalyticsPercent,
  sortTrainingAnalyticsCategories,
  trainingAnalyticsEndOfDay,
  type TrainingAnalyticsMaterialRow,
} from './services/knowledge-training-analytics.util';

export type { KnowledgeTrainingAnalyticsParams } from './services/knowledge-training-analytics.util';

@Injectable()
export class KnowledgeTrainingAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTrainingAnalytics(
    params: KnowledgeTrainingAnalyticsParams,
    options?: { employeeRoles?: typeof TRAINING_ANALYTICS_ROLES },
  ) {
    const period = resolveTrainingAnalyticsPeriod(params);
    const employeeRoles = options?.employeeRoles ?? TRAINING_ANALYTICS_ROLES;
    const employeeWhere: Prisma.UserWhereInput = {
      role: { in: employeeRoles },
      isActive: true,
    };

    const [employees, materialsRaw] = await Promise.all([
      this.prisma.user.findMany({
        where: employeeWhere,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }, { email: 'asc' }],
      }),
      this.prisma.knowledgeMaterial.findMany({
        where: PUBLISHED_KNOWLEDGE_MATERIAL_WHERE,
        select: TRAINING_ANALYTICS_MATERIAL_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      }),
    ]);

    const materials = mapTrainingAnalyticsMaterials(materialsRaw);
    const trackableMaterials = materials.filter(isTrainingAnalyticsTrackableMaterial);
    const trackableIds = trackableMaterials.map((m) => m.id);
    const quizIds = trackableMaterials.filter((m) => m.hasQuiz).map((m) => m.id);

    const employeeIds = employees.map((e) => e.id);
    const totalEmployees = employees.length;
    const trackableCount = trackableMaterials.length;

    const [videoProgressRows, quizAttempts, videoUpdatesInPeriod, quizAttemptsInPeriod] =
      await Promise.all([
        trackableIds.length
          ? this.prisma.knowledgeVideoProgress.findMany({
              where: {
                userId: { in: employeeIds },
                materialId: { in: trackableIds },
              },
              select: {
                userId: true,
                materialId: true,
                progressPercent: true,
                completed: true,
                updatedAt: true,
              },
            })
          : Promise.resolve([]),
        quizIds.length
          ? this.prisma.knowledgeQuizAttempt.findMany({
              where: {
                userId: { in: employeeIds },
                materialId: { in: quizIds },
              },
              select: {
                userId: true,
                materialId: true,
                passed: true,
                scorePercent: true,
                createdAt: true,
              },
            })
          : Promise.resolve([]),
        this.prisma.knowledgeVideoProgress.findMany({
          where: {
            userId: { in: employeeIds },
            updatedAt: { gte: period.from, lte: period.to },
          },
          select: { userId: true, updatedAt: true },
        }),
        this.prisma.knowledgeQuizAttempt.findMany({
          where: {
            userId: { in: employeeIds },
            createdAt: { gte: period.from, lte: period.to },
          },
          select: { userId: true, createdAt: true, passed: true },
        }),
      ]);

    const videoByUserMaterial = new Map<string, (typeof videoProgressRows)[0]>();
    const lastVideoActivityByUser = new Map<string, Date>();
    for (const row of videoProgressRows) {
      const key = `${row.userId}:${row.materialId}`;
      videoByUserMaterial.set(key, row);
      const prev = lastVideoActivityByUser.get(row.userId);
      if (!prev || row.updatedAt > prev) {
        lastVideoActivityByUser.set(row.userId, row.updatedAt);
      }
    }

    const quizPassedByUserMaterial = new Set<string>();
    const quizAttemptedByUserMaterial = new Set<string>();
    const quizPassedAtByUserMaterial = new Map<string, Date>();
    const lastQuizActivityByUser = new Map<string, Date>();

    for (const attempt of quizAttempts) {
      const key = `${attempt.userId}:${attempt.materialId}`;
      quizAttemptedByUserMaterial.add(key);
      if (attempt.passed) {
        quizPassedByUserMaterial.add(key);
        const prev = quizPassedAtByUserMaterial.get(key);
        if (!prev || attempt.createdAt < prev) {
          quizPassedAtByUserMaterial.set(key, attempt.createdAt);
        }
      }
      const prev = lastQuizActivityByUser.get(attempt.userId);
      if (!prev || attempt.createdAt > prev) {
        lastQuizActivityByUser.set(attempt.userId, attempt.createdAt);
      }
    }

    const isMaterialCompleted = (
      employeeId: string,
      material: TrainingAnalyticsMaterialRow,
    ): boolean => {
      const key = `${employeeId}:${material.id}`;
      if (material.hasQuiz) {
        return quizPassedByUserMaterial.has(key);
      }
      if (material.type === KnowledgeMaterialType.VIDEO) {
        return Boolean(videoByUserMaterial.get(key)?.completed);
      }
      return false;
    };

    const isMaterialInProgress = (
      employeeId: string,
      material: TrainingAnalyticsMaterialRow,
    ): boolean => {
      if (isMaterialCompleted(employeeId, material)) return false;
      const key = `${employeeId}:${material.id}`;
      if (material.hasQuiz) {
        return quizAttemptedByUserMaterial.has(key);
      }
      if (material.type === KnowledgeMaterialType.VIDEO) {
        const progress = videoByUserMaterial.get(key);
        return Boolean(progress && progress.progressPercent > 0);
      }
      return false;
    };

    let statusCompleted = 0;
    let statusInProgress = 0;
    let statusNotStarted = 0;
    let totalVideosCompleted = 0;
    let totalQuizzesPassed = 0;

    const activeEmployeeIds = new Set<string>();
    for (const row of videoUpdatesInPeriod) {
      activeEmployeeIds.add(row.userId);
    }
    for (const row of quizAttemptsInPeriod) {
      activeEmployeeIds.add(row.userId);
    }

    const employeeStats = employees.map((employee) => {
      let completedCount = 0;
      let videosCompleted = 0;
      let quizzesPassed = 0;

      for (const material of trackableMaterials) {
        if (isMaterialCompleted(employee.id, material)) {
          completedCount += 1;
          if (material.hasQuiz) {
            quizzesPassed += 1;
          } else if (material.type === KnowledgeMaterialType.VIDEO) {
            videosCompleted += 1;
          }
        }
      }

      const lastVideoAt = lastVideoActivityByUser.get(employee.id);
      const lastQuizAt = lastQuizActivityByUser.get(employee.id);
      const lastActivityAt =
        lastVideoAt && lastQuizAt
          ? lastVideoAt > lastQuizAt
            ? lastVideoAt
            : lastQuizAt
          : (lastVideoAt ?? lastQuizAt ?? null);

      totalVideosCompleted += videosCompleted;
      totalQuizzesPassed += quizzesPassed;

      return {
        userId: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        role: employee.role,
        completedCount,
        trackableCount,
        completionPercent:
          trackableCount > 0
            ? roundTrainingAnalyticsPercent((completedCount / trackableCount) * 100)
            : 0,
        videosCompleted,
        quizzesPassed,
        lastActivityAt: lastActivityAt?.toISOString() ?? null,
      };
    });

    for (const employee of employees) {
      for (const material of trackableMaterials) {
        if (isMaterialCompleted(employee.id, material)) {
          statusCompleted += 1;
        } else if (isMaterialInProgress(employee.id, material)) {
          statusInProgress += 1;
        } else {
          statusNotStarted += 1;
        }
      }
    }

    const timelineDays = eachTrainingAnalyticsDayIso(period.from, period.to);
    const activityTimeline = buildTrainingActivityTimeline(
      timelineDays,
      videoUpdatesInPeriod,
      quizAttemptsInPeriod,
    );

    const avgCompletionPercent =
      employeeStats.length > 0
        ? roundTrainingAnalyticsPercent(
            employeeStats.reduce((sum, row) => sum + row.completionPercent, 0) /
              employeeStats.length,
          )
        : 0;

    const topMaterials = trackableMaterials
      .map((material) => {
        let completedCount = 0;
        let progressSum = 0;
        let progressCount = 0;
        let quizPassCount = 0;

        for (const employee of employees) {
          const key = `${employee.id}:${material.id}`;
          if (isMaterialCompleted(employee.id, material)) {
            completedCount += 1;
          }

          if (material.type === KnowledgeMaterialType.VIDEO && !material.hasQuiz) {
            const progress = videoByUserMaterial.get(key);
            if (progress) {
              progressSum += progress.progressPercent;
              progressCount += 1;
            }
          }

          if (material.hasQuiz && quizPassedByUserMaterial.has(key)) {
            quizPassCount += 1;
          }
        }

        return {
          materialId: material.id,
          title: material.title,
          type: material.type,
          categoryName: material.categoryName,
          hasQuiz: material.hasQuiz,
          completionPercent:
            totalEmployees > 0
              ? roundTrainingAnalyticsPercent((completedCount / totalEmployees) * 100)
              : 0,
          completedCount,
          employeeCount: totalEmployees,
          avgVideoProgress:
            progressCount > 0 ? roundTrainingAnalyticsPercent(progressSum / progressCount) : null,
          quizPassRate:
            material.hasQuiz && totalEmployees > 0
              ? roundTrainingAnalyticsPercent((quizPassCount / totalEmployees) * 100)
              : null,
        };
      })
      .sort(
        (a, b) => b.completionPercent - a.completionPercent || a.title.localeCompare(b.title, 'ru'),
      );

    const materialsByType = {
      VIDEO: {
        total: materials.filter((m) => m.type === KnowledgeMaterialType.VIDEO).length,
        trackable: materials.filter(
          (m) => m.type === KnowledgeMaterialType.VIDEO && isTrainingAnalyticsTrackableMaterial(m),
        ).length,
      },
      ARTICLE: {
        total: materials.filter((m) => m.type === KnowledgeMaterialType.ARTICLE).length,
        withQuiz: materials.filter((m) => m.type === KnowledgeMaterialType.ARTICLE && m.hasQuiz)
          .length,
      },
      LINK: {
        total: materials.filter((m) => m.type === KnowledgeMaterialType.LINK).length,
        withQuiz: materials.filter((m) => m.type === KnowledgeMaterialType.LINK && m.hasQuiz)
          .length,
      },
    };

    const statusTotal = statusCompleted + statusInProgress + statusNotStarted;

    const categoryMeta = buildTrainingAnalyticsCategoryMetaMap(trackableMaterials);
    const categoryCompletionByEmployee = new Map<string, Map<string, number>>();
    for (const employee of employees) {
      const byCategory = new Map<string, number>();
      for (const material of trackableMaterials) {
        if (isMaterialCompleted(employee.id, material)) {
          byCategory.set(material.categoryId, (byCategory.get(material.categoryId) ?? 0) + 1);
        }
      }
      categoryCompletionByEmployee.set(employee.id, byCategory);
    }

    const categories = sortTrainingAnalyticsCategories(
      [...categoryMeta.values()].map((category) => {
        let completionSum = 0;
        for (const employee of employees) {
          const completedInCategory =
            categoryCompletionByEmployee.get(employee.id)?.get(category.categoryId) ?? 0;
          completionSum +=
            category.trackableCount > 0 ? (completedInCategory / category.trackableCount) * 100 : 0;
        }
        return {
          ...category,
          completedCount: 0,
          completionPercent:
            employees.length > 0
              ? roundTrainingAnalyticsPercent(completionSum / employees.length)
              : 0,
          employeeCount: employees.length,
        };
      }),
    ).map(({ employeeCount, ...category }) => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      categoryOrder: category.categoryOrder,
      trackableCount: category.trackableCount,
      avgCompletionPercent: category.completionPercent,
      employeeCount,
    }));

    const companyCategoryPercentByDay = new Map<string, Map<string, number>>();
    for (const day of timelineDays) {
      const dayEnd = trainingAnalyticsEndOfDay(new Date(day));
      const percentByCategory = new Map<string, number>();
      for (const category of categoryMeta.values()) {
        let completionSum = 0;
        for (const employee of employees) {
          let completedByDay = 0;
          for (const material of trackableMaterials) {
            if (material.categoryId !== category.categoryId) continue;
            const completedAt = resolveTrainingMaterialCompletionDate(
              employee.id,
              material,
              videoByUserMaterial,
              quizPassedByUserMaterial,
              quizPassedAtByUserMaterial,
            );
            if (completedAt && completedAt <= dayEnd) {
              completedByDay += 1;
            }
          }
          completionSum +=
            category.trackableCount > 0 ? (completedByDay / category.trackableCount) * 100 : 0;
        }
        percentByCategory.set(
          category.categoryId,
          employees.length > 0
            ? roundTrainingAnalyticsPercent(completionSum / employees.length)
            : 0,
        );
      }
      companyCategoryPercentByDay.set(day, percentByCategory);
    }

    const categoryTimeline = buildTrainingAnalyticsCategoryTimeline(
      timelineDays,
      categoryMeta,
      companyCategoryPercentByDay,
    );

    const overallTimeline = buildTrainingOverallCompletionTimeline(
      timelineDays,
      employees,
      trackableMaterials,
      videoByUserMaterial,
      quizPassedByUserMaterial,
      quizPassedAtByUserMaterial,
    );

    return {
      period: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
      },
      summary: {
        totalEmployees,
        activeEmployees: activeEmployeeIds.size,
        publishedMaterials: materials.length,
        trackableMaterials: trackableCount,
        avgCompletionPercent,
        videosCompleted: totalVideosCompleted,
        quizzesPassed: totalQuizzesPassed,
        quizAttempts: quizAttemptsInPeriod.length,
        videoUpdates: videoUpdatesInPeriod.length,
      },
      statusDistribution: {
        completed: statusCompleted,
        inProgress: statusInProgress,
        notStarted: statusNotStarted,
        completedPercent:
          statusTotal > 0
            ? roundTrainingAnalyticsPercent((statusCompleted / statusTotal) * 100)
            : 0,
        inProgressPercent:
          statusTotal > 0
            ? roundTrainingAnalyticsPercent((statusInProgress / statusTotal) * 100)
            : 0,
        notStartedPercent:
          statusTotal > 0
            ? roundTrainingAnalyticsPercent((statusNotStarted / statusTotal) * 100)
            : 0,
      },
      activityTimeline,
      employees: employeeStats.sort(
        (a, b) => b.completionPercent - a.completionPercent || a.email.localeCompare(b.email, 'ru'),
      ),
      topMaterials: topMaterials.slice(0, 15),
      materialsByType,
      categories,
      categoryTimeline,
      overallTimeline,
    };
  }

  async getDashboardTrainingDynamics(params: KnowledgeTrainingAnalyticsParams) {
    const data = await this.getTrainingAnalytics(params, {
      employeeRoles: DASHBOARD_TRAINING_ANALYTICS_ROLES,
    });

    return {
      period: data.period,
      summary: {
        avgCompletionPercent: data.summary.avgCompletionPercent,
        totalEmployees: data.summary.totalEmployees,
        trackableMaterials: data.summary.trackableMaterials,
      },
      timeline: data.overallTimeline,
      employees: data.employees.map((employee) => ({
        userId: employee.userId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        completedCount: employee.completedCount,
        trackableCount: employee.trackableCount,
        completionPercent: employee.completionPercent,
      })),
    };
  }
}
