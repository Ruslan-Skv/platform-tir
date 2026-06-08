'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getServiceCatalog, getServiceCatalogCategory } from '@/shared/api/service-catalog';

export const SERVICE_CATALOG_QUERY_KEY = ['service-catalog'] as const;

export const serviceCatalogCategoryQueryKey = (slug: string) =>
  ['service-catalog', 'category', slug] as const;

const SERVICE_CATALOG_STALE_TIME = 60_000;
const SERVICE_CATALOG_GC_TIME = 5 * 60_000;

export function useServiceCatalog() {
  return useQuery({
    queryKey: SERVICE_CATALOG_QUERY_KEY,
    queryFn: getServiceCatalog,
    staleTime: SERVICE_CATALOG_STALE_TIME,
    gcTime: SERVICE_CATALOG_GC_TIME,
  });
}

export function useServiceCatalogCategory(slug: string) {
  return useQuery({
    queryKey: serviceCatalogCategoryQueryKey(slug),
    queryFn: () => getServiceCatalogCategory(slug),
    staleTime: SERVICE_CATALOG_STALE_TIME,
    gcTime: SERVICE_CATALOG_GC_TIME,
    placeholderData: keepPreviousData,
  });
}
