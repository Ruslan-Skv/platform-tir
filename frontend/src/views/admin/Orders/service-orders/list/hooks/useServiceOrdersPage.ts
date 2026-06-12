'use client';

import { useEffect, useState } from 'react';

import { type ServiceOrderSummary, getServiceOrders } from '@/shared/api/admin-orders';

import { SERVICE_ORDERS_PAGE_LIMIT } from '../service-orders-page.constants';

export function useServiceOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getServiceOrders({ page, limit: SERVICE_ORDERS_PAGE_LIMIT, status: statusFilter || undefined })
      .then((res) => {
        if (cancelled) return;
        setTotal(res.total);
        setOrders(res.items);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter]);

  return {
    orders,
    loading,
    total,
    page,
    setPage,
    limit: SERVICE_ORDERS_PAGE_LIMIT,
    statusFilter,
    setStatusFilter,
  };
}

export type ServiceOrdersPageModel = ReturnType<typeof useServiceOrdersPage>;
