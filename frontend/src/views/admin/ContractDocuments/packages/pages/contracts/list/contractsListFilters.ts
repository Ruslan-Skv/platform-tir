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
  /** Развёрнутые объекты в режиме by_object — сохраняем между визитами страницы. */
  expandedObjectIds: string[];
  /** Текущая страница списка — сохраняем между визитами страницы. */
  page: number;
  /** Только договоры с подписанными через ЭП документами. */
  epSigned: boolean;
  /** Момент сохранения (ms) — по нему фильтры протухают (см. CONTRACTS_LIST_FILTERS_TTL_MS). */
  savedAt: number;
}

/**
 * Фильтры списка живут в localStorage ограниченное время. Скрывающие фильтры
 * (статусы, ЭП, направления, даты) не должны переживать рабочую смену: иначе
 * менеджер при застрявшем чипе (напр. «Закрытые») «теряет» созданный договор
 * «В проекте» — он не виден ни в списке, ни в поиске по номеру.
 */
const CONTRACTS_LIST_FILTERS_TTL_MS = 24 * 60 * 60 * 1000;

const CONTRACTS_LIST_FILTERS_STORAGE_KEY = 'admin_contract_documents_contracts_list_filters_v4';
/**
 * @deprecated Ключи v3/v2 больше не читаются: записи без savedAt считаются
 * протухшими — это разово сбрасывает застрявшие фильтры у всех пользователей.
 */

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
  expandedObjectIds: [],
  page: 1,
  epSigned: false,
  savedAt: 0,
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

function normalizeExpandedObjectIds(raw: unknown, legacySingle?: unknown): string[] {
  if (Array.isArray(raw)) {
    return [
      ...new Set(raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)),
    ];
  }
  // Миграция со старого формата, где развёрнут был один объект.
  if (typeof legacySingle === 'string' && legacySingle.trim()) {
    return [legacySingle];
  }
  return [];
}

function normalizePersistedFilters(
  raw:
    | (Partial<ContractsListFiltersPersisted> & {
        statusFilter?: string;
        directionFilter?: string;
        expandedObjectId?: string | null;
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
    expandedObjectIds: normalizeExpandedObjectIds(raw.expandedObjectIds, raw.expandedObjectId),
    page:
      typeof raw.page === 'number' && Number.isInteger(raw.page) && raw.page >= 1
        ? raw.page
        : EMPTY_CONTRACTS_LIST_FILTERS.page,
    epSigned: typeof raw.epSigned === 'boolean' ? raw.epSigned : false,
    savedAt:
      typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) && raw.savedAt > 0
        ? raw.savedAt
        : 0,
  };
}

let memoryCache: ContractsListFiltersPersisted | null = null;

function readFromLocalStorage(): ContractsListFiltersPersisted {
  try {
    const raw = localStorage.getItem(CONTRACTS_LIST_FILTERS_STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_CONTRACTS_LIST_FILTERS, savedAt: Date.now() };
    }
    const parsed = normalizePersistedFilters(
      JSON.parse(raw) as Partial<ContractsListFiltersPersisted>
    );
    // Протухшие фильтры (или запись старого формата без savedAt) — дефолты:
    // scopeTouched=false, поэтому дефолты роли применятся заново.
    if (Date.now() - parsed.savedAt > CONTRACTS_LIST_FILTERS_TTL_MS) {
      return { ...EMPTY_CONTRACTS_LIST_FILTERS, savedAt: Date.now() };
    }
    return parsed;
  } catch {
    return { ...EMPTY_CONTRACTS_LIST_FILTERS, savedAt: Date.now() };
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
  memoryCache = { ...state, savedAt: Date.now() };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CONTRACTS_LIST_FILTERS_STORAGE_KEY,
      JSON.stringify({ ...state, savedAt: Date.now() })
    );
  } catch {
    /* ignore quota / private mode */
  }
}
