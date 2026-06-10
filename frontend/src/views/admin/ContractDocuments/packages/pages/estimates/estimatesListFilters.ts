/** Сохранённый фильтр списка расчётов (/admin/contract-documents/estimates). */
import {
  REPAIR_CONTRACTS_PAGE_LIMIT_OPTIONS,
  type RepairContractsPageLimit,
} from '../repairContractsListFilters';
import {
  type EstimatesListSortBy,
  type EstimatesListSortOrder,
  parseEstimatesListSortBy,
  parseEstimatesListSortOrder,
} from './estimatesListSort';

export type EstimatesListViewMode = 'flat' | 'by_object';

export type EstimatesPageLimit = RepairContractsPageLimit;

export const ESTIMATES_PAGE_LIMIT_OPTIONS = REPAIR_CONTRACTS_PAGE_LIMIT_OPTIONS;

export interface EstimatesListFiltersPersisted {
  search: string;
  managerFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: EstimatesListSortBy;
  sortOrder: EstimatesListSortOrder;
  pageLimit: EstimatesPageLimit;
  listViewMode: EstimatesListViewMode;
  /** Раскрытый блок объекта в режиме «По объектам» (`estimateObjectAddressKey`). */
  expandedAddressKey: string | null;
}

const ESTIMATES_LIST_FILTERS_STORAGE_KEY = 'admin_estimates_list_filters_v6';

const EMPTY_FILTERS: EstimatesListFiltersPersisted = {
  search: '',
  managerFilter: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date',
  sortOrder: 'desc',
  pageLimit: 20,
  listViewMode: 'by_object',
  expandedAddressKey: null,
};

function normalizeExpandedAddressKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return t.length > 0 ? t : null;
}

function normalizeListViewMode(raw: unknown): EstimatesListViewMode {
  return raw === 'flat' || raw === 'by_object' ? raw : EMPTY_FILTERS.listViewMode;
}

function normalizePageLimit(raw: unknown): EstimatesPageLimit {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (ESTIMATES_PAGE_LIMIT_OPTIONS.includes(n as EstimatesPageLimit)) {
    return n as EstimatesPageLimit;
  }
  return EMPTY_FILTERS.pageLimit;
}

function normalizePersistedFilters(
  raw: Partial<EstimatesListFiltersPersisted> | null | undefined
): EstimatesListFiltersPersisted {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FILTERS };
  return {
    search: typeof raw.search === 'string' ? raw.search : '',
    managerFilter: typeof raw.managerFilter === 'string' ? raw.managerFilter : '',
    dateFrom: typeof raw.dateFrom === 'string' ? raw.dateFrom : '',
    dateTo: typeof raw.dateTo === 'string' ? raw.dateTo : '',
    sortBy:
      typeof raw.sortBy === 'string' ? parseEstimatesListSortBy(raw.sortBy) : EMPTY_FILTERS.sortBy,
    sortOrder:
      typeof raw.sortOrder === 'string'
        ? parseEstimatesListSortOrder(raw.sortOrder)
        : EMPTY_FILTERS.sortOrder,
    pageLimit: raw.pageLimit != null ? normalizePageLimit(raw.pageLimit) : EMPTY_FILTERS.pageLimit,
    listViewMode: normalizeListViewMode(raw.listViewMode),
    expandedAddressKey: normalizeExpandedAddressKey(raw.expandedAddressKey),
  };
}

let memoryCache: EstimatesListFiltersPersisted | null = null;

function readFromLocalStorage(): EstimatesListFiltersPersisted {
  try {
    const raw = localStorage.getItem(ESTIMATES_LIST_FILTERS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_FILTERS };
    return normalizePersistedFilters(JSON.parse(raw) as Partial<EstimatesListFiltersPersisted>);
  } catch {
    return { ...EMPTY_FILTERS };
  }
}

export function loadEstimatesListFilters(): EstimatesListFiltersPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    return { ...EMPTY_FILTERS };
  }
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

export function reloadEstimatesListFiltersFromStorage(): EstimatesListFiltersPersisted {
  if (typeof window === 'undefined') return { ...EMPTY_FILTERS };
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

export function persistEstimatesListFilters(state: EstimatesListFiltersPersisted): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ESTIMATES_LIST_FILTERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
