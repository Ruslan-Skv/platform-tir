'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  type CatalogHubPreviewMode,
  type CatalogHubPreviewResponse,
  fetchCatalogHubPreview,
} from '@/shared/api/catalog-hub-preview';
import { catalogHubPreviewQueryKey } from '@/views/catalog/lib/fetch-catalog-hub-preview';

export function useCatalogHubPreview(
  mode: CatalogHubPreviewMode,
  initialData?: CatalogHubPreviewResponse | null
) {
  /** SSR-ответ только для того же mode, что в queryKey — иначе «Новинки» мелькают данными «Популярное». */
  const resolvedInitialData = initialData && initialData.mode === mode ? initialData : undefined;

  return useQuery({
    queryKey: catalogHubPreviewQueryKey(mode),
    queryFn: () => fetchCatalogHubPreview({ mode }),
    initialData: resolvedInitialData,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
