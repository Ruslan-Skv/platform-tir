import type { ParsedCatalogSearchParams } from '@/views/catalog/lib/catalog-search-params';
import { buildCatalogRobots } from '@/views/catalog/lib/catalog-seo';

/** Индексируемые URL каталога — можно кэшировать на CDN/Next (ISR). */
export function isCacheableCatalogRequest(parsed: ParsedCatalogSearchParams): boolean {
  const robots = buildCatalogRobots(parsed);
  if (!robots || typeof robots === 'string') return false;
  return robots.index === true;
}

export function buildCatalogPageCacheTag(
  categorySlug: string | undefined,
  parsed: ParsedCatalogSearchParams
): string {
  const slug = categorySlug && categorySlug !== 'all' ? categorySlug : (parsed.branch ?? 'hub');
  const page = parsed.page > 1 ? `-p${parsed.page}` : '';
  return `catalog-page-${slug}${page}`;
}
