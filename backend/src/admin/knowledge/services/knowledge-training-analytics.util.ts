import { KnowledgeMaterialType, Prisma } from '@prisma/client';
import { ADMIN_ROLES } from '../../admin-access/admin-access.service';

export const TRAINING_ANALYTICS_ROLES = ADMIN_ROLES.filter((role) => role !== 'SUPER_ADMIN');

export type TrainingAnalyticsMaterialRow = {
  id: string;
  title: string;
  type: KnowledgeMaterialType;
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  hasQuiz: boolean;
};

export type TrainingAnalyticsCategoryMeta = {
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  trackableCount: number;
};

export type TrainingAnalyticsCategoryTimelineDay = {
  date: string;
  categories: Array<{ categoryId: string; completionPercent: number }>;
};

export type KnowledgeTrainingAnalyticsParams = {
  dateFrom?: string;
  dateTo?: string;
};

export type TrainingAnalyticsVideoProgressRow = {
  materialId: string;
  progressPercent: number;
  completed: boolean;
  updatedAt: Date;
};

export const PUBLISHED_KNOWLEDGE_MATERIAL_WHERE: Prisma.KnowledgeMaterialWhereInput = {
  deletedAt: null,
  status: 'PUBLISHED',
  category: { deletedAt: null },
  OR: [{ moduleId: null }, { module: { deletedAt: null } }],
};

type MaterialRawRow = {
  id: string;
  title: string;
  type: KnowledgeMaterialType;
  category: { id: string; name: string; order: number };
  quiz: { id: string; _count: { questions: number } } | null;
};

export function mapTrainingAnalyticsMaterials(
  materialsRaw: MaterialRawRow[],
): TrainingAnalyticsMaterialRow[] {
  return materialsRaw.map((m) => ({
    id: m.id,
    title: m.title,
    type: m.type,
    categoryId: m.category.id,
    categoryName: m.category.name,
    categoryOrder: m.category.order,
    hasQuiz: Boolean(m.quiz && m.quiz._count.questions > 0),
  }));
}

export const TRAINING_ANALYTICS_MATERIAL_SELECT = {
  id: true,
  title: true,
  type: true,
  category: { select: { id: true, name: true, order: true } },
  quiz: { select: { id: true, _count: { select: { questions: true } } } },
} as const;

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

export function resolveTrainingAnalyticsPeriod(params: KnowledgeTrainingAnalyticsParams) {
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

export function eachTrainingAnalyticsDayIso(from: Date, to: Date): string[] {
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

export function toTrainingAnalyticsDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isTrainingAnalyticsTrackableMaterial(
  material: TrainingAnalyticsMaterialRow,
): boolean {
  return material.hasQuiz || material.type === KnowledgeMaterialType.VIDEO;
}

export function roundTrainingAnalyticsPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

export function trainingAnalyticsEndOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function buildTrainingAnalyticsCategoryMetaMap(
  materials: TrainingAnalyticsMaterialRow[],
): Map<string, TrainingAnalyticsCategoryMeta> {
  const map = new Map<string, TrainingAnalyticsCategoryMeta>();
  for (const material of materials) {
    if (!isTrainingAnalyticsTrackableMaterial(material)) continue;
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

export function sortTrainingAnalyticsCategories<
  T extends { categoryOrder: number; categoryName: string },
>(items: T[]): T[] {
  return [...items].sort(
    (a, b) =>
      a.categoryOrder - b.categoryOrder || a.categoryName.localeCompare(b.categoryName, 'ru'),
  );
}

export function buildTrainingAnalyticsCategoryTimeline(
  days: string[],
  categoryMeta: Map<string, TrainingAnalyticsCategoryMeta>,
  completionPercentByDay: Map<string, Map<string, number>>,
): TrainingAnalyticsCategoryTimelineDay[] {
  return days.map((date) => ({
    date,
    categories: sortTrainingAnalyticsCategories(
      [...categoryMeta.values()].map((category) => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        categoryOrder: category.categoryOrder,
        completionPercent: completionPercentByDay.get(date)?.get(category.categoryId) ?? 0,
      })),
    ).map(({ categoryId, completionPercent }) => ({ categoryId, completionPercent })),
  }));
}

export function resolveTrainingMaterialCompletionDate(
  employeeId: string,
  material: TrainingAnalyticsMaterialRow,
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

export function buildTrainingActivityTimeline(
  timelineDays: string[],
  videoUpdatesInPeriod: Array<{ updatedAt: Date }>,
  quizAttemptsInPeriod: Array<{ createdAt: Date; passed: boolean }>,
) {
  const videoUpdatesByDay = new Map<string, number>();
  const quizAttemptsByDay = new Map<string, number>();
  const quizPassesByDay = new Map<string, number>();

  for (const day of timelineDays) {
    videoUpdatesByDay.set(day, 0);
    quizAttemptsByDay.set(day, 0);
    quizPassesByDay.set(day, 0);
  }

  for (const row of videoUpdatesInPeriod) {
    const day = toTrainingAnalyticsDayKey(row.updatedAt);
    if (videoUpdatesByDay.has(day)) {
      videoUpdatesByDay.set(day, (videoUpdatesByDay.get(day) ?? 0) + 1);
    }
  }

  for (const row of quizAttemptsInPeriod) {
    const day = toTrainingAnalyticsDayKey(row.createdAt);
    if (quizAttemptsByDay.has(day)) {
      quizAttemptsByDay.set(day, (quizAttemptsByDay.get(day) ?? 0) + 1);
    }
    if (row.passed && quizPassesByDay.has(day)) {
      quizPassesByDay.set(day, (quizPassesByDay.get(day) ?? 0) + 1);
    }
  }

  return timelineDays.map((date) => ({
    date,
    videoProgressUpdates: videoUpdatesByDay.get(date) ?? 0,
    quizAttempts: quizAttemptsByDay.get(date) ?? 0,
    quizPasses: quizPassesByDay.get(date) ?? 0,
  }));
}
