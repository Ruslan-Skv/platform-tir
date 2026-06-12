'use client';

import { useEffect, useState } from 'react';

import { getAdminOrders, getServiceOrders } from '@/shared/api/admin-orders';

import { ORDERS_PAGE_LIMIT } from '../orders-page.constants';
import type { OrdersPageOrder } from '../orders-page.types';

export function useOrdersPage() {
  const [orders, setOrders] = useState<OrdersPageOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [orderNumberQuery, setOrderNumberQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [managerQuery, setManagerQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getAdminOrders(page, ORDERS_PAGE_LIMIT, statusFilter || undefined, {
        orderNumber: orderNumberQuery.trim() || undefined,
        customer: customerQuery.trim() || undefined,
        manager: managerQuery.trim() || undefined,
        paymentStatus: paymentFilter || undefined,
      }),
      getServiceOrders({ page: 1, limit: 100 }),
    ])
      .then(([ordersRes, serviceRes]) => {
        if (cancelled) return;
        const productOrders: OrdersPageOrder[] = ordersRes.data.map((o) => {
          const items = Array.isArray(o.items) ? o.items.length : 0;
          const services = Array.isArray((o as { orderServiceItems?: unknown[] }).orderServiceItems)
            ? (o as { orderServiceItems: unknown[] }).orderServiceItems.length
            : 0;
          return {
            ...o,
            itemsCount: items + services,
            orderType: 'product' as const,
          };
        });
        const serviceOrders: OrdersPageOrder[] = serviceRes.items.map((o) => ({
          ...o,
          itemsCount: Array.isArray(o.items) ? o.items.length : 0,
          orderType: 'service' as const,
        }));
        const merged = [...productOrders, ...serviceOrders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTotal(ordersRes.total + serviceRes.total);
        setOrders(merged.slice(0, ORDERS_PAGE_LIMIT));
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
  }, [page, statusFilter, orderNumberQuery, customerQuery, managerQuery, paymentFilter]);

  return {
    orders,
    loading,
    total,
    page,
    setPage,
    limit: ORDERS_PAGE_LIMIT,
    orderNumberQuery,
    setOrderNumberQuery,
    customerQuery,
    setCustomerQuery,
    managerQuery,
    setManagerQuery,
    statusFilter,
    setStatusFilter,
    paymentFilter,
    setPaymentFilter,
    selectedIds,
    setSelectedIds,
  };
}

export type OrdersPageModel = ReturnType<typeof useOrdersPage>;
