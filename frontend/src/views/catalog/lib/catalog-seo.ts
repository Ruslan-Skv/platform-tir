import type { Metadata } from 'next';

import type { ParsedCatalogSearchParams } from '@/views/catalog/lib/catalog-search-params';

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://territory-interior.ru';

export function buildCatalogCanonicalPath(
  pathname: string,
  parsed: ParsedCatalogSearchParams
): string {
  const params = new URLSearchParams();
  if (parsed.page > 1) params.set('page', String(parsed.page));
  if (parsed.branch) params.set('branch', parsed.branch);
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export interface CatalogPaginationLinksInput {
  pathname: string;
  parsed: ParsedCatalogSearchParams;
  totalPages: number;
  /** Полная query string без leading `?` (для сохранения branch и т.д.) */
  searchQueryString?: string;
}

export function buildCatalogPaginationUrl(input: CatalogPaginationLinksInput): {
  prev?: string;
  next?: string;
} {
  const { pathname, parsed, totalPages, searchQueryString = '' } = input;
  if (totalPages <= 1) return {};

  const buildPageUrl = (targetPage: number) => {
    const params = new URLSearchParams(searchQueryString);
    if (targetPage <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(targetPage));
    }
    const q = params.toString();
    return `${SITE_ORIGIN}${pathname}${q ? `?${q}` : ''}`;
  };

  const page = parsed.page;
  const out: { prev?: string; next?: string } = {};
  if (page > 1) out.prev = buildPageUrl(page - 1);
  if (page < totalPages) out.next = buildPageUrl(page + 1);
  return out;
}

export function buildCatalogRobots(parsed: ParsedCatalogSearchParams): Metadata['robots'] {
  if (parsed.search) {
    return { index: false, follow: true };
  }
  if (parsed.sort !== 'default') {
    return { index: false, follow: true };
  }
  const hasFilters =
    parsed.priceMin ||
    parsed.priceMax ||
    parsed.avail.length > 0 ||
    parsed.mfr.length > 0 ||
    parsed.cat.length > 0 ||
    Object.keys(parsed.attributes).length > 0;
  if (hasFilters) {
    return { index: false, follow: true };
  }
  return { index: true, follow: true };
}

export function buildCatalogMetadata(input: {
  title: string;
  description: string;
  pathname: string;
  parsed: ParsedCatalogSearchParams;
  totalPages?: number;
  searchQueryString?: string;
}): Metadata {
  const canonicalPath = buildCatalogCanonicalPath(input.pathname, input.parsed);
  const canonical = `${SITE_ORIGIN}${canonicalPath}`;
  const pagination =
    input.totalPages != null && input.totalPages > 1
      ? buildCatalogPaginationUrl({
          pathname: input.pathname,
          parsed: input.parsed,
          totalPages: input.totalPages,
          searchQueryString: input.searchQueryString,
        })
      : {};

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical,
      ...(pagination.prev ? { prev: pagination.prev } : {}),
      ...(pagination.next ? { next: pagination.next } : {}),
    },
    robots: buildCatalogRobots(input.parsed),
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      type: 'website',
    },
  };
}

export function buildCatalogItemListJsonLd(
  products: Array<{ slug: string; name: string }>,
  listUrl: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    url: listUrl,
    itemListElement: products.map((p, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_ORIGIN}/product/${p.slug}`,
      name: p.name,
    })),
  };
}
