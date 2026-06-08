'use client';

import { useQuery } from '@tanstack/react-query';

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
  return useQuery({
    queryKey: catalogHubPreviewQueryKey(mode),
    queryFn: () => fetchCatalogHubPreview({ mode }),
    initialData: initialData ?? undefined,
    staleTime: 60_000,
  });
}
