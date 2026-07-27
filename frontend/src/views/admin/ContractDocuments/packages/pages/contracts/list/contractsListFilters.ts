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

/** Очередь списка: мои пакеты / пакеты моих направлений / всё. */
export type ContractsListScope = 'mine' | 'my_directions' | 'all';

export interface ContractsListFiltersPersisted {
  search: string;
  managerFilter: string;
  /** Мультивыбор статусов пайплайна; пусто = все. */
  statusFilters: string[];
  /** Мультивыбор CRM-направлений; пусто = все (в рамках scope). */
  directionFilters: string[];
  listScope: ContractsListScope;
  /** false → один раз применить дефолты по роли текущего пользователя. */
  scopeTouched: boolean;
  dateFrom: string;
  dateTo: string;
  sortBy: ContractsListSortBy;
  sortOrder: ContractsListSortOrder;
  pageLimit: ContractsPageLimit;
  listViewMode: ContractsListViewMode;
}

const CONTRACTS_LIST_FILTERS_STORAGE_KEY = 'admin_contract_documents_contracts_list_filters_v3';
/** @deprecated */
const CONTRACTS_LIST_FILTERS_STORAGE_KEY_V2 = 'admin_repair_contracts_list_filters_v2';

export const EMPTY_CONTRACTS_LIST_FILTERS: ContractsListFiltersPersisted = {
  search: '',
  managerFilter: '',
  statusFilters: [],
  directionFilters: [],
  listScope: 'all',
  scopeTouched: false,
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
  return EMPTY_CONTRACTS_LIST_FILTERS.pageLimit;
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

const LIST_SCOPE_VALUES = new Set<ContractsListScope>(['mine', 'my_directions', 'all']);

function normalizeStatusFilters(raw: unknown, legacySingle?: unknown): string[] {
  if (Array.isArray(raw)) {
    return [
      ...new Set(
        raw.filter(
          (v): v is string => typeof v === 'string' && PIPELINE_STATUS_FILTER_VALUES.has(v)
        )
      ),
    ];
  }
  if (
    typeof legacySingle === 'string' &&
    legacySingle &&
    PIPELINE_STATUS_FILTER_VALUES.has(legacySingle)
  ) {
    return [legacySingle];
  }
  return [];
}

function normalizeDirectionFilters(raw: unknown, legacySingle?: unknown): string[] {
  if (Array.isArray(raw)) {
    return [
      ...new Set(raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)),
    ];
  }
  if (typeof legacySingle === 'string' && legacySingle.trim()) {
    return [legacySingle.trim()];
  }
  return [];
}

function normalizePersistedFilters(
  raw:
    | (Partial<ContractsListFiltersPersisted> & {
        statusFilter?: string;
        directionFilter?: string;
      })
    | null
    | undefined
): ContractsListFiltersPersisted {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_CONTRACTS_LIST_FILTERS };
  const hasSortInPayload = typeof raw.sortBy === 'string';
  const listScope =
    typeof raw.listScope === 'string' && LIST_SCOPE_VALUES.has(raw.listScope as ContractsListScope)
      ? (raw.listScope as ContractsListScope)
      : EMPTY_CONTRACTS_LIST_FILTERS.listScope;
  return {
    search: typeof raw.search === 'string' ? raw.search : '',
    managerFilter: typeof raw.managerFilter === 'string' ? raw.managerFilter : '',
    statusFilters: normalizeStatusFilters(raw.statusFilters, raw.statusFilter),
    directionFilters: normalizeDirectionFilters(raw.directionFilters, raw.directionFilter),
    listScope,
    scopeTouched: typeof raw.scopeTouched === 'boolean' ? raw.scopeTouched : listScope !== 'all',
    dateFrom: typeof raw.dateFrom === 'string' ? raw.dateFrom : '',
    dateTo: typeof raw.dateTo === 'string' ? raw.dateTo : '',
    sortBy: hasSortInPayload
      ? parseContractsListSortBy(raw.sortBy!)
      : EMPTY_CONTRACTS_LIST_FILTERS.sortBy,
    sortOrder:
      raw.sortOrder === 'asc' || raw.sortOrder === 'desc'
        ? raw.sortOrder
        : EMPTY_CONTRACTS_LIST_FILTERS.sortOrder,
    pageLimit:
      raw.pageLimit != null
        ? normalizePageLimit(raw.pageLimit)
        : (readLegacyPageLimit() ?? EMPTY_CONTRACTS_LIST_FILTERS.pageLimit),
    listViewMode:
      raw.listViewMode === 'flat' || raw.listViewMode === 'by_object'
        ? raw.listViewMode
        : EMPTY_CONTRACTS_LIST_FILTERS.listViewMode,
  };
}

let memoryCache: ContractsListFiltersPersisted | null = null;

function readFromLocalStorage(): ContractsListFiltersPersisted {
  try {
    const rawV3 = localStorage.getItem(CONTRACTS_LIST_FILTERS_STORAGE_KEY);
    if (rawV3) {
      return normalizePersistedFilters(JSON.parse(rawV3) as Partial<ContractsListFiltersPersisted>);
    }
    const rawV2 = localStorage.getItem(CONTRACTS_LIST_FILTERS_STORAGE_KEY_V2);
    if (rawV2) {
      const migrated = normalizePersistedFilters(
        JSON.parse(rawV2) as Partial<ContractsListFiltersPersisted> & {
          statusFilter?: string;
          directionFilter?: string;
        }
      );
      // Миграция с v2: не затираем привычные фильтры ролевым дефолтом.
      migrated.scopeTouched = true;
      migrated.listScope = 'all';
      return migrated;
    }
    return { ...EMPTY_CONTRACTS_LIST_FILTERS };
  } catch {
    return { ...EMPTY_CONTRACTS_LIST_FILTERS };
  }
}

export function loadContractsListFilters(): ContractsListFiltersPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    return { ...EMPTY_CONTRACTS_LIST_FILTERS };
  }
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

/** Перечитать localStorage (после SSR / навигации) и обновить кэш. */
export function reloadContractsListFiltersFromStorage(): ContractsListFiltersPersisted {
  if (typeof window === 'undefined') return { ...EMPTY_CONTRACTS_LIST_FILTERS };
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
