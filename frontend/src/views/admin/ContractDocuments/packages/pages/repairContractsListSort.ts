export type RepairContractsListSortBy =
  | 'contractNumber'
  | 'date'
  | 'status'
  | 'customer'
  | 'manager'
  | 'remaining'
  | 'workStartAct'
  | 'closeAct';

export type RepairContractsListSortOrder = 'asc' | 'desc';

const SORT_BY_VALUES = new Set<RepairContractsListSortBy>([
  'contractNumber',
  'date',
  'status',
  'customer',
  'manager',
  'remaining',
  'workStartAct',
  'closeAct',
]);

export function parseRepairContractsListSortBy(value: string): RepairContractsListSortBy {
  if (SORT_BY_VALUES.has(value as RepairContractsListSortBy)) {
    return value as RepairContractsListSortBy;
  }
  return 'date';
}
