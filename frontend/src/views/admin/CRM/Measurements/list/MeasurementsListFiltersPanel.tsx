'use client';

import { type ReactNode, useEffect, useId, useMemo, useState } from 'react';

import type { ContractSignatoryProfile } from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection } from '@/shared/api/admin-crm';

import {
  type MeasurementsListScope,
  type MeasurementsPageLimit,
} from '../shared/measurementsListFilters';
import {
  buildMeasurementsListFiltersSummary,
  loadMeasurementsListFiltersCollapsed,
  persistMeasurementsListFiltersCollapsed,
} from '../shared/measurementsListFiltersSummary';
import styles from './MeasurementsPage.module.css';

type MeasurementsListFiltersPanelProps = {
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
  children: ReactNode;
};

export function MeasurementsListFiltersPanel({
  listScope,
  statusFilter,
  search,
  managerFilter,
  managerOptions,
  directionFilter,
  directions,
  dateFrom,
  dateTo,
  limit,
  children,
}: MeasurementsListFiltersPanelProps) {
  const contentId = useId();
  const [collapsed, setCollapsed] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(loadMeasurementsListFiltersCollapsed());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistMeasurementsListFiltersCollapsed(collapsed);
  }, [collapsed, hydrated]);

  const summaryItems = useMemo(
    () =>
      buildMeasurementsListFiltersSummary({
        listScope,
        statusFilter,
        search,
        managerFilter,
        managerOptions,
        directionFilter,
        directions,
        dateFrom,
        dateTo,
        limit,
      }),
    [
      listScope,
      statusFilter,
      search,
      managerFilter,
      managerOptions,
      directionFilter,
      directions,
      dateFrom,
      dateTo,
      limit,
    ]
  );

  const toggleCollapsed = () => setCollapsed((value) => !value);

  return (
    <section className={styles.filtersPanel} aria-label="Настройки списка замеров">
      <div className={styles.filtersPanelHeader}>
        <button
          type="button"
          className={styles.filtersPanelToggle}
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={contentId}
        >
          <span className={styles.filtersPanelChevron} aria-hidden>
            {collapsed ? '▸' : '▾'}
          </span>
          <span className={styles.filtersPanelTitle}>
            {collapsed ? 'Настройки списка' : 'Свернуть настройки'}
          </span>
        </button>
        {collapsed ? (
          <button type="button" className={styles.filtersPanelExpandLink} onClick={toggleCollapsed}>
            Изменить
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <button
          type="button"
          className={styles.filtersSummary}
          onClick={toggleCollapsed}
          aria-label="Развернуть настройки списка"
        >
          {summaryItems.map((item) => (
            <span
              key={item.key}
              className={styles.filtersSummaryChip}
              data-filter-key={item.key}
              title={item.label}
            >
              {item.label}
            </span>
          ))}
        </button>
      ) : (
        <div id={contentId} className={styles.filtersPanelBody}>
          {children}
        </div>
      )}
    </section>
  );
}
