'use client';

import { useMemo } from 'react';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  PUBLIC_CATALOG_PAGE_QUERY_KEY,
  type PublicCatalogPageResponse,
  fetchPublicCatalogPage,
} from '@/shared/api/public-catalog-list';
import type { ParsedCatalogSearchParams } from '@/views/catalog/lib/catalog-search-params';

export function useCatalogPage(
  categorySlug: string | undefined,
  parsedParams: ParsedCatalogSearchParams,
  facetBranchSlug: string | null | undefined,
  limit: number,
  initialPage?: PublicCatalogPageResponse | null
) {
  const parsed = useMemo(
    () => ({
      ...parsedParams,
      branch: parsedParams.branch ?? facetBranchSlug ?? null,
    }),
    [parsedParams, facetBranchSlug]
  );

  const hasCatalogScope = Boolean(categorySlug && categorySlug !== 'all') || Boolean(parsed.branch);

  const queryKey = useMemo(() => ({ categorySlug, parsed, limit }), [categorySlug, parsed, limit]);

  const initialData =
    initialPage && initialPage.page === parsed.page && initialPage.limit === limit
      ? initialPage
      : undefined;

  return useQuery({
    queryKey: [PUBLIC_CATALOG_PAGE_QUERY_KEY, queryKey],
    queryFn: () =>
      fetchPublicCatalogPage({
        categorySlug,
        parsed,
        limit,
      }),
    enabled: hasCatalogScope,
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
