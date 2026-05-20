import {
  type MeasurementListSortBy,
  type MeasurementListSortOrder,
  parseMeasurementListSortBy,
} from './measurementListSort';
import { MEASUREMENT_STATUS_OPTIONS } from './measurementStatuses';

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
}

const MEASUREMENTS_LIST_FILTERS_STORAGE_KEY = 'admin_measurements_list_filters_v1';
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
};

const STATUS_FILTER_VALUES = new Set<string>([
  '',
  ...MEASUREMENT_STATUS_OPTIONS.map((o) => o.value),
]);

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
  };
}

let memoryCache: MeasurementsListFiltersPersisted | null = null;

export function loadMeasurementsListFilters(): MeasurementsListFiltersPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    memoryCache = { ...EMPTY_FILTERS };
    return memoryCache;
  }
  try {
    const raw = localStorage.getItem(MEASUREMENTS_LIST_FILTERS_STORAGE_KEY);
    if (!raw) {
      const legacy = loadLegacySortOnly();
      memoryCache = legacy ? { ...EMPTY_FILTERS, ...legacy } : { ...EMPTY_FILTERS };
      return memoryCache;
    }
    memoryCache = normalizePersistedFilters(
      JSON.parse(raw) as Partial<MeasurementsListFiltersPersisted>
    );
    return memoryCache;
  } catch {
    memoryCache = { ...EMPTY_FILTERS };
    return memoryCache;
  }
}

export function persistMeasurementsListFilters(state: MeasurementsListFiltersPersisted): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MEASUREMENTS_LIST_FILTERS_STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(MEASUREMENTS_LIST_SORT_LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
