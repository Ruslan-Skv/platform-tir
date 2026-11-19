'use client';

import type { ServiceCatalogData } from '@/shared/api/service-catalog';
import { useServiceCatalog } from '@/shared/lib/hooks/useServiceCatalog';

export function useServiceCatalogPage(initialData?: ServiceCatalogData | null) {
  const { data, isLoading } = useServiceCatalog(initialData);
  const showLoading = isLoading && !data;

  return {
    data,
    showLoading,
  };
}

export type ServiceCatalogPageModel = ReturnType<typeof useServiceCatalogPage>;
