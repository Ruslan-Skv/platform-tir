import type { ClientDirectorySortBy, CrmCustomerEntityType } from '@/shared/api/admin-crm';

export type CustomerTypeFilter = 'all' | CrmCustomerEntityType;

export type DirectorySortOrder = 'asc' | 'desc';

export interface CustomersDirectoryListPersisted {
  search: string;
  typeFilter: CustomerTypeFilter;
  authorFilter: string;
  sortBy: ClientDirectorySortBy;
  sortOrder: DirectorySortOrder;
  page: number;
}

const STORAGE_KEY = 'admin_customers_directory_list_v1';
const LEGACY_SORT_STORAGE_KEY = 'admin_customers_directory_sort';

const TYPE_FILTER_VALUES = new Set<CustomerTypeFilter>([
  'all',
  'PERSON',
  'ENTREPRENEUR',
  'COMPANY',
]);

const EMPTY: CustomersDirectoryListPersisted = {
  search: '',
  typeFilter: 'all',
  authorFilter: '',
  sortBy: 'displayName',
  sortOrder: 'asc',
  page: 1,
};

export function parseClientDirectorySortBy(value: string): ClientDirectorySortBy {
  if (value === 'createdAt') return 'createdAt';
  if (value === 'lastMeasurementDate') return 'lastMeasurementDate';
  if (value === 'lastContractDate') return 'lastContractDate';
  return 'displayName';
}

function loadLegacySortOnly(): Pick<
  CustomersDirectoryListPersisted,
  'sortBy' | 'sortOrder'
> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LEGACY_SORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sortBy?: string; sortOrder?: string };
    return {
      sortBy: parseClientDirectorySortBy(parsed.sortBy ?? 'displayName'),
      sortOrder: parsed.sortOrder === 'desc' ? 'desc' : 'asc',
    };
  } catch {
    return null;
  }
}

function normalizePage(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function normalizePersisted(
  raw: Partial<CustomersDirectoryListPersisted> | null | undefined
): CustomersDirectoryListPersisted {
  if (!raw || typeof raw !== 'object') {
    const legacy = loadLegacySortOnly();
    return legacy ? { ...EMPTY, ...legacy } : { ...EMPTY };
  }

  const typeFilter =
    typeof raw.typeFilter === 'string' &&
    TYPE_FILTER_VALUES.has(raw.typeFilter as CustomerTypeFilter)
      ? (raw.typeFilter as CustomerTypeFilter)
      : EMPTY.typeFilter;

  const hasSortInPayload = typeof raw.sortBy === 'string';
  const legacy = !hasSortInPayload ? loadLegacySortOnly() : null;

  return {
    search: typeof raw.search === 'string' ? raw.search : '',
    typeFilter,
    authorFilter: typeof raw.authorFilter === 'string' ? raw.authorFilter : '',
    sortBy: hasSortInPayload
      ? parseClientDirectorySortBy(raw.sortBy!)
      : (legacy?.sortBy ?? EMPTY.sortBy),
    sortOrder:
      raw.sortOrder === 'asc' || raw.sortOrder === 'desc'
        ? raw.sortOrder
        : (legacy?.sortOrder ?? EMPTY.sortOrder),
    page: normalizePage(raw.page),
  };
}

let memoryCache: CustomersDirectoryListPersisted | null = null;

export function loadCustomersDirectoryListState(): CustomersDirectoryListPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    memoryCache = { ...EMPTY };
    return memoryCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = loadLegacySortOnly();
      memoryCache = legacy ? { ...EMPTY, ...legacy } : { ...EMPTY };
      return memoryCache;
    }
    memoryCache = normalizePersisted(JSON.parse(raw) as Partial<CustomersDirectoryListPersisted>);
    return memoryCache;
  } catch {
    memoryCache = { ...EMPTY };
    return memoryCache;
  }
}

export function persistCustomersDirectoryListState(state: CustomersDirectoryListPersisted): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_SORT_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
