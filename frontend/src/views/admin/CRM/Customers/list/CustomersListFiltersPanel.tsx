'use client';

import { type ReactNode, useEffect, useId, useMemo, useState } from 'react';

import type { CrmUser } from '@/shared/api/admin-crm';

import type { CustomerTypeFilter, CustomersPageLimit } from '../shared/customersDirectoryListState';
import {
  buildCustomersListFiltersSummary,
  loadCustomersListFiltersCollapsed,
  persistCustomersListFiltersCollapsed,
} from '../shared/customersListFiltersSummary';
import type { CustomersListScope } from '../shared/customersListScope';
import styles from './CustomersPage.module.css';

type CustomersListFiltersPanelProps = {
  listScope: CustomersListScope;
  typeFilter: CustomerTypeFilter;
  search: string;
  authorFilter: string;
  authorOptions: CrmUser[];
  limit: CustomersPageLimit;
  children: ReactNode;
};

export function CustomersListFiltersPanel({
  listScope,
  typeFilter,
  search,
  authorFilter,
  authorOptions,
  limit,
  children,
}: CustomersListFiltersPanelProps) {
  const contentId = useId();
  const [collapsed, setCollapsed] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsed(loadCustomersListFiltersCollapsed());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistCustomersListFiltersCollapsed(collapsed);
  }, [collapsed, hydrated]);

  const summaryItems = useMemo(
    () =>
      buildCustomersListFiltersSummary({
        listScope,
        typeFilter,
        search,
        authorFilter,
        authorOptions,
        limit,
      }),
    [listScope, typeFilter, search, authorFilter, authorOptions, limit]
  );

  const toggleCollapsed = () => setCollapsed((value) => !value);

  return (
    <section className={styles.filtersPanel} aria-label="Настройки списка заказчиков">
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
