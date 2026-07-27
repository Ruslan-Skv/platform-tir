import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection } from '@/shared/api/admin-crm';

import type {
  ContractsListScope,
  ContractsListViewMode,
  ContractsPageLimit,
} from './contractsListFilters';
import {
  CONTRACTS_LIST_PIPELINE_STATUS_OPTIONS,
  CONTRACTS_LIST_QUEUE_PRESETS,
  type ContractsListQueuePreset,
} from './contractsListScope';

export type ContractsListFiltersSummaryItem = {
  key: string;
  label: string;
};

export type BuildContractsListFiltersSummaryParams = {
  listScope: ContractsListScope;
  queuePreset: ContractsListQueuePreset | null;
  statusFilters: string[];
  directionFilters: string[];
  directions: CrmDirection[];
  search: string;
  listViewMode: ContractsListViewMode;
  managerFilter: string;
  managerOptions: ContractSignatoryProfile[];
  dateFrom: string;
  dateTo: string;
  limit: ContractsPageLimit;
  activeSavedViewTitle: string | null;
};

const SCOPE_LABELS: Record<ContractsListScope, string> = {
  mine: 'Мои',
  my_directions: 'Мои направления',
  all: 'Все',
};

function formatContractsListSummaryDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function contractsListDirectionSummaryLabel(direction: CrmDirection): string {
  if (direction.slug === 'stretch-ceilings') return 'Потолки';
  return direction.name;
}

/** Краткие подписи включённых настроек для свёрнутой панели фильтров. */
export function buildContractsListFiltersSummary(
  params: BuildContractsListFiltersSummaryParams
): ContractsListFiltersSummaryItem[] {
  const items: ContractsListFiltersSummaryItem[] = [];

  items.push({
    key: 'scope',
    label: `Очередь: ${SCOPE_LABELS[params.listScope]}`,
  });

  if (params.queuePreset && params.queuePreset !== 'all') {
    const presetLabel =
      CONTRACTS_LIST_QUEUE_PRESETS.find((preset) => preset.id === params.queuePreset)?.label ??
      params.queuePreset;
    items.push({ key: 'queue', label: `Этап: ${presetLabel}` });
  } else if (params.statusFilters.length > 0) {
    const statusLabels = params.statusFilters.map(
      (value) =>
        CONTRACTS_LIST_PIPELINE_STATUS_OPTIONS.find((opt) => opt.value === value)?.label ?? value
    );
    items.push({ key: 'status', label: `Статус: ${statusLabels.join(', ')}` });
  }

  if (params.directionFilters.length > 0) {
    const names = params.directionFilters.map((id) => {
      const direction = params.directions.find((row) => row.id === id);
      return direction ? contractsListDirectionSummaryLabel(direction) : id;
    });
    items.push({ key: 'directions', label: `Направление: ${names.join(', ')}` });
  }

  const searchTrim = params.search.trim();
  if (searchTrim) {
    items.push({ key: 'search', label: `Поиск: «${searchTrim}»` });
  }

  items.push({
    key: 'view',
    label: params.listViewMode === 'by_object' ? 'По объектам' : 'Плоский список',
  });

  if (params.managerFilter) {
    const manager = params.managerOptions.find((row) => row.crmUserId === params.managerFilter);
    const managerLabel =
      manager?.title?.trim() || manager?.directorNameNominative?.trim() || params.managerFilter;
    items.push({ key: 'manager', label: `Ответственный: ${managerLabel}` });
  }

  if (params.dateFrom || params.dateTo) {
    const from = params.dateFrom ? formatContractsListSummaryDate(params.dateFrom) : '…';
    const to = params.dateTo ? formatContractsListSummaryDate(params.dateTo) : '…';
    items.push({ key: 'dates', label: `Даты: ${from} — ${to}` });
  }

  items.push({ key: 'limit', label: `${params.limit} на странице` });

  if (params.activeSavedViewTitle) {
    items.push({ key: 'view-saved', label: `Вид: ${params.activeSavedViewTitle}` });
  }

  return items;
}

const FILTERS_COLLAPSED_STORAGE_KEY = 'admin_contract_documents_contracts_filters_collapsed_v1';

export function loadContractsListFiltersCollapsed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(FILTERS_COLLAPSED_STORAGE_KEY);
    if (raw === '0') return false;
    if (raw === '1') return true;
  } catch {
    /* ignore */
  }
  return true;
}

export function persistContractsListFiltersCollapsed(collapsed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FILTERS_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}
