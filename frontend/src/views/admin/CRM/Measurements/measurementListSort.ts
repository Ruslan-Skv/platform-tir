export type MeasurementListSortBy = 'receptionDate' | 'executionDate' | 'status';

export type MeasurementListSortOrder = 'asc' | 'desc';

const MEASUREMENT_LIST_SORT_STORAGE_KEY = 'admin_measurements_list_sort';

export function parseMeasurementListSortBy(value: string): MeasurementListSortBy {
  if (value === 'executionDate') return 'executionDate';
  if (value === 'status') return 'status';
  return 'receptionDate';
}

export function loadMeasurementListSort(): {
  sortBy: MeasurementListSortBy;
  sortOrder: MeasurementListSortOrder;
} {
  if (typeof window === 'undefined') {
    return { sortBy: 'receptionDate', sortOrder: 'desc' };
  }
  try {
    const raw = localStorage.getItem(MEASUREMENT_LIST_SORT_STORAGE_KEY);
    if (!raw) return { sortBy: 'receptionDate', sortOrder: 'desc' };
    const parsed = JSON.parse(raw) as { sortBy?: string; sortOrder?: string };
    return {
      sortBy: parseMeasurementListSortBy(parsed.sortBy ?? 'receptionDate'),
      sortOrder: parsed.sortOrder === 'asc' ? 'asc' : 'desc',
    };
  } catch {
    return { sortBy: 'receptionDate', sortOrder: 'desc' };
  }
}

export function persistMeasurementListSort(
  sortBy: MeasurementListSortBy,
  sortOrder: MeasurementListSortOrder
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MEASUREMENT_LIST_SORT_STORAGE_KEY, JSON.stringify({ sortBy, sortOrder }));
  } catch {
    /* ignore */
  }
}
