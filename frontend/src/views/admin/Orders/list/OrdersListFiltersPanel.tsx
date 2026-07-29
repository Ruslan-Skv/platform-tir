'use client';

import { type ReactNode, useId, useMemo, useState } from 'react';

import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import {
  ORDERS_LIST_KIND_OPTIONS,
  type OrdersListKind,
  PAYMENT_STATUS_FILTER_OPTIONS,
  PRODUCT_ORDER_STATUS_FILTER_OPTIONS,
  SERVICE_ORDER_STATUS_FILTER_OPTIONS,
} from './orders-page.constants';

type OrdersListFiltersPanelProps = {
  listKind: OrdersListKind;
  statusFilter: string;
  paymentFilter: string;
  orderNumberQuery: string;
  customerQuery: string;
  managerQuery: string;
  dateFrom: string;
  dateTo: string;
  children: ReactNode;
};

function buildSummary(props: Omit<OrdersListFiltersPanelProps, 'children'>) {
  const items: { key: string; label: string }[] = [];
  const kindLabel =
    ORDERS_LIST_KIND_OPTIONS.find((o) => o.value === props.listKind)?.label ?? 'Все';
  items.push({ key: 'kind', label: kindLabel });

  if (props.statusFilter) {
    const opts =
      props.listKind === 'service'
        ? SERVICE_ORDER_STATUS_FILTER_OPTIONS
        : PRODUCT_ORDER_STATUS_FILTER_OPTIONS;
    const label = opts.find((o) => o.value === props.statusFilter)?.label ?? props.statusFilter;
    items.push({ key: 'status', label });
  }

  if (props.paymentFilter && props.listKind !== 'service') {
    const label =
      PAYMENT_STATUS_FILTER_OPTIONS.find((o) => o.value === props.paymentFilter)?.label ??
      props.paymentFilter;
    items.push({ key: 'payment', label: `Оплата: ${label}` });
  }

  if (props.orderNumberQuery.trim()) {
    items.push({ key: 'orderNumber', label: `№ ${props.orderNumberQuery.trim()}` });
  }
  if (props.customerQuery.trim()) {
    items.push({ key: 'customer', label: props.customerQuery.trim() });
  }
  if (props.managerQuery.trim()) {
    items.push({ key: 'manager', label: props.managerQuery.trim() });
  }
  if (props.dateFrom || props.dateTo) {
    items.push({
      key: 'dates',
      label: `${props.dateFrom || '…'} — ${props.dateTo || '…'}`,
    });
  }

  return items;
}

export function OrdersListFiltersPanel({
  listKind,
  statusFilter,
  paymentFilter,
  orderNumberQuery,
  customerQuery,
  managerQuery,
  dateFrom,
  dateTo,
  children,
}: OrdersListFiltersPanelProps) {
  const contentId = useId();
  const [collapsed, setCollapsed] = useState(true);

  const summaryItems = useMemo(
    () =>
      buildSummary({
        listKind,
        statusFilter,
        paymentFilter,
        orderNumberQuery,
        customerQuery,
        managerQuery,
        dateFrom,
        dateTo,
      }),
    [
      listKind,
      statusFilter,
      paymentFilter,
      orderNumberQuery,
      customerQuery,
      managerQuery,
      dateFrom,
      dateTo,
    ]
  );

  const toggleCollapsed = () => setCollapsed((value) => !value);

  return (
    <section className={cdHub.contractsListFiltersPanel} aria-label="Настройки списка заказов">
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
