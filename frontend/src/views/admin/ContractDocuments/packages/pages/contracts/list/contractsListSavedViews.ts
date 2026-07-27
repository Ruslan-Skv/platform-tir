import {
  type ContractsListFiltersPersisted,
  EMPTY_CONTRACTS_LIST_FILTERS,
} from './contractsListFilters';

export type ContractsListSavedView = {
  id: string;
  title: string;
  filters: ContractsListFiltersPersisted;
  createdAt: string;
  updatedAt: string;
};

const CONTRACTS_LIST_SAVED_VIEWS_STORAGE_KEY = 'admin_contract_documents_contracts_saved_views_v1';
const MAX_SAVED_VIEWS = 12;

function normalizeSavedViews(raw: unknown): ContractsListSavedView[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Partial<ContractsListSavedView>;
      if (!row.id || !row.title || !row.filters || typeof row.filters !== 'object') return null;
      return {
        id: String(row.id),
        title: String(row.title).trim().slice(0, 60),
        filters: {
          ...EMPTY_CONTRACTS_LIST_FILTERS,
          ...row.filters,
          scopeTouched: true,
        },
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
        updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
      };
    })
    .filter((row): row is ContractsListSavedView => Boolean(row && row.title));
}

export function loadContractsListSavedViews(): ContractsListSavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONTRACTS_LIST_SAVED_VIEWS_STORAGE_KEY);
    if (!raw) return [];
    return normalizeSavedViews(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function persistContractsListSavedViews(views: ContractsListSavedView[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CONTRACTS_LIST_SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
  } catch {
    /* ignore quota / private mode */
  }
}

export function createContractsListSavedViewId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `view_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function snapshotContractsListFiltersForSavedView(
  filters: ContractsListFiltersPersisted
): ContractsListFiltersPersisted {
  return {
    search: filters.search,
    managerFilter: filters.managerFilter,
    statusFilters: [...filters.statusFilters],
    directionFilters: [...filters.directionFilters],
    listScope: filters.listScope,
    scopeTouched: true,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    pageLimit: filters.pageLimit,
    listViewMode: filters.listViewMode,
  };
}

export function contractsListSavedViewMatchesFilters(
  view: ContractsListSavedView,
  current: ContractsListFiltersPersisted
): boolean {
  const a = view.filters;
  const b = current;
  return (
    a.search === b.search &&
    a.managerFilter === b.managerFilter &&
    a.listScope === b.listScope &&
    a.dateFrom === b.dateFrom &&
    a.dateTo === b.dateTo &&
    a.sortBy === b.sortBy &&
    a.sortOrder === b.sortOrder &&
    a.pageLimit === b.pageLimit &&
    a.listViewMode === b.listViewMode &&
    [...a.statusFilters].sort().join(',') === [...b.statusFilters].sort().join(',') &&
    [...a.directionFilters].sort().join(',') === [...b.directionFilters].sort().join(',')
  );
}

export function addContractsListSavedView(
  views: ContractsListSavedView[],
  title: string,
  filters: ContractsListFiltersPersisted
): ContractsListSavedView[] {
  const now = new Date().toISOString();
  const next: ContractsListSavedView = {
    id: createContractsListSavedViewId(),
    title: title.trim().slice(0, 60),
    filters: snapshotContractsListFiltersForSavedView(filters),
    createdAt: now,
    updatedAt: now,
  };
  return [next, ...views].slice(0, MAX_SAVED_VIEWS);
}

export function removeContractsListSavedView(
  views: ContractsListSavedView[],
  id: string
): ContractsListSavedView[] {
  return views.filter((v) => v.id !== id);
}

export function renameContractsListSavedView(
  views: ContractsListSavedView[],
  id: string,
  title: string
): ContractsListSavedView[] {
  const trimmed = title.trim().slice(0, 60);
  if (!trimmed) return views;
  return views.map((v) =>
    v.id === id ? { ...v, title: trimmed, updatedAt: new Date().toISOString() } : v
  );
}
