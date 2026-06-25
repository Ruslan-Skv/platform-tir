import { Injectable } from '@nestjs/common';
import { KnowledgeMaterialType, Prisma } from '@prisma/client';
import { ADMIN_ROLES } from '../admin-access/admin-access.service';
import { PrismaService } from '../../database/prisma.service';

const TRAINING_ANALYTICS_ROLES = ADMIN_ROLES.filter((role) => role !== 'SUPER_ADMIN');

type MaterialRow = {
  id: string;
  title: string;
  type: KnowledgeMaterialType;
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  hasQuiz: boolean;
};

type CategoryMeta = {
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  trackableCount: number;
};

type CategoryTimelineDay = {
  date: string;
  categories: Array<{ categoryId: string; completionPercent: number }>;
};

export type KnowledgeTrainingAnalyticsParams = {
  dateFrom?: string;
  dateTo?: string;
};

function parseDateInput(value: string | undefined, endOfDay: boolean): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function resolvePeriod(params: KnowledgeTrainingAnalyticsParams) {
  const to = parseDateInput(params.dateTo, true) ?? new Date();
  const from =
    parseDateInput(params.dateFrom, false) ??
    (() => {
      const d = new Date(to);
      d.setDate(d.getDate() - 29);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

  if (from > to) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { from: today, to: new Date() };
  }

  return { from, to };
}

function eachDayIso(from: Date, to: Date): string[] {
  const dates: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isTrackableMaterial(material: MaterialRow): boolean {
  return material.hasQuiz || material.type === KnowledgeMaterialType.VIDEO;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildCategoryMetaMap(materials: MaterialRow[]): Map<string, CategoryMeta> {
  const map = new Map<string, CategoryMeta>();
  for (const material of materials) {
    if (!isTrackableMaterial(material)) continue;
    const existing = map.get(material.categoryId);
    if (existing) {
      existing.trackableCount += 1;
    } else {
      map.set(material.categoryId, {
        categoryId: material.categoryId,
        categoryName: material.categoryName,
        categoryOrder: material.categoryOrder,
        trackableCount: 1,
      });
    }
  }
  return map;
}

function sortCategorySnapshots<T extends { categoryOrder: number; categoryName: string }>(
  items: T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      a.categoryOrder - b.categoryOrder || a.categoryName.localeCompare(b.categoryName, 'ru'),
  );
}

function buildCategoryTimeline(
  days: string[],
  categoryMeta: Map<string, CategoryMeta>,
  completionPercentByDay: Map<string, Map<string, number>>,
): CategoryTimelineDay[] {
  return days.map((date) => ({
    date,
    categories: sortCategorySnapshots(
      [...categoryMeta.values()].map((category) => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        categoryOrder: category.categoryOrder,
        completionPercent: completionPercentByDay.get(date)?.get(category.categoryId) ?? 0,
      })),
    ).map(({ categoryId, completionPercent }) => ({ categoryId, completionPercent })),
  }));
}

