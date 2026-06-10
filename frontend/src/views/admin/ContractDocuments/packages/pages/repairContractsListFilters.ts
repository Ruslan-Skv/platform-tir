import {
  type RepairContractsListSortBy,
  type RepairContractsListSortOrder,
  parseRepairContractsListSortBy,
} from './repairContractsListSort';

/** Сохранённые фильтры и сортировка списка договоров ремонта (/admin/contract-documents/contracts). */

export const REPAIR_CONTRACTS_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type RepairContractsPageLimit = (typeof REPAIR_CONTRACTS_PAGE_LIMIT_OPTIONS)[number];

const REPAIR_CONTRACTS_PAGE_LIMIT_LEGACY_KEY = 'admin_repair_contracts_page_limit';

export type ContractsListViewMode = 'flat' | 'by_object';

export interface RepairContractsListFiltersPersisted {
  search: string;
  managerFilter: string;
  statusFilter: string;
  directionFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: RepairContractsListSortBy;
  sortOrder: RepairContractsListSortOrder;
  pageLimit: RepairContractsPageLimit;
  listViewMode: ContractsListViewMode;
}
const REPAIR_CONTRACTS_LIST_FILTERS_STORAGE_KEY = 'admin_repair_contracts_list_filters_v2';

const EMPTY_FILTERS: RepairContractsListFiltersPersisted = {
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

function normalizePageLimit(raw: unknown): RepairContractsPageLimit {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (REPAIR_CONTRACTS_PAGE_LIMIT_OPTIONS.includes(n as RepairContractsPageLimit)) {
    return n as RepairContractsPageLimit;
  }
  return EMPTY_FILTERS.pageLimit;
}

function readLegacyPageLimit(): RepairContractsPageLimit | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(REPAIR_CONTRACTS_PAGE_LIMIT_LEGACY_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return REPAIR_CONTRACTS_PAGE_LIMIT_OPTIONS.includes(parsed as RepairContractsPageLimit)
      ? (parsed as RepairContractsPageLimit)
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
  raw: Partial<RepairContractsListFiltersPersisted> | null | undefined
): RepairContractsListFiltersPersisted {
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
    sortBy: hasSortInPayload ? parseRepairContractsListSortBy(raw.sortBy!) : EMPTY_FILTERS.sortBy,
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

let memoryCache: RepairContractsListFiltersPersisted | null = null;

function readFromLocalStorage(): RepairContractsListFiltersPersisted {
  try {
    const raw = localStorage.getItem(REPAIR_CONTRACTS_LIST_FILTERS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_FILTERS };
    return normalizePersistedFilters(
      JSON.parse(raw) as Partial<RepairContractsListFiltersPersisted>
    );
  } catch {
    return { ...EMPTY_FILTERS };
  }
}

export function loadRepairContractsListFilters(): RepairContractsListFiltersPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    return { ...EMPTY_FILTERS };
  }
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

/** Перечитать localStorage (после SSR / навигации) и обновить кэш. */
export function reloadRepairContractsListFiltersFromStorage(): RepairContractsListFiltersPersisted {
  if (typeof window === 'undefined') return { ...EMPTY_FILTERS };
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

export function persistRepairContractsListFilters(
  state: RepairContractsListFiltersPersisted
): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(REPAIR_CONTRACTS_LIST_FILTERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}
