export type PublicCatalogSort =
  | 'default'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'name-desc'
  | 'new'
  | 'rating';

export interface PublicCatalogListParams {
  /** Slug страницы категории; `all` — хаб без branch */
  categorySlug?: string;
  /** Ветка на хабе /catalog/products */
  branch?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: PublicCatalogSort;
  priceMin?: number;
  priceMax?: number;
  avail?: string[];
  mfr?: string[];
  /** Slug подкатегорий для фильтра ?cat= */
  cat?: string[];
  /** attr_<filterId> → выбранные значения */
  attributes?: Record<string, string[]>;
}

const VALID_SORTS = new Set<PublicCatalogSort>([
  'default',
  'price-asc',
  'price-desc',
  'name-asc',
  'name-desc',
  'new',
  'rating',
]);

function toStringArray(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr.map((v) => v.trim()).filter(Boolean);
}

function toNumber(value: string | undefined): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Парсинг query NestJS → параметры списка каталога. */
export function parsePublicCatalogListQuery(
  query: Record<string, string | string[] | undefined>,
): PublicCatalogListParams {
  const attributes: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(query)) {
    if (!key.startsWith('attr_')) continue;
    const filterId = key.slice('attr_'.length);
    if (!filterId) continue;
    const values = toStringArray(raw);
    if (values.length > 0) attributes[filterId] = values;
  }

  const sortRaw = typeof query.sort === 'string' ? query.sort : undefined;
  const sort =
    sortRaw && VALID_SORTS.has(sortRaw as PublicCatalogSort)
      ? (sortRaw as PublicCatalogSort)
      : 'default';

  return {
    categorySlug: typeof query.categorySlug === 'string' ? query.categorySlug : undefined,
    branch: typeof query.branch === 'string' ? query.branch.trim() || undefined : undefined,
    search: typeof query.search === 'string' ? query.search.trim() || undefined : undefined,
    page: toNumber(typeof query.page === 'string' ? query.page : undefined),
    limit: toNumber(typeof query.limit === 'string' ? query.limit : undefined),
    sort,
    priceMin: toNumber(typeof query.price_min === 'string' ? query.price_min : undefined),
    priceMax: toNumber(typeof query.price_max === 'string' ? query.price_max : undefined),
    avail: toStringArray(query.avail),
    mfr: toStringArray(query.mfr),
    cat: toStringArray(query.cat),
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
  };
}
