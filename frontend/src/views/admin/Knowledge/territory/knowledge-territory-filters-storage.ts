import type { KnowledgeMaterialType } from '@/shared/api/admin-knowledge';

export interface KnowledgeTerritoryFiltersState {
  categoryFilter: string;
  moduleFilter: string;
  typeFilter: KnowledgeMaterialType | '';
  statusFilter: string;
  search: string;
  searchInput: string;
  page: number;
  favoritesOnly: boolean;
}

const STORAGE_KEY = 'admin_knowledge_territory_filters';

const DEFAULT_FILTERS: KnowledgeTerritoryFiltersState = {
  categoryFilter: '',
  moduleFilter: '',
  typeFilter: '',
  statusFilter: '',
  search: '',
  searchInput: '',
  page: 1,
  favoritesOnly: false,
};

const MATERIAL_TYPES = new Set<KnowledgeMaterialType>(['ARTICLE', 'VIDEO', 'LINK']);

function isMaterialType(value: unknown): value is KnowledgeMaterialType {
  return typeof value === 'string' && MATERIAL_TYPES.has(value as KnowledgeMaterialType);
}

export function readKnowledgeTerritoryFilters(): KnowledgeTerritoryFiltersState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const data = parsed as Partial<KnowledgeTerritoryFiltersState>;
    return {
      categoryFilter:
        typeof data.categoryFilter === 'string'
          ? data.categoryFilter
          : DEFAULT_FILTERS.categoryFilter,
      moduleFilter:
        typeof data.moduleFilter === 'string' ? data.moduleFilter : DEFAULT_FILTERS.moduleFilter,
      typeFilter: isMaterialType(data.typeFilter) ? data.typeFilter : DEFAULT_FILTERS.typeFilter,
      statusFilter:
        typeof data.statusFilter === 'string' ? data.statusFilter : DEFAULT_FILTERS.statusFilter,
      search: typeof data.search === 'string' ? data.search : DEFAULT_FILTERS.search,
      searchInput:
        typeof data.searchInput === 'string' ? data.searchInput : DEFAULT_FILTERS.searchInput,
      page:
        typeof data.page === 'number' && Number.isFinite(data.page) && data.page > 0
          ? data.page
          : DEFAULT_FILTERS.page,
      favoritesOnly: data.favoritesOnly === true,
    };
  } catch {
    return null;
  }
}

export function writeKnowledgeTerritoryFilters(state: KnowledgeTerritoryFiltersState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function buildKnowledgeTerritoryUrl(state: Partial<KnowledgeTerritoryFiltersState>): string {
  const params = new URLSearchParams();
  if (state.categoryFilter) params.set('category', state.categoryFilter);
  if (state.moduleFilter) params.set('module', state.moduleFilter);
  if (state.typeFilter) params.set('type', state.typeFilter);
  if (state.statusFilter) params.set('status', state.statusFilter);
  if (state.favoritesOnly) params.set('favorites', '1');
  if (state.search?.trim()) params.set('q', state.search.trim());
  if (state.page && state.page > 1) params.set('page', String(state.page));
  const qs = params.toString();
  return qs ? `/admin/knowledge?${qs}` : '/admin/knowledge';
}

/** URL списка «Территория знаний» с сохранёнными фильтрами (для кнопки «Назад»). */
export function buildKnowledgeTerritoryBackUrl(fallbackCategoryId?: string): string {
  const saved = readKnowledgeTerritoryFilters();
  if (saved) {
    return buildKnowledgeTerritoryUrl(saved);
  }
  if (fallbackCategoryId) {
    return buildKnowledgeTerritoryUrl({ categoryFilter: fallbackCategoryId });
  }
  return '/admin/knowledge';
}

export function parseKnowledgeTerritorySearchParams(
  searchParams: URLSearchParams
): Partial<KnowledgeTerritoryFiltersState> {
  const parsed: Partial<KnowledgeTerritoryFiltersState> = {};

  const category = searchParams.get('category');
  if (category !== null) parsed.categoryFilter = category;

  const moduleId = searchParams.get('module');
  if (moduleId !== null) parsed.moduleFilter = moduleId;

  const type = searchParams.get('type');
  if (type !== null) parsed.typeFilter = isMaterialType(type) ? type : '';

  const status = searchParams.get('status');
  if (status !== null) parsed.statusFilter = status;

  const q = searchParams.get('q');
  if (q !== null) {
    parsed.search = q;
    parsed.searchInput = q;
  }

  const page = searchParams.get('page');
  if (page !== null) {
    const pageNum = Number(page);
    if (Number.isFinite(pageNum) && pageNum > 0) {
      parsed.page = pageNum;
    }
  }

  if (searchParams.get('favorites') === '1') {
    parsed.favoritesOnly = true;
  }

  return parsed;
}
