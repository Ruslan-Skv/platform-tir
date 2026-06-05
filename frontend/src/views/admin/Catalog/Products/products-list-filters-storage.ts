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
};

function isTriStateFilter(value: unknown): value is 'all' | 'yes' | 'no' {
  return value === 'all' || value === 'yes' || value === 'no';
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

/** URL списка товаров с сохранённым поиском (после «Назад к списку»). */
export function buildProductsListBackUrl(fromCategory: string): string {
  const base = fromCategory
    ? `/admin/catalog/products/category/${fromCategory}`
    : '/admin/catalog/products';
  const saved = readProductsListFilters();
  const params = new URLSearchParams();
  const searchQuery = saved?.searchQuery.trim();
  if (searchQuery) {
    params.set('q', searchQuery);
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
