'use client';

import { type ReactNode, useEffect, useId, useMemo, useState } from 'react';

import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection } from '@/shared/api/admin-crm';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import type {
  ContractsListScope,
  ContractsListViewMode,
  ContractsPageLimit,
} from './contractsListFilters';
import {
  buildContractsListFiltersSummary,
  loadContractsListFiltersCollapsed,
  persistContractsListFiltersCollapsed,
} from './contractsListFiltersSummary';
import type { ContractsListQueuePreset } from './contractsListScope';

type ContractsListFiltersPanelProps = {
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
  children: ReactNode;
};

export function ContractsListFiltersPanel({
  listScope,
  queuePreset,
  statusFilters,
  directionFilters,
  directions,
  search,
  listViewMode,
  managerFilter,
  managerOptions,
  dateFrom,
  dateTo,
  limit,
  activeSavedViewTitle,
  children,
}: ContractsListFiltersPanelProps) {
  const contentId = useId();
  const [collapsed, setCollapsed] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(loadContractsListFiltersCollapsed());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistContractsListFiltersCollapsed(collapsed);
  }, [collapsed, hydrated]);

  const summaryItems = useMemo(
    () =>
      buildContractsListFiltersSummary({
        listScope,
        queuePreset,
        statusFilters,
        directionFilters,
        directions,
        search,
        listViewMode,
        managerFilter,
        managerOptions,
        dateFrom,
        dateTo,
        limit,
        activeSavedViewTitle,
      }),
    [
      listScope,
      queuePreset,
      statusFilters,
      directionFilters,
      directions,
      search,
      listViewMode,
      managerFilter,
      managerOptions,
      dateFrom,
      dateTo,
      limit,
      activeSavedViewTitle,
    ]
  );

  const toggleCollapsed = () => setCollapsed((value) => !value);

  return (
    <section className={cdHub.contractsListFiltersPanel} aria-label="Настройки списка договоров">
      <div className={cdHub.contractsListFiltersPanelHeader}>
        <button
          type="button"
          className={cdHub.contractsListFiltersPanelToggle}
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={contentId}
        >
          <span className={cdHub.contractsListFiltersPanelChevron} aria-hidden>
            {collapsed ? '▸' : '▾'}
          </span>
          <span className={cdHub.contractsListFiltersPanelTitle}>
            {collapsed ? 'Настройки списка' : 'Свернуть настройки'}
          </span>
        </button>
        {collapsed ? (
          <button
            type="button"
            className={cdHub.contractsListFiltersPanelExpandLink}
            onClick={toggleCollapsed}
          >
            Изменить
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <button
          type="button"
          className={cdHub.contractsListFiltersSummary}
          onClick={toggleCollapsed}
          aria-label="Развернуть настройки списка"
        >
          {summaryItems.map((item) => (
            <span
              key={item.key}
              className={cdHub.contractsListFiltersSummaryChip}
              title={item.label}
            >
              {item.label}
            </span>
          ))}
        </button>
      ) : (
        <div id={contentId} className={cdHub.contractsListFiltersPanelBody}>
          {children}
        </div>
      )}
    </section>
  );
}
