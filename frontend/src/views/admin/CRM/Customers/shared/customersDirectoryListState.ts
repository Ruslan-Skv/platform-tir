import type { ClientDirectorySortBy, CrmCustomerEntityType } from '@/shared/api/admin-crm';

import type { CustomersListScope } from './customersListScope';

export type CustomerTypeFilter = 'all' | CrmCustomerEntityType;

export type DirectorySortOrder = 'asc' | 'desc';

export const CUSTOMERS_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type CustomersPageLimit = (typeof CUSTOMERS_PAGE_LIMIT_OPTIONS)[number];

export interface CustomersDirectoryListPersisted {
  search: string;
  typeFilter: CustomerTypeFilter;
  authorFilter: string;
  sortBy: ClientDirectorySortBy;
  sortOrder: DirectorySortOrder;
  page: number;
  pageLimit: CustomersPageLimit;
  listScope: CustomersListScope;
  /** Пользователь сам менял область — не перезаписывать ролевым дефолтом. */
  scopeTouched: boolean;
}

const STORAGE_KEY = 'admin_customers_directory_list_v2';
const LEGACY_STORAGE_KEY = 'admin_customers_directory_list_v1';
const LEGACY_SORT_STORAGE_KEY = 'admin_customers_directory_sort';

const TYPE_FILTER_VALUES = new Set<CustomerTypeFilter>([
  'all',
  'PERSON',
  'ENTREPRENEUR',
  'COMPANY',
]);

const LIST_SCOPE_VALUES = new Set<CustomersListScope>(['mine', 'all']);

const EMPTY: CustomersDirectoryListPersisted = {
  search: '',
  typeFilter: 'all',
  authorFilter: '',
  sortBy: 'displayName',
  sortOrder: 'asc',
  page: 1,
  pageLimit: 20,
  listScope: 'all',
  scopeTouched: false,
};

function normalizePageLimit(raw: unknown): CustomersPageLimit {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (CUSTOMERS_PAGE_LIMIT_OPTIONS.includes(n as CustomersPageLimit)) {
    return n as CustomersPageLimit;
  }
  if (n === 25) return 20;
  return EMPTY.pageLimit;
}

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

  const listScope =
    typeof raw.listScope === 'string' && LIST_SCOPE_VALUES.has(raw.listScope as CustomersListScope)
      ? (raw.listScope as CustomersListScope)
      : EMPTY.listScope;

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
    pageLimit: normalizePageLimit(raw.pageLimit),
    listScope,
    scopeTouched: raw.scopeTouched === true,
  };
}

let memoryCache: CustomersDirectoryListPersisted | null = null;

function readFromLocalStorage(): CustomersDirectoryListPersisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizePersisted(JSON.parse(raw) as Partial<CustomersDirectoryListPersisted>);
    }
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const migrated = normalizePersisted(
        JSON.parse(legacyRaw) as Partial<CustomersDirectoryListPersisted>
      );
      // v1 не знал scope — даём ролевому дефолту сработать, если автор не выбран вручную
      if (migrated.authorFilter) {
        return { ...migrated, listScope: 'all', scopeTouched: true };
      }
      return { ...migrated, listScope: 'all', scopeTouched: false };
    }
    const legacy = loadLegacySortOnly();
    return legacy ? { ...EMPTY, ...legacy } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function loadCustomersDirectoryListState(): CustomersDirectoryListPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    memoryCache = { ...EMPTY };
    return memoryCache;
  }
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

/** Перечитать localStorage после SSR / навигации. */
export function reloadCustomersDirectoryListStateFromStorage(): CustomersDirectoryListPersisted {
  if (typeof window === 'undefined') return { ...EMPTY };
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

export function persistCustomersDirectoryListState(state: CustomersDirectoryListPersisted): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_SORT_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
