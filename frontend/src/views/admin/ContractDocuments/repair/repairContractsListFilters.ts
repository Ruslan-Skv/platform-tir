import {
  type RepairContractsListSortBy,
  type RepairContractsListSortOrder,
  parseRepairContractsListSortBy,
} from './repairContractsListSort';

/** Сохранённые фильтры и сортировка списка договоров ремонта (/admin/contract-documents/contracts). */

export interface RepairContractsListFiltersPersisted {
  search: string;
  managerFilter: string;
  statusFilter: string;
  directionFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: RepairContractsListSortBy;
  sortOrder: RepairContractsListSortOrder;
}
const REPAIR_CONTRACTS_LIST_FILTERS_STORAGE_KEY = 'admin_repair_contracts_list_filters_v1';

const EMPTY_FILTERS: RepairContractsListFiltersPersisted = {
  search: '',
  managerFilter: '',
  statusFilter: '',
  directionFilter: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date',
  sortOrder: 'desc',
};

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
