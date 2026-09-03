'use client';

import { type ReactNode, useEffect, useId, useMemo, useState } from 'react';

import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import type {
  EstimatesListScope,
  EstimatesListViewMode,
  EstimatesPageLimit,
} from './estimatesListFilters';
import {
  buildEstimatesListFiltersSummary,
  loadEstimatesListFiltersCollapsed,
  persistEstimatesListFiltersCollapsed,
} from './estimatesListFiltersSummary';

type EstimatesListFiltersPanelProps = {
  listScope: EstimatesListScope;
  search: string;
  listViewMode: EstimatesListViewMode;
  managerFilter: string;
  managerOptions: ContractSignatoryProfile[];
  dateFrom: string;
  dateTo: string;
  limit: EstimatesPageLimit;
  children: ReactNode;
};

export function EstimatesListFiltersPanel({
  listScope,
  search,
  listViewMode,
  managerFilter,
  managerOptions,
  dateFrom,
  dateTo,
  limit,
  children,
}: EstimatesListFiltersPanelProps) {
  const contentId = useId();
  const [collapsed, setCollapsed] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(loadEstimatesListFiltersCollapsed());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistEstimatesListFiltersCollapsed(collapsed);
  }, [collapsed, hydrated]);

  const summaryItems = useMemo(
    () =>
      buildEstimatesListFiltersSummary({
        listScope,
        search,
        listViewMode,
        managerFilter,
        managerOptions,
        dateFrom,
        dateTo,
        limit,
      }),
    [listScope, search, listViewMode, managerFilter, managerOptions, dateFrom, dateTo, limit]
  );

  const toggleCollapsed = () => setCollapsed((value) => !value);

  return (
    <section className={cdHub.contractsListFiltersPanel} aria-label="Настройки списка расчётов">
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
              data-filter-key={item.key}
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
