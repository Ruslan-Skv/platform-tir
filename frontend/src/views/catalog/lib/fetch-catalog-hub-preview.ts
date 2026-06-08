import { cache } from 'react';

import {
  type CatalogHubPreviewMode,
  type CatalogHubPreviewResponse,
  fetchCatalogHubPreview,
} from '@/shared/api/catalog-hub-preview';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

export const CATALOG_HUB_PREVIEW_QUERY_KEY = 'catalog-hub-preview';

export function catalogHubPreviewQueryKey(mode: CatalogHubPreviewMode) {
  return [CATALOG_HUB_PREVIEW_QUERY_KEY, mode] as const;
}

/** SSR: превью хаба /catalog/products (режим «популярное» по умолчанию) */
export const getCatalogHubPreviewCached = cache(
  async (mode: CatalogHubPreviewMode = 'featured'): Promise<CatalogHubPreviewResponse> =>
    fetchCatalogHubPreview({
      mode,
      apiBaseUrl: getServerApiBaseUrl(),
      next: { revalidate: 60, tags: ['catalog-hub-preview'] },
    })
);
