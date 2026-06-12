import { apiFetch } from '@/shared/lib/api-fetch';
import type { CatalogApiProduct } from '@/shared/types/catalog';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type CatalogHubPreviewMode = 'featured' | 'new';

export interface CatalogHubPreviewSection {
  id: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  viewAllUrl: string;
  products: CatalogApiProduct[];
}

export interface CatalogHubPreviewResponse {
  mode: CatalogHubPreviewMode;
  productsPerGroup: number;
  sections: CatalogHubPreviewSection[];
}

export interface FetchCatalogHubPreviewOptions {
  mode?: CatalogHubPreviewMode;
  apiBaseUrl?: string;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

export async function fetchCatalogHubPreview(
  options: FetchCatalogHubPreviewOptions = {}
): Promise<CatalogHubPreviewResponse> {
  const { mode = 'featured', apiBaseUrl, cache, next } = options;
  const base = apiBaseUrl ?? API_URL;
  const params = new URLSearchParams({ mode });
  const fetchInit: RequestInit & { next?: { revalidate?: number; tags?: string[] } } = {};
  if (next) {
    fetchInit.next = next;
  } else if (cache) {
    fetchInit.cache = cache;
  } else if (typeof window === 'undefined') {
    fetchInit.next = { revalidate: 60, tags: ['catalog-hub-preview'] };
  } else {
    fetchInit.cache = 'no-store';
  }

  const res = await apiFetch(`${base}/products/catalog/hub-preview?${params}`, fetchInit);
  if (!res.ok) {
    throw new Error('Не удалось загрузить превью каталога');
  }
  return res.json() as Promise<CatalogHubPreviewResponse>;
}
