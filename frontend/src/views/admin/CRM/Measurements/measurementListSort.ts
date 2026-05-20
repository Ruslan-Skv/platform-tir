export type MeasurementListSortBy = 'receptionDate' | 'executionDate' | 'status';

export type MeasurementListSortOrder = 'asc' | 'desc';

export function parseMeasurementListSortBy(value: string): MeasurementListSortBy {
  if (value === 'executionDate') return 'executionDate';
  if (value === 'status') return 'status';
  return 'receptionDate';
}
