'use client';

import { useMemo } from 'react';

import type { PublicCatalogPageResponse } from '@/shared/api/public-catalog-list';
import type { ParsedCatalogSearchParams } from '@/views/catalog/lib/catalog-search-params';
import { useCatalogPage } from '@/views/catalog/lib/useCatalogPage';

/**
 * Faceted-фильтры из общего запроса `/catalog/page` (один HTTP с ProductsGrid).
 */
export function useCatalogFilters(
  categorySlug: string | undefined,
  facetBranchSlug: string | null | undefined,
  parsedParams: ParsedCatalogSearchParams,
  limit: number,
  initialPage?: PublicCatalogPageResponse | null
) {
  const { data, isLoading, isFetching } = useCatalogPage(
    categorySlug,
    parsedParams,
    facetBranchSlug,
    limit,
    initialPage
  );

  const filtersSlug = useMemo(() => {
    if (categorySlug && categorySlug !== 'all') return categorySlug;
    const b = facetBranchSlug?.trim();
    return b ? b : null;
  }, [categorySlug, facetBranchSlug]);

  /** На хабе без ?branch= запрос отключён — не показывать фасеты предыдущей ветки из кэша. */
  const filters = filtersSlug ? (data?.filters?.filters ?? []) : [];
  const hasFacets = filters.length > 0;
  const categoryFilterOptions = filtersSlug
    ? (data?.filters?.categoryFilterOptions ?? data?.categoryFilterOptions ?? [])
    : [];

  return {
    filters,
    branch: filtersSlug ? (data?.filters?.branch ?? null) : null,
    categoryFilterOptions,
    loading: Boolean(filtersSlug) && isLoading && !data,
    refreshing: Boolean(filtersSlug) && isFetching && Boolean(data),
    hasFacets,
  };
}
