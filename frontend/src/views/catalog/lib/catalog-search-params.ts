import type { PublicCatalogSort } from '@/shared/api/public-catalog-list';

export const CATALOG_SORT_OPTIONS: { value: PublicCatalogSort; label: string }[] = [
  { value: 'default', label: 'По умолчанию' },
  { value: 'price-asc', label: 'По цене (сначала дешёвые)' },
  { value: 'price-desc', label: 'По цене (сначала дорогие)' },
  { value: 'name-asc', label: 'По названию (А-Я)' },
  { value: 'name-desc', label: 'По названию (Я-А)' },
  { value: 'new', label: 'По новизне' },
  { value: 'rating', label: 'По рейтингу' },
];

const VALID_SORTS = new Set<PublicCatalogSort>([
  'default',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
  'new',
  'rating',
]);

export interface ParsedCatalogSearchParams {
  page: number;
  sort: PublicCatalogSort;
  search: string;
  branch: string | null;
  priceMin: string;
  priceMax: string;
  avail: string[];
  mfr: string[];
  cat: string[];
  attributes: Record<string, string[]>;
}

function toStringArray(value: string | string[] | null | undefined): string[] {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => v.trim()).filter(Boolean);
}

export function parseCatalogSearchParams(
  params: URLSearchParams | Record<string, string | string[] | undefined>
): ParsedCatalogSearchParams {
  const get = (key: string): string | null => {
    if (params instanceof URLSearchParams) {
      return params.get(key);
    }
    const raw = params[key];
    if (raw == null) return null;
    return Array.isArray(raw) ? (raw[0] ?? null) : raw;
  };

  const getAll = (key: string): string[] => {
    if (params instanceof URLSearchParams) {
      return params.getAll(key).filter(Boolean);
    }
    return toStringArray(params[key]);
  };

  const attributes: Record<string, string[]> = {};
  const entries =
    params instanceof URLSearchParams
      ? Array.from(params.entries())
      : Object.entries(params).flatMap(([k, v]) =>
          toStringArray(v).map((val) => [k, val] as const)
        );

  for (const [key, value] of entries) {
    if (!key.startsWith('attr_')) continue;
    const filterId = key.slice('attr_'.length);
    if (!filterId || !value) continue;
    if (!attributes[filterId]) attributes[filterId] = [];
    if (!attributes[filterId].includes(value)) {
      attributes[filterId].push(value);
    }
  }

  const pageRaw = Number.parseInt(get('page') || '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

  const sortRaw = get('sort') || 'default';
  const sort = VALID_SORTS.has(sortRaw as PublicCatalogSort)
    ? (sortRaw as PublicCatalogSort)
    : 'default';

  return {
    page,
    sort,
    search: get('search')?.trim() ?? '',
    branch: get('branch')?.trim() || null,
    priceMin: get('price_min') ?? '',
    priceMax: get('price_max') ?? '',
    avail: getAll('avail'),
    mfr: getAll('mfr'),
    cat: getAll('cat'),
    attributes,
  };
}

export interface PublicCatalogListQueryInput {
  categorySlug?: string;
  parsed: ParsedCatalogSearchParams;
  limit?: number;
}

export function buildPublicCatalogListQuery(input: PublicCatalogListQueryInput): URLSearchParams {
  const { categorySlug, parsed, limit } = input;
  const qs = new URLSearchParams();

  if (categorySlug) qs.set('categorySlug', categorySlug);
  if (parsed.branch) qs.set('branch', parsed.branch);
  if (parsed.search) qs.set('search', parsed.search);
  if (parsed.page > 1) qs.set('page', String(parsed.page));
  if (parsed.sort && parsed.sort !== 'default') qs.set('sort', parsed.sort);
  if (parsed.priceMin) qs.set('price_min', parsed.priceMin);
  if (parsed.priceMax) qs.set('price_max', parsed.priceMax);
  if (limit != null) qs.set('limit', String(limit));

  for (const v of parsed.avail) qs.append('avail', v);
  for (const v of parsed.mfr) qs.append('mfr', v);
  for (const v of parsed.cat) qs.append('cat', v);
  for (const [filterId, values] of Object.entries(parsed.attributes)) {
    for (const v of values) qs.append(`attr_${filterId}`, v);
  }

  return qs;
}

/** Полная сигнатура запроса списка каталога — для сопоставления SSR initialData с URL. */
export function buildCatalogPageRequestSignature(
  categorySlug: string | undefined,
  parsed: ParsedCatalogSearchParams,
  limit: number
): string {
  const attrParts = Object.keys(parsed.attributes)
    .sort()
    .map((key) => `${key}=${[...parsed.attributes[key]].sort().join(',')}`);
  const parts = [
    `category=${categorySlug ?? ''}`,
    `limit=${limit}`,
    `page=${parsed.page}`,
    `sort=${parsed.sort}`,
    `search=${parsed.search}`,
    `branch=${parsed.branch ?? ''}`,
    `price_min=${parsed.priceMin}`,
    `price_max=${parsed.priceMax}`,
    ...parsed.avail.map((v) => `avail=${v}`),
    ...parsed.mfr.map((v) => `mfr=${v}`),
    ...parsed.cat.map((v) => `cat=${v}`),
    ...attrParts,
  ];
  parts.sort();
  return parts.join('&');
}

/** Сигнатура фильтров без page/search/sort — для сброса страницы. */
export function catalogFilterSignature(params: URLSearchParams): string {
  const parsed = parseCatalogSearchParams(params);
  const parts: string[] = [];
  if (parsed.branch) parts.push(`branch=${parsed.branch}`);
  if (parsed.priceMin) parts.push(`price_min=${parsed.priceMin}`);
  if (parsed.priceMax) parts.push(`price_max=${parsed.priceMax}`);
  for (const v of parsed.avail) parts.push(`avail=${v}`);
  for (const v of parsed.mfr) parts.push(`mfr=${v}`);
  for (const v of parsed.cat) parts.push(`cat=${v}`);
  for (const [id, values] of Object.entries(parsed.attributes)) {
    for (const v of values) parts.push(`attr_${id}=${v}`);
  }
  parts.sort();
  return parts.join('&');
}

export function buildCatalogSortUrl(
  pathname: string,
  currentParams: URLSearchParams,
  sort: PublicCatalogSort
): string {
  const next = new URLSearchParams(currentParams.toString());
  if (sort === 'default') {
    next.delete('sort');
  } else {
    next.set('sort', sort);
  }
  next.delete('page');
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

export function parseNextSearchParamsRecord(
  sp: Record<string, string | string[] | undefined>
): ParsedCatalogSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    } else {
      params.set(key, value);
    }
  }
  return parseCatalogSearchParams(params);
}
