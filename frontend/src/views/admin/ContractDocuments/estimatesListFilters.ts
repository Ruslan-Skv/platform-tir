/** Сохранённый фильтр списка расчётов (/admin/contract-documents/estimates). */

export interface EstimatesListFiltersPersisted {
  managerFilter: string;
}

const ESTIMATES_LIST_FILTERS_STORAGE_KEY = 'admin_estimates_list_filters_v1';

const EMPTY_FILTERS: EstimatesListFiltersPersisted = {
  managerFilter: '',
};

function normalizePersistedFilters(
  raw: Partial<EstimatesListFiltersPersisted> | null | undefined
): EstimatesListFiltersPersisted {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_FILTERS };
  return {
    managerFilter: typeof raw.managerFilter === 'string' ? raw.managerFilter : '',
  };
}

let memoryCache: EstimatesListFiltersPersisted | null = null;

function readFromLocalStorage(): EstimatesListFiltersPersisted {
  try {
    const raw = localStorage.getItem(ESTIMATES_LIST_FILTERS_STORAGE_KEY);
    if (!raw) return { ...EMPTY_FILTERS };
    return normalizePersistedFilters(JSON.parse(raw) as Partial<EstimatesListFiltersPersisted>);
  } catch {
    return { ...EMPTY_FILTERS };
  }
}

export function loadEstimatesListFilters(): EstimatesListFiltersPersisted {
  if (memoryCache) return memoryCache;
  if (typeof window === 'undefined') {
    return { ...EMPTY_FILTERS };
  }
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

export function reloadEstimatesListFiltersFromStorage(): EstimatesListFiltersPersisted {
  if (typeof window === 'undefined') return { ...EMPTY_FILTERS };
  memoryCache = readFromLocalStorage();
  return memoryCache;
}

export function persistEstimatesListFilters(state: EstimatesListFiltersPersisted): void {
  memoryCache = { ...state };
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ESTIMATES_LIST_FILTERS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
