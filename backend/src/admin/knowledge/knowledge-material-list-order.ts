import { PageStatus } from '@prisma/client';

export type KnowledgeMaterialListSortRow = {
  id: string;
  status: PageStatus;
  sortOrder: number;
  isPinned: boolean;
  createdAt: Date;
  publishedAt: Date | null;
  module: { order: number } | null;
};

function statusRank(status: PageStatus): number {
  switch (status) {
    case PageStatus.PUBLISHED:
      return 0;
    case PageStatus.DRAFT:
      return 1;
    case PageStatus.ARCHIVED:
      return 2;
    default:
      return 3;
  }
}

/** Порядок внутри категории/модуля: опубликованные → черновики, затем sortOrder по возрастанию. */
export function compareKnowledgeMaterialsForCategoryList(
  a: KnowledgeMaterialListSortRow,
  b: KnowledgeMaterialListSortRow,
): number {
  const statusDiff = statusRank(a.status) - statusRank(b.status);
  if (statusDiff !== 0) return statusDiff;

  if (a.isPinned !== b.isPinned) {
    return a.isPinned ? -1 : 1;
  }

  const moduleOrderA = a.module?.order ?? Number.MAX_SAFE_INTEGER;
  const moduleOrderB = b.module?.order ?? Number.MAX_SAFE_INTEGER;
  if (moduleOrderA !== moduleOrderB) {
    return moduleOrderA - moduleOrderB;
  }

  if (a.sortOrder !== b.sortOrder) {
    return a.sortOrder - b.sortOrder;
  }

  return a.createdAt.getTime() - b.createdAt.getTime();
}

/** Общий список «Все материалы»: сначала новые. */
export function compareKnowledgeMaterialsForAllList(
  a: KnowledgeMaterialListSortRow,
  b: KnowledgeMaterialListSortRow,
): number {
  if (a.isPinned !== b.isPinned) {
    return a.isPinned ? -1 : 1;
  }

  const publishedA = a.publishedAt?.getTime() ?? a.createdAt.getTime();
  const publishedB = b.publishedAt?.getTime() ?? b.createdAt.getTime();
  if (publishedA !== publishedB) {
    return publishedB - publishedA;
  }

  return b.createdAt.getTime() - a.createdAt.getTime();
}

export function sortKnowledgeMaterialIdsForList(
  rows: KnowledgeMaterialListSortRow[],
  mode: 'category' | 'all',
): string[] {
  const compare =
    mode === 'category'
      ? compareKnowledgeMaterialsForCategoryList
      : compareKnowledgeMaterialsForAllList;
  return [...rows].sort(compare).map((row) => row.id);
}
