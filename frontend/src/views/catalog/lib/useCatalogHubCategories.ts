'use client';

import { useQuery } from '@tanstack/react-query';

import type { CategoryFilterOption } from '@/views/catalog/lib/buildCategoryFilterOptions';
import {
  CATALOG_HUB_CATEGORIES_QUERY_KEY,
  fetchCatalogHubCategories,
} from '@/views/catalog/lib/fetch-catalog-hub-categories';

/** Корневые категории каталога: хаб /catalog/products и переключатель разделов на /catalog/products/[slug] */
export function useCatalogHubCategories(
  enabled: boolean,
  initialOptions?: CategoryFilterOption[] | null
) {
  const { data, isLoading } = useQuery<CategoryFilterOption[]>({
    queryKey: [CATALOG_HUB_CATEGORIES_QUERY_KEY],
    queryFn: () => fetchCatalogHubCategories(),
    enabled,
    initialData: initialOptions?.length ? initialOptions : undefined,
    staleTime: 5 * 60_000,
  });

  const options = data ?? [];
  return {
    options,
    loading: enabled && isLoading && options.length === 0,
  };
}
