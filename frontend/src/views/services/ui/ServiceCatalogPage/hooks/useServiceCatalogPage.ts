'use client';

import { useServiceCatalog } from '@/shared/lib/hooks/useServiceCatalog';

export function useServiceCatalogPage() {
  const { data, isLoading } = useServiceCatalog();
  const showLoading = isLoading && !data;

  return {
    data,
    showLoading,
  };
}

export type ServiceCatalogPageModel = ReturnType<typeof useServiceCatalogPage>;
