import { describe, expect, it } from '@jest/globals';

import {
  compareKnowledgeMaterialsForAdminList,
  sortKnowledgeMaterialGroupsDraftsLast,
  sortKnowledgeMaterialsDraftsLast,
} from './knowledge-utils';

describe('sortKnowledgeMaterialsDraftsLast', () => {
  it('moves drafts after published while preserving sortOrder within status', () => {
    const items = [
      { id: '1', status: 'DRAFT', sortOrder: 1 },
      { id: '2', status: 'PUBLISHED', sortOrder: 2 },
      { id: '3', status: 'DRAFT', sortOrder: 3 },
      { id: '4', status: 'PUBLISHED', sortOrder: 1 },
    ];

    expect(sortKnowledgeMaterialsDraftsLast(items).map((m) => m.id)).toEqual(['4', '2', '1', '3']);
  });

  it('keeps pinned published before unpublished published', () => {
    const items = [
      { id: '1', status: 'DRAFT', sortOrder: 1 },
      { id: '2', status: 'PUBLISHED', sortOrder: 2, isPinned: false },
      { id: '3', status: 'PUBLISHED', sortOrder: 1, isPinned: true },
    ];

    expect(sortKnowledgeMaterialsDraftsLast(items).map((m) => m.id)).toEqual(['3', '2', '1']);
  });

  it('returns the same array when only one status is present', () => {
    const published = [{ id: '1', status: 'PUBLISHED' }];
    const drafts = [{ id: '2', status: 'DRAFT' }];

    expect(sortKnowledgeMaterialsDraftsLast(published)).toBe(published);
    expect(sortKnowledgeMaterialsDraftsLast(drafts)).toBe(drafts);
  });
});

describe('compareKnowledgeMaterialsForAdminList', () => {
  it('ranks published above pinned drafts', () => {
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
