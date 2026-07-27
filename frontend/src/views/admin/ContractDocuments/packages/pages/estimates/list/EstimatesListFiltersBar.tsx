'use client';

import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import {
  ESTIMATES_PAGE_LIMIT_OPTIONS,
  type EstimatesListScope,
  type EstimatesListViewMode,
  type EstimatesPageLimit,
} from './estimatesListFilters';
import { estimatesListFilterFieldClass } from './estimatesListUtils';

export type EstimatesListFiltersBarProps = {
  loading: boolean;
  saving: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  listScope: EstimatesListScope;
  onListScopeChange: (scope: EstimatesListScope) => void;
  scopeCounts: Record<EstimatesListScope, number>;
  listViewMode: EstimatesListViewMode;
  onListViewModeChange: (mode: EstimatesListViewMode) => void;
  managerFilter: string;
  onManagerFilterChange: (value: string) => void;
  managerOptions: ContractSignatoryProfile[];
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  limit: EstimatesPageLimit;
  onLimitChange: (limit: EstimatesPageLimit) => void;
};

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

export function EstimatesListFiltersBar({
  loading,
  saving,
  search,
  onSearchChange,
  listScope,
  onListScopeChange,
  scopeCounts,
  listViewMode,
  onListViewModeChange,
  managerFilter,
  onManagerFilterChange,
  managerOptions,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  limit,
  onLimitChange,
}: EstimatesListFiltersBarProps) {
  const disabled = loading || saving;
  const showManagerFilter = listScope !== 'mine';

  return (
    <div className={cdHub.contractsListFiltersStack}>
      <div className={cdHub.contractsListChipRow} role="group" aria-label="Очередь расчётов">
        <span className={cdHub.contractsListChipRowLabel}>Очередь</span>
        <button
          type="button"
          disabled={disabled}
          className={chipClass(listScope === 'mine')}
          onClick={() => onListScopeChange('mine')}
        >
          Мои ({scopeCounts.mine ?? 0})
        </button>
        <button
          type="button"
          disabled={disabled}
          className={chipClass(listScope === 'all')}
          onClick={() => onListScopeChange('all')}
        >
          Все ({scopeCounts.all ?? 0})
        </button>
      </div>

      <div className={cdHub.contractsListFilters}>
        <input
          type="search"
          placeholder="Поиск по названию, заказчику, адресу..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={disabled}
          className={estimatesListFilterFieldClass(
            cdHub.contractsListSearchInput,
            Boolean(search.trim()),
            cdHub.contractsListFilterActive
          )}
          aria-label="Поиск по названию расчёта, заказчику, адресу"
        />
        <select
          value={listViewMode}
          onChange={(e) => onListViewModeChange(e.target.value as EstimatesListViewMode)}
          disabled={disabled}
          className={cdHub.contractsListSelect}
          aria-label="Режим списка"
        >
          <option value="by_object">По объектам</option>
          <option value="flat">Плоский список</option>
        </select>
        {showManagerFilter ? (
          <select
            id="estimates_list_manager_filter"
            value={managerFilter}
            onChange={(e) => onManagerFilterChange(e.target.value)}
            disabled={disabled}
            className={estimatesListFilterFieldClass(
              cdHub.contractsListSelect,
              Boolean(managerFilter),
              cdHub.contractsListFilterActive
            )}
            aria-label="Менеджер"
          >
            <option value="">Все менеджеры</option>
            {managerOptions.map((p) => (
              <option key={p.crmUserId} value={p.crmUserId}>
                {p.title?.trim() || p.directorNameNominative?.trim() || p.crmUserId}
              </option>
            ))}
          </select>
        ) : null}
        <label className={cdHub.contractsListDateLabel}>
          <span className={cdHub.contractsListDateLabelText}>Дата от</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            disabled={disabled}
            className={estimatesListFilterFieldClass(
              cdHub.contractsListDateInput,
              Boolean(dateFrom),
              cdHub.contractsListFilterActive
            )}
            aria-label="Дата от"
          />
        </label>
        <label className={cdHub.contractsListDateLabel}>
          <span className={cdHub.contractsListDateLabelText}>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            disabled={disabled}
            className={estimatesListFilterFieldClass(
              cdHub.contractsListDateInput,
              Boolean(dateTo),
              cdHub.contractsListFilterActive
            )}
            aria-label="Дата до"
          />
        </label>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value) as EstimatesPageLimit)}
          disabled={disabled}
          className={cdHub.contractsListSelect}
          aria-label="Количество строк на странице"
        >
          {ESTIMATES_PAGE_LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} на странице
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
