import type { Product } from '@/entities/product/types';
import { getProductAvailability } from '@/shared/lib/product-availability';

import type { CatalogFilterFacet } from './catalogFilters.types';
import { getProductAttrValue } from './productAttrValue';

const ATTR_PARAM_PREFIX = 'attr_';

/** Ключи query-параметров фильтров (кроме page, search). */
export function catalogFilterParamKeys(): string[] {
  return ['avail', 'mfr', 'price_min', 'price_max', 'cat'];
}

export function buildAttrParamKey(filterId: string): string {
  return `${ATTR_PARAM_PREFIX}${filterId}`;
}

/** Сигнатура только параметров фильтра (без page/search) — для сброса страницы при смене фильтров. */
export function filterSearchSignature(params: URLSearchParams): string {
  const pairs: string[] = [];
  for (const [k, v] of params.entries()) {
    if (
      k.startsWith(ATTR_PARAM_PREFIX) ||
      k === 'avail' ||
      k === 'mfr' ||
      k === 'price_min' ||
      k === 'price_max' ||
      k === 'cat'
    ) {
      pairs.push(`${k}=${v}`);
    }
  }
  pairs.sort();
  return pairs.join('&');
}

/**
 * Фильтрация списка товаров по URL (согласовано с FiltersSidebar).
 * AND между разными фильтрами; внутри одного атрибута — OR по выбранным значениям.
 */
export function applyCatalogFilters(
  products: readonly Product[],
  params: URLSearchParams,
  facets: CatalogFilterFacet[]
): Product[] {
  let list: Product[] = [...products];

  // Только явные query-параметры: Number(null) === 0, иначе max «0» отсекает все товары.
  const rawMin = params.get('price_min');
  const rawMax = params.get('price_max');
  if (rawMin != null && rawMin !== '') {
    const minPrice = Number(rawMin);
    if (Number.isFinite(minPrice)) {
      list = list.filter((p) => p.price >= minPrice);
    }
  }
  if (rawMax != null && rawMax !== '') {
    const maxPrice = Number(rawMax);
    if (Number.isFinite(maxPrice)) {
      list = list.filter((p) => p.price <= maxPrice);
    }
  }

  const categorySlugs = params.getAll('cat').filter(Boolean);
  if (categorySlugs.length > 0) {
    const allowed = new Set(categorySlugs);
    list = list.filter((p) => p.categorySlug != null && allowed.has(p.categorySlug));
  }

  const availVals = params.getAll('avail').filter(Boolean);
  if (availVals.length > 0) {
    const allowed = new Set(availVals);
    list = list.filter((p) => {
      const a = getProductAvailability(Number(p.stock ?? 0), p.onOrder);
      return allowed.has(a);
    });
  }

  const mfrIds = params.getAll('mfr');
  if (mfrIds.length > 0) {
    const set = new Set(mfrIds);
    list = list.filter((p) => p.manufacturerId != null && set.has(p.manufacturerId));
  }

  if (facets.length === 0) {
    return list;
  }

  for (const facet of facets) {
    if (facet.id === 'availability') continue;
    if (facet.id === 'manufacturer') continue;

    const key = buildAttrParamKey(facet.id);
    const selected = params.getAll(key);
    if (selected.length === 0) continue;

    const selectedSet = new Set(selected);
    const slug = facet.attributeSlug ?? facet.id;
    const name = facet.attributeName ?? undefined;

    if (!slug && !name) continue;

    list = list.filter((p) => {
      const v = getProductAttrValue(p.attributes, { slug, name: name ?? null });
      return v != null && v !== '' && selectedSet.has(v);
    });
  }

  return list;
}
