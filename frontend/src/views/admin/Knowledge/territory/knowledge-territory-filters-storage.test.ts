import { describe, expect, it } from '@jest/globals';

import {
  buildKnowledgeTerritoryBackUrl,
  buildKnowledgeTerritoryUrl,
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

describe('buildKnowledgeTerritoryBackUrl', () => {
  it('falls back to material category when storage is empty', () => {
    expect(buildKnowledgeTerritoryBackUrl('cat-fallback')).toBe(
      '/admin/knowledge?category=cat-fallback'
    );
  });
});
