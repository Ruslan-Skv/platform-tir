export type EstimatesListSortBy = 'date' | 'binding';

export type EstimatesListSortOrder = 'asc' | 'desc';

const SORT_BY_VALUES = new Set<EstimatesListSortBy>(['date', 'binding']);

export function parseEstimatesListSortBy(value: string): EstimatesListSortBy {
  if (SORT_BY_VALUES.has(value as EstimatesListSortBy)) {
    return value as EstimatesListSortBy;
  }
  return 'date';
}

export function parseEstimatesListSortOrder(value: string): EstimatesListSortOrder {
  return value === 'asc' ? 'asc' : 'desc';
}
