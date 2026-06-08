'use client';

import { useQuery } from '@tanstack/react-query';

import type { CategoryFilterOption } from '@/views/catalog/lib/buildCategoryFilterOptions';
import {
  CATALOG_HUB_CATEGORIES_QUERY_KEY,
  fetchCatalogHubCategories,
} from '@/views/catalog/lib/fetch-catalog-hub-categories';

/** Категории для выбора ?branch= на хабе /catalog/products */
export function useCatalogHubCategories(
  enabled: boolean,
  initialOptions?: CategoryFilterOption[] | null
) {
  const { data, isLoading } = useQuery({
    queryKey: [CATALOG_HUB_CATEGORIES_QUERY_KEY],
    queryFn: () => fetchCatalogHubCategories(),
    enabled,
    initialData: initialOptions?.length ? initialOptions : undefined,
    staleTime: 5 * 60_000,
  });

  return {
    options: data ?? [],
    loading: enabled && isLoading && !data?.length,
  };
}
