'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  deleteAdminOrder,
  deleteServiceOrder,
  getAdminOrders,
  getAdminOrdersTrash,
  getServiceOrders,
} from '@/shared/api/admin-orders';
import { useAdminTrashCount } from '@/shared/ui/admin/AdminToolbarIconButton';

import {
  ORDERS_PAGE_LIMIT,
  type OrdersListKind,
  PAYMENT_STATUS_FILTER_OPTIONS,
  PRODUCT_ORDER_STATUS_FILTER_OPTIONS,
  SERVICE_ORDER_STATUS_FILTER_OPTIONS,
} from '../orders-page.constants';
import type { OrdersPageOrder } from '../orders-page.types';
import { compareOrdersForListSort, isServiceOrder } from '../orders-page.utils';
import {
  type OrdersListSortBy,
  type OrdersListSortOrder,
  loadOrdersListSort,
  parseOrdersListSortBy,
  persistOrdersListSort,
} from '../ordersListSort';

type KindCounts = Record<OrdersListKind, number>;

const EMPTY_KIND_COUNTS: KindCounts = {
  all: 0,
  product: 0,
  service: 0,
  delivery: 0,
};

function mapProductOrders(
  data: Awaited<ReturnType<typeof getAdminOrders>>['data']
): OrdersPageOrder[] {
  return data.map((o) => {
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
}

function mapServiceOrders(
  items: Awaited<ReturnType<typeof getServiceOrders>>['items']
): OrdersPageOrder[] {
  return items.map((o) => ({
    ...o,
    itemsCount: Array.isArray(o.items) ? o.items.length : 0,
    orderType: 'service' as const,
  }));
}

function sharedProductFilters(params: {
  orderNumberQuery: string;
  customerQuery: string;
  managerQuery: string;
  dateFrom: string;
  dateTo: string;
}) {
  return {
    orderNumber: params.orderNumberQuery.trim() || undefined,
    customer: params.customerQuery.trim() || undefined,
    manager: params.managerQuery.trim() || undefined,
    dateFrom: params.dateFrom || undefined,
    dateTo: params.dateTo || undefined,
  };
}

export function useOrdersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [orders, setOrders] = useState<OrdersPageOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listKind, setListKindState] = useState<OrdersListKind>('all');
  const [orderNumberQuery, setOrderNumberQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [managerQuery, setManagerQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [listSortBy, setListSortBy] = useState<OrdersListSortBy>(() => loadOrdersListSort().sortBy);
  const [listSortOrder, setListSortOrder] = useState<OrdersListSortOrder>(
    () => loadOrdersListSort().sortOrder
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [kindCounts, setKindCounts] = useState<KindCounts>(EMPTY_KIND_COUNTS);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [paymentCounts, setPaymentCounts] = useState<Record<string, number>>({});
  const [trashOpen, setTrashOpen] = useState(false);
  const [orderPendingDelete, setOrderPendingDelete] = useState<OrdersPageOrder | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Soft-delete refresh: keep table mounted (no loading flash). Cleared when load finishes. */
  const skipListLoadingRef = useRef(false);
  const sortHydratedRef = useRef(false);

  const fetchTrashTotal = useCallback(() => getAdminOrdersTrash({ page: 1, limit: 1 }), []);
  const { trashCount, refreshTrashCount } = useAdminTrashCount(
    fetchTrashTotal,
    refreshKey,
    isSuperAdmin
  );

  const setListKind = useCallback((kind: OrdersListKind) => {
    setListKindState(kind);
    setPage(1);
    setStatusFilter('');
    setPaymentFilter('');
    setSelectedIds([]);
    setListSortBy((prev) => (kind === 'service' && prev === 'payment' ? 'createdAt' : prev));
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleListSortChange = useCallback((sortBy: string, sortOrder: OrdersListSortOrder) => {
    setListSortBy(parseOrdersListSortBy(sortBy));
    setListSortOrder(sortOrder);
    setPage(1);
  }, []);

  useEffect(() => {
    if (!sortHydratedRef.current) {
      sortHydratedRef.current = true;
      return;
    }
    persistOrdersListSort({ sortBy: listSortBy, sortOrder: listSortOrder });
  }, [listSortBy, listSortOrder]);

  useEffect(() => {
    let cancelled = false;
    const skipLoading = skipListLoadingRef.current;
    if (!skipLoading) setLoading(true);

    const shared = sharedProductFilters({
      orderNumberQuery,
      customerQuery,
      managerQuery,
      dateFrom,
      dateTo,
    });

    const sortOptions = {
      sortBy: listSortBy,
      sortOrder: listSortOrder,
    };

    const productOptions = {
      ...shared,
      ...sortOptions,
      paymentStatus: paymentFilter || undefined,
      hasDelivery: listKind === 'delivery' ? true : undefined,
    };

    const load = async () => {
      if (listKind === 'service') {
        const serviceRes = await getServiceOrders({
          page,
          limit: ORDERS_PAGE_LIMIT,
          status: statusFilter || undefined,
          ...sortOptions,
        });
        if (cancelled) return;
        setTotal(serviceRes.total);
        setOrders(mapServiceOrders(serviceRes.items));
        return;
      }

      if (listKind === 'product' || listKind === 'delivery') {
        const ordersRes = await getAdminOrders(
          page,
          ORDERS_PAGE_LIMIT,
          statusFilter || undefined,
          productOptions
        );
        if (cancelled) return;
        setTotal(ordersRes.total);
        setOrders(mapProductOrders(ordersRes.data));
        return;
      }

      const [ordersRes, serviceRes] = await Promise.all([
        getAdminOrders(page, ORDERS_PAGE_LIMIT, statusFilter || undefined, productOptions),
        getServiceOrders({
          page: 1,
          limit: ORDERS_PAGE_LIMIT,
          status:
            statusFilter === 'PENDING' || statusFilter === 'CANCELLED' ? statusFilter : undefined,
          ...sortOptions,
        }),
      ]);
      if (cancelled) return;
      const merged = [
        ...mapProductOrders(ordersRes.data),
        ...mapServiceOrders(serviceRes.items),
      ].sort((a, b) => compareOrdersForListSort(a, b, listSortBy, listSortOrder));
      setTotal(ordersRes.total + serviceRes.total);
      setOrders(merged.slice(0, ORDERS_PAGE_LIMIT));
    };

    load()
      .catch(() => {
        if (!cancelled) {
          setOrders([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (cancelled) return;
        skipListLoadingRef.current = false;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    page,
    listKind,
    statusFilter,
    orderNumberQuery,
    customerQuery,
    managerQuery,
    paymentFilter,
    dateFrom,
    dateTo,
    listSortBy,
    listSortOrder,
    refreshKey,
  ]);

  useEffect(() => {
    let cancelled = false;

    const shared = sharedProductFilters({
      orderNumberQuery,
      customerQuery,
      managerQuery,
      dateFrom,
      dateTo,
    });

    const loadCounts = async () => {
      const kindBase = {
        ...shared,
        paymentStatus: paymentFilter || undefined,
      };

      const [productRes, deliveryRes, serviceRes] = await Promise.all([
        getAdminOrders(1, 1, statusFilter || undefined, kindBase),
        getAdminOrders(1, 1, statusFilter || undefined, {
          ...kindBase,
          hasDelivery: true,
        }),
        getServiceOrders({
          page: 1,
          limit: 1,
          status:
            statusFilter === 'PENDING' ||
            statusFilter === 'CANCELLED' ||
            statusFilter === 'CONFIRMED'
              ? statusFilter || undefined
              : undefined,
        }),
      ]);

      if (cancelled) return;

      const productTotal = productRes.total;
      const serviceTotal = serviceRes.total;
      const deliveryTotal = deliveryRes.total;
      setKindCounts({
        product: productTotal,
        service: serviceTotal,
        delivery: deliveryTotal,
        all: productTotal + serviceTotal,
      });

      if (listKind === 'service') {
        const serviceStatuses = SERVICE_ORDER_STATUS_FILTER_OPTIONS;
        const [allService, ...byStatus] = await Promise.all([
          getServiceOrders({ page: 1, limit: 1 }),
          ...serviceStatuses.map((opt) =>
            getServiceOrders({ page: 1, limit: 1, status: opt.value })
          ),
        ]);
        if (cancelled) return;
        const next: Record<string, number> = { '': allService.total };
        serviceStatuses.forEach((opt, i) => {
          next[opt.value] = byStatus[i]?.total ?? 0;
        });
        setStatusCounts(next);
        setPaymentCounts({});
        return;
      }

      const statusOpts = PRODUCT_ORDER_STATUS_FILTER_OPTIONS;
      const statusShared = {
        ...shared,
        paymentStatus: paymentFilter || undefined,
        hasDelivery: listKind === 'delivery' ? true : undefined,
      };

      const [allStatus, ...byStatus] = await Promise.all([
        getAdminOrders(1, 1, undefined, statusShared),
        ...statusOpts.map((opt) => getAdminOrders(1, 1, opt.value, statusShared)),
      ]);
      if (cancelled) return;
      const nextStatus: Record<string, number> = { '': allStatus.total };
      statusOpts.forEach((opt, i) => {
        nextStatus[opt.value] = byStatus[i]?.total ?? 0;
      });
      setStatusCounts(nextStatus);

      const paymentShared = {
        ...shared,
        hasDelivery: listKind === 'delivery' ? true : undefined,
      };
      const [allPayment, ...byPayment] = await Promise.all([
        getAdminOrders(1, 1, statusFilter || undefined, paymentShared),
        ...PAYMENT_STATUS_FILTER_OPTIONS.map((opt) =>
          getAdminOrders(1, 1, statusFilter || undefined, {
            ...paymentShared,
            paymentStatus: opt.value,
          })
        ),
      ]);
      if (cancelled) return;
      const nextPayment: Record<string, number> = { '': allPayment.total };
      PAYMENT_STATUS_FILTER_OPTIONS.forEach((opt, i) => {
        nextPayment[opt.value] = byPayment[i]?.total ?? 0;
      });
      setPaymentCounts(nextPayment);
    };

    loadCounts().catch(() => {
      if (!cancelled) {
        setKindCounts(EMPTY_KIND_COUNTS);
        setStatusCounts({});
        setPaymentCounts({});
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    listKind,
    statusFilter,
    orderNumberQuery,
    customerQuery,
    managerQuery,
    paymentFilter,
    dateFrom,
    dateTo,
    refreshKey,
  ]);

  const requestDeleteOrder = useCallback(
    (order: OrdersPageOrder) => {
      if (!isSuperAdmin) return;
      setOrderPendingDelete(order);
    },
    [isSuperAdmin]
  );

  const handleConfirmDeleteOrder = useCallback(() => {
    const order = orderPendingDelete;
    if (!order?.id || !isSuperAdmin) return;
    const id = order.id;
    void (async () => {
      setDeletingOrderId(id);
      setError(null);
      try {
        if (isServiceOrder(order)) {
          await deleteServiceOrder(id);
        } else {
          await deleteAdminOrder(id);
        }
        setOrderPendingDelete(null);
        setOrders((prev) => prev.filter((o) => o.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        setSelectedIds((ids) => ids.filter((x) => x !== id));
        skipListLoadingRef.current = true;
        setRefreshKey((k) => k + 1);
        void refreshTrashCount();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось переместить заказ в корзину');
      } finally {
        setDeletingOrderId(null);
      }
    })();
  }, [isSuperAdmin, orderPendingDelete, refreshTrashCount]);

  const deleteConfirmMessage = useMemo(() => {
    if (!orderPendingDelete) return '';
    const num = orderPendingDelete.orderNumber?.trim();
    const suffix = num ? ` «${num}»` : '';
    return `Переместить заказ${suffix} в корзину? Он исчезнет из списка, восстановить можно из корзины.`;
  }, [orderPendingDelete]);

  return {
    orders,
    loading,
    total,
    page,
    setPage,
    limit: ORDERS_PAGE_LIMIT,
    listKind,
    setListKind,
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
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    listSortBy,
    listSortOrder,
    handleListSortChange,
    selectedIds,
    setSelectedIds,
    refresh,
    kindCounts,
    statusCounts,
    paymentCounts,
    isSuperAdmin,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    orderPendingDelete,
    setOrderPendingDelete,
    requestDeleteOrder,
    handleConfirmDeleteOrder,
    deleteConfirmMessage,
    deletingOrderId,
    error,
    setError,
  };
}

export type OrdersPageModel = ReturnType<typeof useOrdersPage>;
