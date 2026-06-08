import { apiFetch } from '@/shared/lib/api-fetch';
import {
  type ParsedCatalogSearchParams,
  buildPublicCatalogListQuery,
} from '@/views/catalog/lib/catalog-search-params';
import type { CatalogFiltersResponse } from '@/views/catalog/lib/catalogFilters.types';
import type { CatalogApiProduct } from '@/views/catalog/lib/mapCatalogApiProductToProduct';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const PUBLIC_CATALOG_LIST_QUERY_KEY = 'public-catalog-list';
export const PUBLIC_CATALOG_FILTERS_QUERY_KEY = 'public-catalog-filters';
export const PUBLIC_CATALOG_PAGE_QUERY_KEY = 'public-catalog-page';

export type PublicCatalogSort =
  | 'default'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'name-desc'
  | 'new'
  | 'rating';

export interface PublicCatalogListResponse {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  products: CatalogApiProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  priceRange?: { min: number; max: number } | null;
  categoryFilterOptions?: Array<{
    slug: string;
    label: string;
    count: number;
    depth?: 0 | 1;
  }>;
}

export interface FetchPublicCatalogListOptions {
  categorySlug?: string;
  parsed: ParsedCatalogSearchParams;
  limit?: number;
  apiBaseUrl?: string;
}

export async function fetchPublicCatalogList(
  options: FetchPublicCatalogListOptions
): Promise<PublicCatalogListResponse> {
  const base = options.apiBaseUrl ?? API_URL;
  const qs = buildPublicCatalogListQuery({
    categorySlug: options.categorySlug,
    parsed: options.parsed,
    limit: options.limit,
  });
  const res = await apiFetch(`${base}/products/catalog/list?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить каталог');
  }
  return res.json();
}

export interface FetchPublicCatalogFiltersOptions {
  categorySlug?: string;
  parsed: ParsedCatalogSearchParams;
  apiBaseUrl?: string;
}

export interface PublicCatalogPageResponse extends PublicCatalogListResponse {
  filters: CatalogFiltersResponse;
}

export interface FetchPublicCatalogPageOptions extends FetchPublicCatalogListOptions {}

export async function fetchPublicCatalogPage(
  options: FetchPublicCatalogPageOptions,
  fetchInit?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } }
): Promise<PublicCatalogPageResponse> {
  const base = options.apiBaseUrl ?? API_URL;
  const qs = buildPublicCatalogListQuery({
    categorySlug: options.categorySlug,
    parsed: options.parsed,
    limit: options.limit,
  });
  const res = await apiFetch(`${base}/products/catalog/page?${qs.toString()}`, {
    cache: fetchInit?.cache ?? 'no-store',
    ...fetchInit,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить каталог');
  }
  const data = (await res.json()) as PublicCatalogPageResponse;
  if (!data.filters || !Array.isArray(data.filters.filters)) {
    return {
      ...data,
      filters: {
        branch: null,
        filters: [],
        categoryFilterOptions: data.categoryFilterOptions ?? [],
      },
    };
  }
  return data;
}

export async function fetchPublicCatalogFilters(
  options: FetchPublicCatalogFiltersOptions
): Promise<CatalogFiltersResponse> {
  const base = options.apiBaseUrl ?? API_URL;
  const qs = buildPublicCatalogListQuery({
    categorySlug: options.categorySlug,
    parsed: options.parsed,
  });
  const res = await apiFetch(`${base}/products/catalog/filters?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить фильтры');
  }
  const data = await res.json();
  if (!data || !Array.isArray(data.filters)) {
    return { branch: null, filters: [], categoryFilterOptions: [] };
  }
  return data as CatalogFiltersResponse;
}
