export type OrdersListSortBy =
  | 'orderNumber'
  | 'manager'
  | 'customer'
  | 'status'
  | 'payment'
  | 'total'
  | 'createdAt';

export type OrdersListSortOrder = 'asc' | 'desc';

export type OrdersListSortPersisted = {
  sortBy: OrdersListSortBy;
  sortOrder: OrdersListSortOrder;
};

const STORAGE_KEY = 'admin_orders_list_sort_v1';

const EMPTY: OrdersListSortPersisted = {
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const SORT_BY_VALUES = new Set<OrdersListSortBy>([
  'orderNumber',
  'manager',
  'customer',
  'status',
  'payment',
  'total',
  'createdAt',
]);

export function parseOrdersListSortBy(value: string): OrdersListSortBy {
  return SORT_BY_VALUES.has(value as OrdersListSortBy) ? (value as OrdersListSortBy) : EMPTY.sortBy;
}

function normalize(
  raw: Partial<OrdersListSortPersisted> | null | undefined
): OrdersListSortPersisted {
  if (!raw || typeof raw !== 'object') return { ...EMPTY };
  return {
    sortBy: typeof raw.sortBy === 'string' ? parseOrdersListSortBy(raw.sortBy) : EMPTY.sortBy,
    sortOrder:
      raw.sortOrder === 'asc' || raw.sortOrder === 'desc' ? raw.sortOrder : EMPTY.sortOrder,
  };
}

let memoryCache: OrdersListSortPersisted | null = null;

function readFromLocalStorage(): OrdersListSortPersisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    return normalize(JSON.parse(raw) as Partial<OrdersListSortPersisted>);
  } catch {
    return { ...EMPTY };
  }
}

export function loadOrdersListSort(): OrdersListSortPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    memoryCache = { ...EMPTY };
    return memoryCache;
  }
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

export function persistOrdersListSort(next: OrdersListSortPersisted): void {
  const normalized = normalize(next);
  memoryCache = normalized;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore quota / private mode
  }
}
