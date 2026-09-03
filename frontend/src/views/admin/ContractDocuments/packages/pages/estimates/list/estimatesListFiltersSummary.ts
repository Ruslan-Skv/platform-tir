import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';

import type {
  EstimatesListScope,
  EstimatesListViewMode,
  EstimatesPageLimit,
} from './estimatesListFilters';

const FILTERS_COLLAPSED_STORAGE_KEY = 'admin_estimates_list_filters_collapsed_v1';

const SCOPE_LABELS: Record<EstimatesListScope, string> = {
  mine: 'Мои',
  all: 'Все',
};

export type EstimatesListFiltersSummaryItem = {
  key: string;
  label: string;
};

export function loadEstimatesListFiltersCollapsed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(FILTERS_COLLAPSED_STORAGE_KEY);
    if (raw === '0' || raw === 'false') return false;
    return true;
  } catch {
    return true;
  }
}

export function persistEstimatesListFiltersCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FILTERS_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function formatEstimatesListSummaryDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

/** Краткие подписи включённых настроек для свёрнутой панели фильтров. */
export function buildEstimatesListFiltersSummary(params: {
  listScope: EstimatesListScope;
  search: string;
  listViewMode: EstimatesListViewMode;
  managerFilter: string;
  managerOptions: ContractSignatoryProfile[];
  dateFrom: string;
  dateTo: string;
  limit: EstimatesPageLimit;
}): EstimatesListFiltersSummaryItem[] {
  const items: EstimatesListFiltersSummaryItem[] = [
    {
      key: 'scope',
      label: `Очередь: ${SCOPE_LABELS[params.listScope]}`,
    },
  ];

  const searchTrim = params.search.trim();
  if (searchTrim) {
    items.push({ key: 'search', label: `Поиск: «${searchTrim}»` });
  }

  items.push({
    key: 'view',
    label: params.listViewMode === 'by_object' ? 'По объектам' : 'Плоский список',
  });

  if (params.listScope !== 'mine' && params.managerFilter) {
    const manager = params.managerOptions.find((row) => row.crmUserId === params.managerFilter);
    const managerLabel =
      manager?.title?.trim() || manager?.directorNameNominative?.trim() || params.managerFilter;
    items.push({ key: 'manager', label: `Менеджер: ${managerLabel}` });
  }

  if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ? formatEstimatesListSummaryDate(params.dateFrom) : '…';
    const to = params.dateTo ? formatEstimatesListSummaryDate(params.dateTo) : '…';
    items.push({ key: 'dates', label: `Даты: ${from} — ${to}` });
  }

  items.push({ key: 'limit', label: `${params.limit} на странице` });

  return items;
}
