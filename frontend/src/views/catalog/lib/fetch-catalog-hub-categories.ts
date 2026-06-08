import { cache } from 'react';

import { apiFetch } from '@/shared/lib/api-fetch';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import type { CategoryFilterOption } from '@/views/catalog/lib/buildCategoryFilterOptions';
import {
  type CatalogHubCategoryNode,
  categoriesToHubFilterOptions,
} from '@/views/catalog/lib/categories-to-hub-filter-options';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const CATALOG_HUB_CATEGORIES_QUERY_KEY = 'catalog-hub-categories';

export async function fetchCatalogHubCategories(
  apiBaseUrl?: string
): Promise<CategoryFilterOption[]> {
  const base = apiBaseUrl ?? API_URL;
  const fetchInit =
    typeof window === 'undefined'
      ? { next: { revalidate: 300, tags: ['catalog-hub-categories'] as string[] } }
      : { cache: 'no-store' as RequestCache };
  const res = await apiFetch(`${base}/categories`, fetchInit);
  if (!res.ok) {
    throw new Error('Не удалось загрузить категории каталога');
  }
  const data = (await res.json()) as CatalogHubCategoryNode[];
  return categoriesToHubFilterOptions(data);
}

/** SSR: дерево категорий для хаба /catalog/products */
export const getCatalogHubCategoriesCached = cache(
  async (): Promise<CategoryFilterOption[]> => fetchCatalogHubCategories(getServerApiBaseUrl())
);
