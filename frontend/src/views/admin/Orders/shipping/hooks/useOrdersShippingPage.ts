'use client';

import { useEffect, useState } from 'react';

import { getAdminOrders } from '@/shared/api/admin-orders';

import { ORDERS_SHIPPING_PAGE_LIMIT } from '../orders-shipping-page.constants';
import type { ShippingOrder } from '../orders-shipping-page.utils';

export function useOrdersShippingPage() {
  const [orders, setOrders] = useState<ShippingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminOrders(page, ORDERS_SHIPPING_PAGE_LIMIT, statusFilter || undefined, {
      hasDelivery: true,
    })
      .then((res) => {
        if (cancelled) return;
        setTotal(res.total);
        setOrders(
          res.data.map((order) => ({
            ...order,
            itemsCount: Array.isArray(order.items) ? order.items.length : 0,
          })) as ShippingOrder[]
        );
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
    limit: ORDERS_SHIPPING_PAGE_LIMIT,
    statusFilter,
    setStatusFilter,
  };
}

export type OrdersShippingPageModel = ReturnType<typeof useOrdersShippingPage>;
