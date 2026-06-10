export type ContractsListSortBy =
  | 'contractNumber'
  | 'date'
  | 'status'
  | 'customer'
  | 'manager'
  | 'remaining'
  | 'workStartAct'
  | 'closeAct';

export type ContractsListSortOrder = 'asc' | 'desc';

const SORT_BY_VALUES = new Set<ContractsListSortBy>([
  'contractNumber',
  'date',
  'status',
  'customer',
  'manager',
  'remaining',
  'workStartAct',
  'closeAct',
]);

export function parseContractsListSortBy(value: string): ContractsListSortBy {
  if (SORT_BY_VALUES.has(value as ContractsListSortBy)) {
    return value as ContractsListSortBy;
  }
  return 'date';
}
