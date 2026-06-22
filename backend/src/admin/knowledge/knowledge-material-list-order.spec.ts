import { PageStatus } from '@prisma/client';

import { sortKnowledgeMaterialIdsForList } from './knowledge-material-list-order';

const d = (iso: string) => new Date(iso);

function row(
  id: string,
  overrides: Partial<{
    status: PageStatus;
    sortOrder: number;
    isPinned: boolean;
    createdAt: Date;
    publishedAt: Date | null;
    moduleOrder: number | null;
  }> = {},
) {
  return {
    id,
    status: overrides.status ?? PageStatus.PUBLISHED,
    sortOrder: overrides.sortOrder ?? 1,
    isPinned: overrides.isPinned ?? false,
    createdAt: overrides.createdAt ?? d('2026-01-01'),
    publishedAt: overrides.publishedAt ?? d('2026-06-01'),
    module: overrides.moduleOrder == null ? null : { order: overrides.moduleOrder },
  };
}

describe('compareKnowledgeMaterialsForCategoryList', () => {
  it('sorts by sortOrder ascending within published materials', () => {
    const items = [
      row('c', { sortOrder: 3 }),
      row('a', { sortOrder: 1 }),
      row('b', { sortOrder: 2 }),
    ];
    expect(sortKnowledgeMaterialIdsForList(items, 'category')).toEqual(['a', 'b', 'c']);
  });

  it('places drafts after published regardless of sortOrder', () => {
    const items = [
      row('draft', { status: PageStatus.DRAFT, sortOrder: 1, publishedAt: null }),
      row('pub', { sortOrder: 5 }),
    ];
    expect(sortKnowledgeMaterialIdsForList(items, 'category')).toEqual(['pub', 'draft']);
  });
});

describe('compareKnowledgeMaterialsForAllList', () => {
  it('sorts by newest publishedAt first', () => {
    const items = [
      row('old', { publishedAt: d('2026-01-01') }),
      row('new', { publishedAt: d('2026-06-01') }),
    ];
    expect(sortKnowledgeMaterialIdsForList(items, 'all')).toEqual(['new', 'old']);
  });

  it('uses createdAt when publishedAt is missing (e.g. some videos)', () => {
    const items = [
      row('article', { publishedAt: d('2026-03-01'), createdAt: d('2026-03-01') }),
      row('video', { publishedAt: null, createdAt: d('2026-06-15') }),
    ];
    expect(sortKnowledgeMaterialIdsForList(items, 'all')).toEqual(['video', 'article']);
  });
});
