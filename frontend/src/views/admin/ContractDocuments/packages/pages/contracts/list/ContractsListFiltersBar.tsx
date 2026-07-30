'use client';

import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection } from '@/shared/api/admin-crm';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import {
  CONTRACTS_PAGE_LIMIT_OPTIONS,
  type ContractsListScope,
  type ContractsListViewMode,
  type ContractsPageLimit,
} from './contractsListFilters';
import { contractsListFilterFieldClass } from './contractsListFormatters';
import {
  CONTRACTS_LIST_PIPELINE_STATUS_OPTIONS,
  CONTRACTS_LIST_QUEUE_PRESETS,
  type ContractsListQueuePreset,
  toggleContractsListChipValue,
} from './contractsListScope';

function contractsListDirectionChipLabel(direction: CrmDirection): string {
  if (direction.slug === 'stretch-ceilings') return 'Потолки';
  return direction.name;
}

type ContractsListFiltersBarProps = {
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  listScope: ContractsListScope;
  onListScopeChange: (scope: ContractsListScope) => void;
  queuePreset: ContractsListQueuePreset | null;
  onQueuePresetChange: (preset: ContractsListQueuePreset) => void;
  statusFilters: string[];
  onStatusFiltersChange: (value: string[]) => void;
  listViewMode: ContractsListViewMode;
  onListViewModeChange: (mode: ContractsListViewMode) => void;
  managerFilter: string;
  onManagerFilterChange: (value: string) => void;
  managerOptions: ContractSignatoryProfile[];
  directionFilters: string[];
  onDirectionFiltersChange: (value: string[]) => void;
  directions: CrmDirection[];
  myDirectionIds: string[];
  scopeCounts: Record<ContractsListScope, number>;
  queuePresetCounts: Partial<Record<ContractsListQueuePreset, number>>;
  directionCounts: Record<string, number>;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  limit: ContractsPageLimit;
  onLimitChange: (limit: ContractsPageLimit) => void;
};

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

