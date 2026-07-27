import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection } from '@/shared/api/admin-crm';

import { MEASUREMENT_STATUS_OPTIONS } from './measurementStatuses';
import { type MeasurementsListScope, type MeasurementsPageLimit } from './measurementsListFilters';

const FILTERS_COLLAPSED_STORAGE_KEY = 'admin_measurements_list_filters_collapsed_v1';

const SCOPE_LABELS: Record<MeasurementsListScope, string> = {
  mine: 'Мои',
  my_directions: 'Мои направления',
  all: 'Все',
};

export type MeasurementsFiltersSummaryItem = {
  key: string;
  label: string;
};

export function loadMeasurementsListFiltersCollapsed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(FILTERS_COLLAPSED_STORAGE_KEY);
    if (raw === '0' || raw === 'false') return false;
    return true;
  } catch {
    return true;
  }
}

export function persistMeasurementsListFiltersCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FILTERS_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Краткие подписи включённых настроек для свёрнутой панели фильтров. */
export function buildMeasurementsListFiltersSummary(params: {
  listScope: MeasurementsListScope;
  statusFilter: string;
  search: string;
  managerFilter: string;
  managerOptions: ContractSignatoryProfile[];
  directionFilter: string;
  directions: CrmDirection[];
  dateFrom: string;
  dateTo: string;
  limit: MeasurementsPageLimit;
}): MeasurementsFiltersSummaryItem[] {
  const items: MeasurementsFiltersSummaryItem[] = [
    {
      key: 'scope',
      label: `Очередь: ${SCOPE_LABELS[params.listScope]}`,
    },
  ];

  if (params.statusFilter) {
    const statusLabel =
      MEASUREMENT_STATUS_OPTIONS.find((o) => o.value === params.statusFilter)?.label ??
      params.statusFilter;
    items.push({ key: 'status', label: `Статус: ${statusLabel}` });
  }

  const searchTrim = params.search.trim();
  if (searchTrim) {
    items.push({ key: 'search', label: `Поиск: «${searchTrim}»` });
  }

  if (params.listScope !== 'mine' && params.managerFilter) {
    const manager =
      params.managerOptions.find((p) => p.crmUserId === params.managerFilter)?.title?.trim() ||
      params.managerOptions
        .find((p) => p.crmUserId === params.managerFilter)
        ?.directorNameNominative?.trim() ||
      params.managerFilter;
    items.push({ key: 'manager', label: `Менеджер: ${manager}` });
  }

  if (params.directionFilter) {
    const direction =
      params.directions.find((d) => d.id === params.directionFilter)?.name ??
      params.directionFilter;
    items.push({ key: 'direction', label: `Направление: ${direction}` });
  }

  if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom || '…';
    const to = params.dateTo || '…';
    items.push({ key: 'dates', label: `Даты: ${from} — ${to}` });
  }

  items.push({ key: 'limit', label: `${params.limit} на странице` });

  return items;
}
