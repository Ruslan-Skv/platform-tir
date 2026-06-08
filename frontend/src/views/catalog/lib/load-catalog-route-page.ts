import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import type { ParsedCatalogSearchParams } from '@/views/catalog/lib/catalog-search-params';
import { getCatalogPageCached } from '@/views/catalog/lib/get-catalog-page-cached';

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://territory-interior.ru';
const DEFAULT_SSR_LIMIT = 15;

export function searchParamsRecordToQueryString(
  sp: Record<string, string | string[] | undefined>
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  return params.toString();
}

export async function loadCatalogRoutePage(options: {
  categorySlug?: string;
  parsed: ParsedCatalogSearchParams;
  pathname: string;
  searchQueryString: string;
  limit?: number;
}) {
  const limit = options.limit ?? DEFAULT_SSR_LIMIT;
  const initialPage = await getCatalogPageCached({
    categorySlug: options.categorySlug,
    parsed: options.parsed,
    limit,
    apiBaseUrl: getServerApiBaseUrl(),
  });

  const canonicalQs = new URLSearchParams();
  if (options.parsed.page > 1) canonicalQs.set('page', String(options.parsed.page));
  if (options.parsed.branch) canonicalQs.set('branch', options.parsed.branch);
  const canonicalQuery = canonicalQs.toString();
  const listUrl = `${SITE_ORIGIN}${options.pathname}${canonicalQuery ? `?${canonicalQuery}` : ''}`;

  return {
    initialPage,
    listUrl,
    limit,
    pagination: {
      pathname: options.pathname,
      parsed: options.parsed,
      totalPages: initialPage.totalPages,
      searchQueryString: options.searchQueryString,
    },
  };
}
