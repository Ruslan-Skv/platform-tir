import { cache } from 'react';

import {
  type FetchPublicCatalogPageOptions,
  type PublicCatalogPageResponse,
  fetchPublicCatalogPage,
} from '@/shared/api/public-catalog-list';
import {
  buildCatalogPageCacheTag,
  isCacheableCatalogRequest,
} from '@/views/catalog/lib/is-cacheable-catalog-request';

/** Один запрос каталога на SSR-рендер (page + generateMetadata). */
export const getCatalogPageCached = cache(
  async (options: FetchPublicCatalogPageOptions): Promise<PublicCatalogPageResponse> => {
    const cacheable = isCacheableCatalogRequest(options.parsed);
    if (!cacheable) {
      return fetchPublicCatalogPage(options, { cache: 'no-store' });
    }

    return fetchPublicCatalogPage(options, {
      next: {
        revalidate: 60,
        tags: [buildCatalogPageCacheTag(options.categorySlug, options.parsed), 'catalog-pages'],
      },
    });
  }
);
