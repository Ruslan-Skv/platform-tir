export interface ProductsListFiltersState {
  searchQuery: string;
  categoryFilter: string;
  stockFilter: string;
  authorFilter: string;
  page: number;
  activeFilter: 'all' | 'yes' | 'no';
  featuredFilter: 'all' | 'yes' | 'no';
  newFilter: 'all' | 'yes' | 'no';
  priceMin: string;
  priceMax: string;
  showAdvancedFilters: boolean;
  listSortBy: string;
  listSortOrder: 'asc' | 'desc';
}

const STORAGE_KEY = 'admin_products_list_filters';

const DEFAULT_FILTERS: ProductsListFiltersState = {
  searchQuery: '',
  categoryFilter: '',
  stockFilter: '',
  authorFilter: '',
  page: 1,
  activeFilter: 'all',
  featuredFilter: 'all',
  newFilter: 'all',
  priceMin: '',
  priceMax: '',
  showAdvancedFilters: false,
  listSortBy: 'name',
  listSortOrder: 'asc',
};

function isTriStateFilter(value: unknown): value is 'all' | 'yes' | 'no' {
  return value === 'all' || value === 'yes' || value === 'no';
}

export function readProductsListFiltersFromSearchParams(
  params: URLSearchParams
): Partial<ProductsListFiltersState> {
  const result: Partial<ProductsListFiltersState> = {};

  const q = params.get('q');
  if (q !== null) result.searchQuery = q;

  const stock = params.get('stock');
  if (stock !== null) result.stockFilter = stock;

  const author = params.get('author');
  if (author !== null) result.authorFilter = author;

  const page = params.get('page');
  if (page !== null) {
    const n = Number(page);
    if (Number.isFinite(n) && n > 0) result.page = n;
  }

  const active = params.get('active');
  if (isTriStateFilter(active)) result.activeFilter = active;

  const featured = params.get('featured');
  if (isTriStateFilter(featured)) result.featuredFilter = featured;

  const newFilter = params.get('new');
  if (isTriStateFilter(newFilter)) result.newFilter = newFilter;

  const priceMin = params.get('priceMin');
  if (priceMin !== null) result.priceMin = priceMin;

  const priceMax = params.get('priceMax');
  if (priceMax !== null) result.priceMax = priceMax;

  const adv = params.get('adv');
  if (adv === '1') result.showAdvancedFilters = true;
  if (adv === '0') result.showAdvancedFilters = false;

  const sort = params.get('sort');
  if (sort) result.listSortBy = sort;

  const order = params.get('order');
  if (order === 'asc' || order === 'desc') result.listSortOrder = order;

  const category = params.get('category');
  if (category !== null) result.categoryFilter = category;

  return result;
}

export function productsListFiltersToSearchParams(
  state: ProductsListFiltersState,
  options?: { omitCategory?: boolean }
): URLSearchParams {
  const params = new URLSearchParams();

  const q = state.searchQuery.trim();
  if (q) params.set('q', q);
  if (state.stockFilter) params.set('stock', state.stockFilter);
  if (state.authorFilter) params.set('author', state.authorFilter);
  if (state.page > 1) params.set('page', String(state.page));
  if (state.activeFilter !== 'all') params.set('active', state.activeFilter);
  if (state.featuredFilter !== 'all') params.set('featured', state.featuredFilter);
  if (state.newFilter !== 'all') params.set('new', state.newFilter);
  if (state.priceMin) params.set('priceMin', state.priceMin);
  if (state.priceMax) params.set('priceMax', state.priceMax);
  if (state.showAdvancedFilters) params.set('adv', '1');
  if (state.listSortBy) params.set('sort', state.listSortBy);
  if (state.listSortOrder) params.set('order', state.listSortOrder);
  if (!options?.omitCategory && state.categoryFilter) {
    params.set('category', state.categoryFilter);
  }

  return params;
}

export function mergeProductsListFilters(
  storage: ProductsListFiltersState | null,
  url: Partial<ProductsListFiltersState>
): ProductsListFiltersState {
  return {
    ...(storage ?? DEFAULT_FILTERS),
    ...url,
  };
}

export function readProductsListFilters(): ProductsListFiltersState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const data = parsed as Partial<ProductsListFiltersState>;
    return {
      searchQuery:
        typeof data.searchQuery === 'string' ? data.searchQuery : DEFAULT_FILTERS.searchQuery,
      categoryFilter:
        typeof data.categoryFilter === 'string'
          ? data.categoryFilter
          : DEFAULT_FILTERS.categoryFilter,
      stockFilter:
        typeof data.stockFilter === 'string' ? data.stockFilter : DEFAULT_FILTERS.stockFilter,
      authorFilter:
        typeof data.authorFilter === 'string' ? data.authorFilter : DEFAULT_FILTERS.authorFilter,
      page:
        typeof data.page === 'number' && Number.isFinite(data.page) && data.page > 0
          ? data.page
          : DEFAULT_FILTERS.page,
      activeFilter: isTriStateFilter(data.activeFilter)
        ? data.activeFilter
        : DEFAULT_FILTERS.activeFilter,
      featuredFilter: isTriStateFilter(data.featuredFilter)
        ? data.featuredFilter
        : DEFAULT_FILTERS.featuredFilter,
      newFilter: isTriStateFilter(data.newFilter) ? data.newFilter : DEFAULT_FILTERS.newFilter,
      priceMin: typeof data.priceMin === 'string' ? data.priceMin : DEFAULT_FILTERS.priceMin,
      priceMax: typeof data.priceMax === 'string' ? data.priceMax : DEFAULT_FILTERS.priceMax,
      showAdvancedFilters:
        typeof data.showAdvancedFilters === 'boolean'
          ? data.showAdvancedFilters
          : DEFAULT_FILTERS.showAdvancedFilters,
      listSortBy:
        typeof data.listSortBy === 'string' ? data.listSortBy : DEFAULT_FILTERS.listSortBy,
      listSortOrder: data.listSortOrder === 'desc' ? 'desc' : DEFAULT_FILTERS.listSortOrder,
    };
  } catch {
    return null;
  }
}

export function writeProductsListFilters(state: ProductsListFiltersState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** URL списка товаров с сохранёнными фильтрами и сортировкой (после «Назад к списку»). */
export function buildProductsListBackUrl(fromCategory: string): string {
  const base = fromCategory
    ? `/admin/catalog/products/category/${fromCategory}`
    : '/admin/catalog/products';
  const saved = readProductsListFilters();
  if (!saved) return base;
  const params = productsListFiltersToSearchParams(saved, { omitCategory: Boolean(fromCategory) });
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
