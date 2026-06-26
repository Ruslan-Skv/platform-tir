import { describe, expect, it } from '@jest/globals';

import {
  buildKnowledgeMaterialViewUrl,
  buildKnowledgeTerritoryBackUrl,
  buildKnowledgeTerritoryUrl,
  isKnowledgeTerritoryFiltersSyncedWithUrl,
  parseKnowledgeTerritorySearchParams,
  readKnowledgeMaterialListContextFromSearchParams,
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

  it('prefers explicit list context over saved filters', () => {
    expect(
      buildKnowledgeTerritoryBackUrl('cat-fallback', { categoryFilter: 'cat-from-list' })
    ).toBe('/admin/knowledge?category=cat-from-list');
  });

  it('builds favorites list back url from list context', () => {
    expect(buildKnowledgeTerritoryBackUrl(undefined, { favoritesOnly: true })).toBe(
      '/admin/knowledge?favorites=1'
    );
  });
});

describe('buildKnowledgeMaterialViewUrl', () => {
  it('includes list category in material url', () => {
    expect(buildKnowledgeMaterialViewUrl('mat-1', { categoryFilter: 'cat-1' })).toBe(
      '/admin/knowledge/materials/mat-1?listCategory=cat-1'
    );
  });

  it('includes favorites list marker in material url', () => {
    expect(buildKnowledgeMaterialViewUrl('mat-1', { favoritesOnly: true })).toBe(
      '/admin/knowledge/materials/mat-1?listFavorites=1'
    );
  });
});

describe('readKnowledgeMaterialListContextFromSearchParams', () => {
  it('reads list context from material page query', () => {
    const params = new URLSearchParams('listCategory=cat-1&listFavorites=1');
    expect(readKnowledgeMaterialListContextFromSearchParams(params)).toEqual({
      categoryFilter: 'cat-1',
      favoritesOnly: true,
    });
  });
});

describe('readInitialKnowledgeTerritoryFilters', () => {
  it('parses category from url search params helper', () => {
    const params = new URLSearchParams('category=cat-url&page=2');
    expect(parseKnowledgeTerritorySearchParams(params).categoryFilter).toBe('cat-url');
  });
});
