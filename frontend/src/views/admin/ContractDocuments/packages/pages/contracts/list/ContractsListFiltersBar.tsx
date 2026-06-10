'use client';

import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection } from '@/shared/api/admin-crm';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import type { PackageListPipelineStatus } from '../../../platform/hub/packagePipeline';
import {
  CONTRACTS_PAGE_LIMIT_OPTIONS,
  type ContractsListViewMode,
  type ContractsPageLimit,
} from './contractsListFilters';
import { contractsListFilterFieldClass } from './contractsListFormatters';

type ContractsListFiltersBarProps = {
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: '' | PackageListPipelineStatus;
  onStatusFilterChange: (value: '' | PackageListPipelineStatus) => void;
  listViewMode: ContractsListViewMode;
  onListViewModeChange: (mode: ContractsListViewMode) => void;
  managerFilter: string;
  onManagerFilterChange: (value: string) => void;
  managerOptions: ContractSignatoryProfile[];
  directionFilter: string;
  onDirectionFilterChange: (value: string) => void;
  directions: CrmDirection[];
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  limit: ContractsPageLimit;
  onLimitChange: (limit: ContractsPageLimit) => void;
};

export function ContractsListFiltersBar({
  loading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  listViewMode,
  onListViewModeChange,
  managerFilter,
  onManagerFilterChange,
  managerOptions,
  directionFilter,
  onDirectionFilterChange,
  directions,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  limit,
  onLimitChange,
}: ContractsListFiltersBarProps) {
  return (
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
        id="repair_list_status_filter"
        value={statusFilter}
        onChange={(e) =>
          onStatusFilterChange((e.target.value || '') as '' | PackageListPipelineStatus)
        }
        disabled={loading}
        className={contractsListFilterFieldClass(
          cdHub.contractsListSelect,
          Boolean(statusFilter),
          cdHub.contractsListFilterActive
        )}
        aria-label="Статус"
      >
        <option value="">Все статусы</option>
        <option value="IN_PROJECT">В проекте</option>
        <option value="SIGNED">Подписан</option>
        <option value="WORK_IN_PROGRESS">В работе</option>
        <option value="CLOSED">Закрыт</option>
        <option value="REFUSED">Отказ</option>
      </select>
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
        aria-label="Менеджер"
      >
        <option value="">Все менеджеры</option>
        {managerOptions.map((p) => (
          <option key={p.crmUserId} value={p.crmUserId}>
            {p.title?.trim() || p.directorNameNominative?.trim() || p.crmUserId}
          </option>
        ))}
      </select>
      <select
        id="repair_list_direction_filter"
        value={directionFilter}
        onChange={(e) => onDirectionFilterChange(e.target.value)}
        disabled={loading}
        className={contractsListFilterFieldClass(
          cdHub.contractsListSelect,
          Boolean(directionFilter),
          cdHub.contractsListFilterActive
        )}
        aria-label="Направление"
      >
        <option value="">Все направления</option>
        {directions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
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
      <select
        value={limit}
        onChange={(e) => onLimitChange(Number(e.target.value) as ContractsPageLimit)}
        disabled={loading}
        className={cdHub.contractsListSelect}
        aria-label="Количество строк на странице"
      >
        {CONTRACTS_PAGE_LIMIT_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n} на странице
          </option>
        ))}
      </select>
    </div>
  );
}
