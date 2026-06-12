import type { QueryClient } from '@tanstack/react-query';

import {
  PUBLIC_CATALOG_PAGE_QUERY_KEY,
  type PublicCatalogPageResponse,
} from '@/shared/api/public-catalog-list';
import type { CatalogApiProduct } from '@/shared/types/catalog';

/** Обновить товар во всех закэшированных страницах каталога (inline-редактирование цены). */
export function patchProductInCatalogPageCache(
  queryClient: QueryClient,
  patched: CatalogApiProduct
): void {
  queryClient.setQueriesData<PublicCatalogPageResponse>(
    { queryKey: [PUBLIC_CATALOG_PAGE_QUERY_KEY] },
    (old) => {
      if (!old?.products?.some((p) => p.id === patched.id)) return old;
      return {
        ...old,
        products: old.products.map((p) => (p.id === patched.id ? { ...p, ...patched } : p)),
      };
    }
  );
}
