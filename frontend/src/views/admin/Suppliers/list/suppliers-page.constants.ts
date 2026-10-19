export const SUPPLIERS_PAGE_FILTERS_STORAGE_KEY = 'admin_suppliers_page_filters_v1';

export const SUPPLIERS_PAGE_LIMIT_OPTIONS = [20, 50, 100] as const;

export type SuppliersPageLimit = (typeof SUPPLIERS_PAGE_LIMIT_OPTIONS)[number];

export const DEFAULT_SUPPLIERS_PAGE_LIMIT: SuppliersPageLimit = 50;

/** Чипы статуса расчётов — как вкладка «Итого» таблицы, только с фильтрами. */
export const SUPPLIER_STATUS_CHIPS = [
  { value: 'ALL', label: 'Все' },
  { value: 'PAYABLE', label: 'К оплате' },
  { value: 'SETTLED', label: 'Без задолженности' },
  { value: 'OVERPAY', label: 'Переплата' },
] as const;

export type SupplierStatusFilter = (typeof SUPPLIER_STATUS_CHIPS)[number]['value'];

/** Колонки с серверной сортировкой. */
export type SupplierSortField = 'name' | 'balance' | 'lastEntry';

export const SUPPLIER_SORT_OPTIONS: { value: SupplierSortField; label: string }[] = [
  { value: 'name', label: 'По названию' },
  { value: 'balance', label: 'По сальдо к оплате' },
  { value: 'lastEntry', label: 'По последней записи' },
];
