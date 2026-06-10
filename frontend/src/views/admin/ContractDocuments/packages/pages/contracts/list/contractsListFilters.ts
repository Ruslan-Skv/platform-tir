import {
  type ContractsListSortBy,
  type ContractsListSortOrder,
  parseContractsListSortBy,
} from './contractsListSort';

/** Сохранённые фильтры и сортировка списка договоров (/admin/contract-documents/contracts). */

export const CONTRACTS_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type ContractsPageLimit = (typeof CONTRACTS_PAGE_LIMIT_OPTIONS)[number];

/** @deprecated Старый ключ localStorage; читается при миграции pageLimit. */
const CONTRACTS_PAGE_LIMIT_LEGACY_KEY = 'admin_repair_contracts_page_limit';

export type ContractsListViewMode = 'flat' | 'by_object';

export interface ContractsListFiltersPersisted {
  search: string;
  managerFilter: string;
  statusFilter: string;
  directionFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: ContractsListSortBy;
  sortOrder: ContractsListSortOrder;
  pageLimit: ContractsPageLimit;
  listViewMode: ContractsListViewMode;
}

/** Ключ localStorage (исторически repair_* — не менять без миграции). */
const CONTRACTS_LIST_FILTERS_STORAGE_KEY = 'admin_repair_contracts_list_filters_v2';

const EMPTY_FILTERS: ContractsListFiltersPersisted = {
  search: '',
  managerFilter: '',
  statusFilter: '',
  directionFilter: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date',
  sortOrder: 'desc',
  pageLimit: 20,
  listViewMode: 'by_object',
};

function normalizePageLimit(raw: unknown): ContractsPageLimit {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (CONTRACTS_PAGE_LIMIT_OPTIONS.includes(n as ContractsPageLimit)) {
    return n as ContractsPageLimit;
  }
  return EMPTY_FILTERS.pageLimit;
}

function readLegacyPageLimit(): ContractsPageLimit | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONTRACTS_PAGE_LIMIT_LEGACY_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return CONTRACTS_PAGE_LIMIT_OPTIONS.includes(parsed as ContractsPageLimit)
      ? (parsed as ContractsPageLimit)
      : null;
  } catch {
    return null;
  }
}

const PIPELINE_STATUS_FILTER_VALUES = new Set([
  'IN_PROJECT',
  'SIGNED',
  'WORK_IN_PROGRESS',
  'CLOSED',
  'REFUSED',
]);

function normalizePersistedFilters(
  raw: Partial<ContractsListFiltersPersisted> | null | undefined
): ContractsListFiltersPersisted {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FILTERS };
  const status =
    typeof raw.statusFilter === 'string' &&
    (raw.statusFilter === '' || PIPELINE_STATUS_FILTER_VALUES.has(raw.statusFilter))
      ? raw.statusFilter
      : '';
  const hasSortInPayload = typeof raw.sortBy === 'string';
  return {
    search: typeof raw.search === 'string' ? raw.search : '',
    managerFilter: typeof raw.managerFilter === 'string' ? raw.managerFilter : '',
    statusFilter: status,
    directionFilter: typeof raw.directionFilter === 'string' ? raw.directionFilter : '',
    dateFrom: typeof raw.dateFrom === 'string' ? raw.dateFrom : '',
    dateTo: typeof raw.dateTo === 'string' ? raw.dateTo : '',
    sortBy: hasSortInPayload ? parseContractsListSortBy(raw.sortBy!) : EMPTY_FILTERS.sortBy,
    sortOrder:
      raw.sortOrder === 'asc' || raw.sortOrder === 'desc' ? raw.sortOrder : EMPTY_FILTERS.sortOrder,
    pageLimit:
      raw.pageLimit != null
        ? normalizePageLimit(raw.pageLimit)
        : (readLegacyPageLimit() ?? EMPTY_FILTERS.pageLimit),
    listViewMode:
      raw.listViewMode === 'flat' || raw.listViewMode === 'by_object'
        ? raw.listViewMode
        : EMPTY_FILTERS.listViewMode,
  };
}

let memoryCache: ContractsListFiltersPersisted | null = null;

function readFromLocalStorage(): ContractsListFiltersPersisted {
  try {
    const raw = localStorage.getItem(CONTRACTS_LIST_FILTERS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_FILTERS };
    return normalizePersistedFilters(JSON.parse(raw) as Partial<ContractsListFiltersPersisted>);
  } catch {
    return { ...EMPTY_FILTERS };
  }
}

export function loadContractsListFilters(): ContractsListFiltersPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    return { ...EMPTY_FILTERS };
  }
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

/** Перечитать localStorage (после SSR / навигации) и обновить кэш. */
export function reloadContractsListFiltersFromStorage(): ContractsListFiltersPersisted {
  if (typeof window === 'undefined') return { ...EMPTY_FILTERS };
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

export function persistContractsListFilters(state: ContractsListFiltersPersisted): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONTRACTS_LIST_FILTERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}
