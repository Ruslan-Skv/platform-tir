import { describe, expect, it } from '@jest/globals';

import {
  compareKnowledgeMaterialsForAdminList,
  compareKnowledgeMaterialsForCategoryList,
  sortKnowledgeMaterialGroupsDraftsLast,
  sortKnowledgeMaterialsForCategory,
  sortKnowledgeMaterialsNewestFirst,
} from './knowledge-utils';

describe('sortKnowledgeMaterialsForCategory', () => {
  it('sorts by sortOrder ascending within published materials', () => {
    const items = [
      { id: '3', status: 'PUBLISHED', sortOrder: 3 },
      { id: '1', status: 'PUBLISHED', sortOrder: 1 },
      { id: '2', status: 'PUBLISHED', sortOrder: 2 },
    ];

    expect(sortKnowledgeMaterialsForCategory(items).map((m) => m.id)).toEqual(['1', '2', '3']);
  });

  it('moves drafts after published while preserving sortOrder within status', () => {
    const items = [
      { id: '1', status: 'DRAFT', sortOrder: 1 },
      { id: '2', status: 'PUBLISHED', sortOrder: 2 },
      { id: '3', status: 'DRAFT', sortOrder: 3 },
      { id: '4', status: 'PUBLISHED', sortOrder: 1 },
    ];

    expect(sortKnowledgeMaterialsForCategory(items).map((m) => m.id)).toEqual(['4', '2', '1', '3']);
  });

  it('keeps pinned published before unpublished published', () => {
    const items = [
      { id: '1', status: 'DRAFT', sortOrder: 1 },
      { id: '2', status: 'PUBLISHED', sortOrder: 2, isPinned: false },
      { id: '3', status: 'PUBLISHED', sortOrder: 1, isPinned: true },
    ];

    expect(sortKnowledgeMaterialsForCategory(items).map((m) => m.id)).toEqual(['3', '2', '1']);
  });
});

describe('sortKnowledgeMaterialsNewestFirst', () => {
  it('sorts by newest publishedAt first', () => {
    const items = [
      { id: 'old', publishedAt: '2026-01-01', createdAt: '2026-01-01' },
      { id: 'new', publishedAt: '2026-06-01', createdAt: '2026-06-01' },
    ];

    expect(sortKnowledgeMaterialsNewestFirst(items).map((m) => m.id)).toEqual(['new', 'old']);
  });

  it('uses createdAt when publishedAt is missing', () => {
    const items = [
      { id: 'article', publishedAt: '2026-03-01', createdAt: '2026-03-01' },
      { id: 'video', publishedAt: null, createdAt: '2026-06-15' },
    ];

    expect(sortKnowledgeMaterialsNewestFirst(items).map((m) => m.id)).toEqual(['video', 'article']);
  });
});

describe('compareKnowledgeMaterialsForAdminList', () => {
  it('ranks published above pinned drafts', () => {
    expect(
      compareKnowledgeMaterialsForCategoryList(
        { status: 'PUBLISHED', isPinned: false },
        { status: 'DRAFT', isPinned: true }
      )
    ).toBeLessThan(0);

    expect(
      compareKnowledgeMaterialsForAdminList(
        { status: 'PUBLISHED', isPinned: false },
        { status: 'DRAFT', isPinned: true }
      )
    ).toBeLessThan(0);
  });
});

describe('sortKnowledgeMaterialGroupsDraftsLast', () => {
  it('moves draft-only module groups after groups with published materials', () => {
    const groups = [
      { key: 'm1', items: [{ status: 'DRAFT' }] },
      { key: 'm2', items: [{ status: 'PUBLISHED' }] },
    ];

    expect(sortKnowledgeMaterialGroupsDraftsLast(groups).map((g) => g.key)).toEqual(['m2', 'm1']);
  });
});