export function ContractsListFiltersBar({
  loading,
  search,
  onSearchChange,
  listScope,
  onListScopeChange,
  queuePreset,
  onQueuePresetChange,
  statusFilters,
  onStatusFiltersChange,
  listViewMode,
  onListViewModeChange,
  managerFilter,
  onManagerFilterChange,
  managerOptions,
  directionFilters,
  onDirectionFiltersChange,
  directions,
  myDirectionIds,
  scopeCounts,
  queuePresetCounts,
  directionCounts,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  limit,
  onLimitChange,
}: ContractsListFiltersBarProps) {
  const showManagerFilter = listScope !== 'mine';

  return (
    <div className={cdHub.contractsListFiltersStack}>
      <div className={cdHub.contractsListChipRow} role="group" aria-label="Очередь договоров">
        <span className={cdHub.contractsListChipRowLabel}>Очередь</span>
        <button
          type="button"
          disabled={loading}
          className={chipClass(listScope === 'mine')}
          onClick={() => onListScopeChange('mine')}
        >
          Мои ({scopeCounts.mine ?? 0})
        </button>
        <button
          type="button"
          disabled={loading}
          className={chipClass(listScope === 'my_directions')}
          onClick={() => onListScopeChange('my_directions')}
          title={
            myDirectionIds.length === 0
              ? 'Направления ещё не назначены в карточке пользователя'
              : undefined
          }
        >
          Мои направления ({scopeCounts.my_directions ?? 0})
        </button>
        <button
          type="button"
          disabled={loading}
          className={chipClass(listScope === 'all')}
          onClick={() => onListScopeChange('all')}
        >
          Все ({scopeCounts.all ?? 0})
        </button>
      </div>

      <div className={cdHub.contractsListChipRow} role="group" aria-label="Рабочий этап">
        <span className={cdHub.contractsListChipRowLabel}>Этап</span>
        {CONTRACTS_LIST_QUEUE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            disabled={loading}
            className={chipClass(queuePreset === preset.id)}
            title={preset.hint}
            onClick={() => onQueuePresetChange(preset.id)}
          >
            {preset.label} ({queuePresetCounts[preset.id] ?? 0})
          </button>
        ))}
      </div>

      <div className={cdHub.contractsListChipRow} role="group" aria-label="Статусы">
        <span className={cdHub.contractsListChipRowLabel}>Статус</span>
        <button
          type="button"
          disabled={loading}
          className={chipClass(statusFilters.length === 0)}
          onClick={() => onStatusFiltersChange([])}
        >
          Все
        </button>
        {CONTRACTS_LIST_PIPELINE_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={loading}
            className={chipClass(statusFilters.includes(opt.value))}
            onClick={() =>
              onStatusFiltersChange(toggleContractsListChipValue(statusFilters, opt.value))
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={cdHub.contractsListChipRow} role="group" aria-label="Направления">
        <span className={cdHub.contractsListChipRowLabel}>Направление</span>
        <button
          type="button"
          disabled={loading}
          className={chipClass(directionFilters.length === 0)}
          onClick={() => onDirectionFiltersChange([])}
        >
          Все
        </button>
        {directions.map((d) => {
          const isMine = myDirectionIds.includes(d.id);
          const active = directionFilters.includes(d.id);
          return (
            <button
              key={d.id}
              type="button"
              disabled={loading}
              className={`${chipClass(active)}${isMine ? ` ${cdHub.contractsListChipMine}` : ''}`}
              onClick={() =>
                onDirectionFiltersChange(toggleContractsListChipValue(directionFilters, d.id))
              }
              title={isMine ? 'Ваше направление' : undefined}
            >
              {contractsListDirectionChipLabel(d)} ({directionCounts[d.id] ?? 0})
            </button>
          );
        })}
      </div>

      <div className={cdHub.contractsListFilters}>
        <input
          type="search"
          placeholder="Поиск по номеру договора, ФИО заказчика, адресу..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading}
          className={contractsListFilterFieldClass(
            cdHub.contractsListSearchInput,
            Boolean(search.trim()),
            cdHub.contractsListFilterActive
          )}
          aria-label="Поиск по номеру договора, ФИО заказчика, адресу"
        />
        <select
          value={listViewMode}
          onChange={(e) => onListViewModeChange(e.target.value as ContractsListViewMode)}
          disabled={loading}
          className={cdHub.contractsListSelect}
          aria-label="Режим списка"
        >
          <option value="by_object">По объектам</option>
          <option value="flat">Плоский список</option>
        </select>
        {showManagerFilter ? (
          <select
            id="repair_list_manager_filter"
            value={managerFilter}
            onChange={(e) => onManagerFilterChange(e.target.value)}
            disabled={loading}
            className={contractsListFilterFieldClass(
              cdHub.contractsListSelect,
              Boolean(managerFilter),
              cdHub.contractsListFilterActive
            )}
            aria-label="Ответственный менеджер"
          >
            <option value="">Все ответственные</option>
            {managerOptions.map((p) => (
              <option key={p.crmUserId} value={p.crmUserId}>
                {p.title?.trim() || p.directorNameNominative?.trim() || p.crmUserId}
              </option>
            ))}
          </select>
        ) : null}
        <div className={cdHub.contractsListDateFilters}>
          <label className={cdHub.contractsListDateLabel}>
            <span className={cdHub.contractsListDateLabelText}>Дата от</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              disabled={loading}
              className={contractsListFilterFieldClass(
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
              disabled={loading}
              className={contractsListFilterFieldClass(
                cdHub.contractsListDateInput,
                Boolean(dateTo),
                cdHub.contractsListFilterActive
              )}
              aria-label="Дата до"
            />
          </label>
        </div>
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value) as ContractsPageLimit)}
          disabled={loading}
          className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
          aria-label="Количество строк на странице"
        >
          {CONTRACTS_PAGE_LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} на странице
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
