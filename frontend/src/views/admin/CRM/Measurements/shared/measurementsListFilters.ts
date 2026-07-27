import {
  type MeasurementListSortBy,
  type MeasurementListSortOrder,
  parseMeasurementListSortBy,
} from './measurementListSort';
import { MEASUREMENT_STATUS_OPTIONS } from './measurementStatuses';
import type { MeasurementsListScope } from './measurementsListScope';

export type { MeasurementsListScope } from './measurementsListScope';

export const MEASUREMENTS_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type MeasurementsPageLimit = (typeof MEASUREMENTS_PAGE_LIMIT_OPTIONS)[number];

/** Сохранённые фильтры и сортировка списка замеров (/admin/measurements). */
export interface MeasurementsListFiltersPersisted {
  search: string;
  managerFilter: string;
  statusFilter: string;
  directionFilter: string;
  dateFrom: string;
  dateTo: string;
  sortBy: MeasurementListSortBy;
  sortOrder: MeasurementListSortOrder;
  page: number;
  pageLimit: MeasurementsPageLimit;
  listScope: MeasurementsListScope;
  /** false → один раз применить дефолты по роли. */
  scopeTouched: boolean;
}

const MEASUREMENTS_LIST_FILTERS_STORAGE_KEY = 'admin_measurements_list_filters_v2';
const MEASUREMENTS_LIST_SORT_LEGACY_STORAGE_KEY = 'admin_measurements_list_sort';

const EMPTY_FILTERS: MeasurementsListFiltersPersisted = {
  search: '',
  managerFilter: '',
  statusFilter: '',
  directionFilter: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'receptionDate',
  sortOrder: 'desc',
  page: 1,
  pageLimit: 20,
  listScope: 'all',
  scopeTouched: false,
};

function normalizePage(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function normalizePageLimit(raw: unknown): MeasurementsPageLimit {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (MEASUREMENTS_PAGE_LIMIT_OPTIONS.includes(n as MeasurementsPageLimit)) {
    return n as MeasurementsPageLimit;
  }
  return EMPTY_FILTERS.pageLimit;
}

const STATUS_FILTER_VALUES = new Set<string>([
  '',
  ...MEASUREMENT_STATUS_OPTIONS.map((o) => o.value),
]);

const LIST_SCOPE_VALUES = new Set<MeasurementsListScope>(['mine', 'my_directions', 'all']);

function normalizeListScope(raw: unknown): MeasurementsListScope {
  return typeof raw === 'string' && LIST_SCOPE_VALUES.has(raw as MeasurementsListScope)
    ? (raw as MeasurementsListScope)
    : EMPTY_FILTERS.listScope;
}

function loadLegacySortOnly(): Pick<
  MeasurementsListFiltersPersisted,
  'sortBy' | 'sortOrder'
> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(MEASUREMENTS_LIST_SORT_LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sortBy?: string; sortOrder?: string };
    return {
      sortBy: parseMeasurementListSortBy(parsed.sortBy ?? 'receptionDate'),
      sortOrder: parsed.sortOrder === 'asc' ? 'asc' : 'desc',
    };
  } catch {
    return null;
  }
}

function normalizePersistedFilters(
  raw: Partial<MeasurementsListFiltersPersisted> | null | undefined
): MeasurementsListFiltersPersisted {
  if (!raw || typeof raw !== 'object') {
    const legacy = loadLegacySortOnly();
    return legacy ? { ...EMPTY_FILTERS, ...legacy } : { ...EMPTY_FILTERS };
  }

  const status =
    typeof raw.statusFilter === 'string' && STATUS_FILTER_VALUES.has(raw.statusFilter)
      ? raw.statusFilter
      : '';

  const hasSortInPayload = typeof raw.sortBy === 'string';
  const legacy = !hasSortInPayload ? loadLegacySortOnly() : null;
  const listScope = normalizeListScope(raw.listScope);

  return {
    search: typeof raw.search === 'string' ? raw.search : '',
    managerFilter: typeof raw.managerFilter === 'string' ? raw.managerFilter : '',
    statusFilter: status,
    directionFilter: typeof raw.directionFilter === 'string' ? raw.directionFilter : '',
    dateFrom: typeof raw.dateFrom === 'string' ? raw.dateFrom : '',
    dateTo: typeof raw.dateTo === 'string' ? raw.dateTo : '',
    sortBy: hasSortInPayload
      ? parseMeasurementListSortBy(raw.sortBy!)
      : (legacy?.sortBy ?? EMPTY_FILTERS.sortBy),
    sortOrder:
      raw.sortOrder === 'asc' || raw.sortOrder === 'desc'
        ? raw.sortOrder
        : (legacy?.sortOrder ?? EMPTY_FILTERS.sortOrder),
    page: normalizePage(raw.page),
    pageLimit: normalizePageLimit(raw.pageLimit),
    listScope,
    scopeTouched: raw.scopeTouched === true,
  };
}

let memoryCache: MeasurementsListFiltersPersisted | null = null;

function readFromLocalStorage(): MeasurementsListFiltersPersisted {
  try {
    const raw = localStorage.getItem(MEASUREMENTS_LIST_FILTERS_STORAGE_KEY);
    if (!raw) {
      // Миграция со старого ключа v1
      const legacyV1 = localStorage.getItem('admin_measurements_list_filters_v1');
      if (legacyV1) {
        const migrated = normalizePersistedFilters(
          JSON.parse(legacyV1) as Partial<MeasurementsListFiltersPersisted>
        );
        return migrated;
      }
      const legacy = loadLegacySortOnly();
      return legacy ? { ...EMPTY_FILTERS, ...legacy } : { ...EMPTY_FILTERS };
    }
    return normalizePersistedFilters(JSON.parse(raw) as Partial<MeasurementsListFiltersPersisted>);
  } catch {
    return { ...EMPTY_FILTERS };
  }
}

export function loadMeasurementsListFilters(): MeasurementsListFiltersPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    memoryCache = { ...EMPTY_FILTERS };
    return memoryCache;
  }
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

/** Перечитать localStorage после SSR / навигации. */
export function reloadMeasurementsListFiltersFromStorage(): MeasurementsListFiltersPersisted {
  if (typeof window === 'undefined') return { ...EMPTY_FILTERS };
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

export function persistMeasurementsListFilters(state: MeasurementsListFiltersPersisted): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MEASUREMENTS_LIST_FILTERS_STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(MEASUREMENTS_LIST_SORT_LEGACY_STORAGE_KEY);
    localStorage.removeItem('admin_measurements_list_filters_v1');
  } catch {
    /* ignore quota / private mode */
  }
}
