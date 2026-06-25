import { describe, expect, it } from '@jest/globals';

import {
  buildKnowledgeTerritoryBackUrl,
  buildKnowledgeTerritoryUrl,
  isKnowledgeTerritoryFiltersSyncedWithUrl,
  parseKnowledgeTerritorySearchParams,
} from './knowledge-territory-filters-storage';

describe('buildKnowledgeTerritoryUrl', () => {
  it('builds url with category and module', () => {
    expect(
      buildKnowledgeTerritoryUrl({
        categoryFilter: 'cat-1',
        moduleFilter: 'mod-1',
        page: 2,
      })
    ).toBe('/admin/knowledge?category=cat-1&module=mod-1&page=2');
  });

  it('returns base path without filters', () => {
    expect(buildKnowledgeTerritoryUrl({})).toBe('/admin/knowledge');
  });
});

describe('parseKnowledgeTerritorySearchParams', () => {
  it('parses filters from query string', () => {
    const params = new URLSearchParams('category=cat-1&module=mod-1&q=окна&page=3&type=ARTICLE');
    expect(parseKnowledgeTerritorySearchParams(params)).toEqual({
      categoryFilter: 'cat-1',
      moduleFilter: 'mod-1',
      typeFilter: 'ARTICLE',
      search: 'окна',
      searchInput: 'окна',
      page: 3,
    });
  });
});

describe('isKnowledgeTerritoryFiltersSyncedWithUrl', () => {
  it('matches filters regardless of query param order', () => {
    const params = new URLSearchParams('module=mod-1&category=cat-1');
    expect(
      isKnowledgeTerritoryFiltersSyncedWithUrl(params, {
        categoryFilter: 'cat-1',
        moduleFilter: 'mod-1',
      })
    ).toBe(true);
  });

  it('returns false when category differs', () => {
    const params = new URLSearchParams('category=cat-1');
    expect(
      isKnowledgeTerritoryFiltersSyncedWithUrl(params, {
        categoryFilter: 'cat-2',
      })
    ).toBe(false);
  });

  it('treats missing page as page 1', () => {
    const params = new URLSearchParams('category=cat-1');
    expect(
      isKnowledgeTerritoryFiltersSyncedWithUrl(params, {
        categoryFilter: 'cat-1',
        page: 1,
      })
    ).toBe(true);
  });
});

describe('buildKnowledgeTerritoryBackUrl', () => {
  it('falls back to material category when storage is empty', () => {
    expect(buildKnowledgeTerritoryBackUrl('cat-fallback')).toBe(
      '/admin/knowledge?category=cat-fallback'
    );
  });
});