@Injectable()
export class KnowledgeTrainingAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publishedMaterialWhere: Prisma.KnowledgeMaterialWhereInput = {
    deletedAt: null,
    status: 'PUBLISHED',
    category: { deletedAt: null },
    OR: [{ moduleId: null }, { module: { deletedAt: null } }],
  };

  async getTrainingAnalytics(params: KnowledgeTrainingAnalyticsParams) {
    const period = resolvePeriod(params);
    const employeeWhere: Prisma.UserWhereInput = {
      role: { in: TRAINING_ANALYTICS_ROLES },
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
        where: this.publishedMaterialWhere,
        select: {
          id: true,
          title: true,
          type: true,
          category: { select: { id: true, name: true, order: true } },
          quiz: { select: { id: true, _count: { select: { questions: true } } } },
        },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      }),
    ]);

    const materials: MaterialRow[] = materialsRaw.map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      categoryId: m.category.id,
      categoryName: m.category.name,
      categoryOrder: m.category.order,
      hasQuiz: Boolean(m.quiz && m.quiz._count.questions > 0),
    }));

    const trackableMaterials = materials.filter(isTrackableMaterial);
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

    const isMaterialCompleted = (employeeId: string, material: MaterialRow): boolean => {
      const key = `${employeeId}:${material.id}`;
      if (material.hasQuiz) {
        return quizPassedByUserMaterial.has(key);
      }
      if (material.type === KnowledgeMaterialType.VIDEO) {
        return Boolean(videoByUserMaterial.get(key)?.completed);
      }
      return false;
    };

    const isMaterialInProgress = (employeeId: string, material: MaterialRow): boolean => {
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
          trackableCount > 0 ? roundPercent((completedCount / trackableCount) * 100) : 0,
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

    const timelineDays = eachDayIso(period.from, period.to);
    const videoUpdatesByDay = new Map<string, number>();
    const quizAttemptsByDay = new Map<string, number>();
    const quizPassesByDay = new Map<string, number>();

    for (const day of timelineDays) {
      videoUpdatesByDay.set(day, 0);
      quizAttemptsByDay.set(day, 0);
      quizPassesByDay.set(day, 0);
    }

    for (const row of videoUpdatesInPeriod) {
      const day = toDayKey(row.updatedAt);
      if (videoUpdatesByDay.has(day)) {
        videoUpdatesByDay.set(day, (videoUpdatesByDay.get(day) ?? 0) + 1);
      }
    }

    for (const row of quizAttemptsInPeriod) {
      const day = toDayKey(row.createdAt);
      if (quizAttemptsByDay.has(day)) {
        quizAttemptsByDay.set(day, (quizAttemptsByDay.get(day) ?? 0) + 1);
      }
      if (row.passed && quizPassesByDay.has(day)) {
        quizPassesByDay.set(day, (quizPassesByDay.get(day) ?? 0) + 1);
      }
    }

    const activityTimeline = timelineDays.map((date) => ({
      date,
      videoProgressUpdates: videoUpdatesByDay.get(date) ?? 0,
      quizAttempts: quizAttemptsByDay.get(date) ?? 0,
      quizPasses: quizPassesByDay.get(date) ?? 0,
    }));

    const avgCompletionPercent =
      employeeStats.length > 0
        ? roundPercent(
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
            totalEmployees > 0 ? roundPercent((completedCount / totalEmployees) * 100) : 0,
          completedCount,
          employeeCount: totalEmployees,
          avgVideoProgress: progressCount > 0 ? roundPercent(progressSum / progressCount) : null,
          quizPassRate:
            material.hasQuiz && totalEmployees > 0
              ? roundPercent((quizPassCount / totalEmployees) * 100)
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
          (m) => m.type === KnowledgeMaterialType.VIDEO && isTrackableMaterial(m),
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

    const categoryMeta = buildCategoryMetaMap(trackableMaterials);
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

    const categories = sortCategorySnapshots(
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
            employees.length > 0 ? roundPercent(completionSum / employees.length) : 0,
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
      const dayEnd = endOfDay(new Date(day));
      const percentByCategory = new Map<string, number>();
      for (const category of categoryMeta.values()) {
        let completionSum = 0;
        for (const employee of employees) {
          let completedByDay = 0;
          for (const material of trackableMaterials) {
            if (material.categoryId !== category.categoryId) continue;
            const completedAt = this.resolveMaterialCompletionDate(
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
          employees.length > 0 ? roundPercent(completionSum / employees.length) : 0,
        );
      }
      companyCategoryPercentByDay.set(day, percentByCategory);
    }

    const categoryTimeline = buildCategoryTimeline(
      timelineDays,
      categoryMeta,
      companyCategoryPercentByDay,
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
        completedPercent: statusTotal > 0 ? roundPercent((statusCompleted / statusTotal) * 100) : 0,
        inProgressPercent:
          statusTotal > 0 ? roundPercent((statusInProgress / statusTotal) * 100) : 0,
        notStartedPercent:
          statusTotal > 0 ? roundPercent((statusNotStarted / statusTotal) * 100) : 0,
      },
      activityTimeline,
      employees: employeeStats.sort(
        (a, b) => b.completionPercent - a.completionPercent || a.email.localeCompare(b.email, 'ru'),
      ),
      topMaterials: topMaterials.slice(0, 15),
      materialsByType,
      categories,
      categoryTimeline,
    };
  }

  private resolveMaterialCompletionDate(
    employeeId: string,
    material: MaterialRow,
    videoByUserMaterial: Map<string, { updatedAt: Date; completed: boolean }>,
    quizPassedByUserMaterial: Set<string>,
    quizPassedAtByUserMaterial?: Map<string, Date>,
  ): Date | null {
    const key = `${employeeId}:${material.id}`;
    if (material.hasQuiz) {
      if (!quizPassedByUserMaterial.has(key)) return null;
      return quizPassedAtByUserMaterial?.get(key) ?? null;
    }
    if (material.type === KnowledgeMaterialType.VIDEO) {
      const progress = videoByUserMaterial.get(key);
      if (!progress?.completed) return null;
      return progress.updatedAt;
    }
    return null;
  }

  async getMyTrainingProgress(userId: string, params: KnowledgeTrainingAnalyticsParams) {
    const period = resolvePeriod(params);

    const materialsRaw = await this.prisma.knowledgeMaterial.findMany({
      where: this.publishedMaterialWhere,
      select: {
        id: true,
        title: true,
        type: true,
        category: { select: { id: true, name: true, order: true } },
        quiz: { select: { id: true, _count: { select: { questions: true } } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });

    const materials: MaterialRow[] = materialsRaw.map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      categoryId: m.category.id,
      categoryName: m.category.name,
      categoryOrder: m.category.order,
      hasQuiz: Boolean(m.quiz && m.quiz._count.questions > 0),
    }));

    const trackableMaterials = materials.filter(isTrackableMaterial);
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
      this.prisma.knowledgeVideoProgress.findMany({
        where: {
          userId,
          updatedAt: { gte: period.from, lte: period.to },
        },
        select: { updatedAt: true },
      }),
      this.prisma.knowledgeQuizAttempt.findMany({
        where: {
          userId,
          createdAt: { gte: period.from, lte: period.to },
        },
        select: { createdAt: true, passed: true },
      }),
    ]);

    const videoByMaterial = new Map(
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

    const isMaterialCompleted = (material: MaterialRow): boolean => {
      const key = `${userId}:${material.id}`;
      if (material.hasQuiz) return quizPassedByUserMaterial.has(key);
      if (material.type === KnowledgeMaterialType.VIDEO) {
        return Boolean(videoByMaterial.get(key)?.completed);
      }
      return false;
    };

    const isMaterialInProgress = (material: MaterialRow): boolean => {
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

    const categoryMeta = buildCategoryMetaMap(trackableMaterials);
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
    const categories = sortCategorySnapshots(
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
              ? roundPercent((progress.completedCount / category.trackableCount) * 100)
              : 0,
        };
      }),
    );

    const timelineDays = eachDayIso(period.from, period.to);
    const personalCategoryPercentByDay = new Map<string, Map<string, number>>();
    for (const day of timelineDays) {
      const dayEnd = endOfDay(new Date(day));
      const percentByCategory = new Map<string, number>();
      for (const category of categoryMeta.values()) {
        let completedByDay = 0;
        for (const material of trackableMaterials) {
          if (material.categoryId !== category.categoryId) continue;
          const completedAt = this.resolveMaterialCompletionDate(
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
            ? roundPercent((completedByDay / category.trackableCount) * 100)
            : 0,
        );
      }
      personalCategoryPercentByDay.set(day, percentByCategory);
    }

    const categoryTimeline = buildCategoryTimeline(
      timelineDays,
      categoryMeta,
      personalCategoryPercentByDay,
    );

    const videoUpdatesByDay = new Map<string, number>();
    const quizAttemptsByDay = new Map<string, number>();
    const quizPassesByDay = new Map<string, number>();
    for (const day of timelineDays) {
      videoUpdatesByDay.set(day, 0);
      quizAttemptsByDay.set(day, 0);
      quizPassesByDay.set(day, 0);
    }
    for (const row of videoUpdatesInPeriod) {
      const day = toDayKey(row.updatedAt);
      if (videoUpdatesByDay.has(day)) {
        videoUpdatesByDay.set(day, (videoUpdatesByDay.get(day) ?? 0) + 1);
      }
    }
    for (const row of quizAttemptsInPeriod) {
      const day = toDayKey(row.createdAt);
      if (quizAttemptsByDay.has(day)) {
        quizAttemptsByDay.set(day, (quizAttemptsByDay.get(day) ?? 0) + 1);
      }
      if (row.passed && quizPassesByDay.has(day)) {
        quizPassesByDay.set(day, (quizPassesByDay.get(day) ?? 0) + 1);
      }
    }

    const activityTimeline = timelineDays.map((date) => ({
      date,
      videoProgressUpdates: videoUpdatesByDay.get(date) ?? 0,
      quizAttempts: quizAttemptsByDay.get(date) ?? 0,
      quizPasses: quizPassesByDay.get(date) ?? 0,
    }));

    return {
      period: {
        from: period.from.toISOString(),
        to: period.to.toISOString(),
      },
      summary: {
        trackableCount,
        completedCount,
        completionPercent:
          trackableCount > 0 ? roundPercent((completedCount / trackableCount) * 100) : 0,
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
