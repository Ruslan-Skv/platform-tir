'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import {
  type AdminOrderSummary,
  type ServiceOrderSummary,
  getAdminOrders,
  getServiceOrders,
} from '@/shared/api/admin-orders';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './OrdersPage.module.css';

type Order =
  | (AdminOrderSummary & { itemsCount: number; orderType?: 'product' })
  | (ServiceOrderSummary & { itemsCount: number; orderType: 'service' });

const SERVICE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждён',
  CANCELLED: 'Отменён',
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
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
      getAdminOrders(page, limit, statusFilter || undefined, {
        orderNumber: orderNumberQuery.trim() || undefined,
        customer: customerQuery.trim() || undefined,
        manager: managerQuery.trim() || undefined,
        paymentStatus: paymentFilter || undefined,
      }),
      getServiceOrders({ page: 1, limit: 100 }),
    ])
      .then(([ordersRes, serviceRes]) => {
        if (cancelled) return;
        const productOrders: Order[] = ordersRes.data.map((o) => {
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
        const serviceOrders: Order[] = serviceRes.items.map((o) => ({
          ...o,
          itemsCount: Array.isArray(o.items) ? o.items.length : 0,
          orderType: 'service' as const,
        }));
        const merged = [...productOrders, ...serviceOrders].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTotal(ordersRes.total + serviceRes.total);
        setOrders(merged.slice(0, limit));
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Ожидает',
      PENDING_REVIEW: 'На проверке',
      RETURNED_FOR_CORRECTION: 'На доработке у покупателя',
      APPROVED: 'Заказ проверен',
      PROCESSING: 'В обработке',
      SHIPPED: 'Отправлен',
      DELIVERED: 'Доставлен',
      CANCELLED: 'Отменён',
      REFUNDED: 'Возврат',
    };
    return labels[status] || status;
  };

  const getPaymentLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Ожидает оплаты',
      PAID: 'Оплачен',
      FAILED: 'Ошибка',
      REFUNDED: 'Возвращён',
    };
    return labels[status] || status;
  };

  const isServiceOrder = (
    o: Order
  ): o is ServiceOrderSummary & { itemsCount: number; orderType: 'service' } =>
    (o as { orderType?: string }).orderType === 'service';

  const columns = [
    {
      key: 'orderNumber',
      title: 'Заказ',
      sortable: true,
      render: (order: Order) => (
        <span className={styles.orderNumber}>
          {order.orderNumber}
          {isServiceOrder(order) && (
            <span className={styles.serviceOrderBadge} title="Заказ услуг">
              {' '}
              (услуги)
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'manager',
      title: 'Менеджер',
      render: (order: Order) => {
        const mgr = isServiceOrder(order)
          ? order.createdByManager
          : (order as AdminOrderSummary).processedByManager;
        return mgr ? (
          <div className={styles.customerCell}>
            <span className={styles.customerName}>
              {mgr.firstName} {mgr.lastName}
            </span>
            <span className={styles.customerEmail}>{mgr.email}</span>
          </div>
        ) : (
          <span className={styles.customerEmail}>—</span>
        );
      },
    },
    {
      key: 'customer',
      title: 'Клиент',
      render: (order: Order) => (
        <div className={styles.customerCell}>
          <span className={styles.customerName}>
            {order.customerFirstName ?? (order as AdminOrderSummary).user?.firstName ?? ''}{' '}
            {order.customerLastName ?? (order as AdminOrderSummary).user?.lastName ?? ''}
          </span>
          <span className={styles.customerEmail}>
            {order.customerEmail ?? (order as AdminOrderSummary).user?.email ?? '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (order: Order) => (
        <span className={`${styles.statusBadge} ${styles[`status${order.status}`]}`}>
          {isServiceOrder(order)
            ? (SERVICE_STATUS_LABELS[order.status] ?? order.status)
            : getStatusLabel(order.status)}
        </span>
      ),
    },
    {
      key: 'payment',
      title: 'Оплата',
      render: (order: Order) => {
        if (isServiceOrder(order) || order.status === 'CANCELLED') {
          return <span className={styles.paymentMuted}>—</span>;
        }
        const paymentStatus = (order as AdminOrderSummary).paymentStatus ?? 'PENDING';
        return (
          <span className={`${styles.paymentBadge} ${styles[`payment${paymentStatus}`]}`}>
            {getPaymentLabel(paymentStatus)}
          </span>
        );
      },
    },
    {
      key: 'total',
      title: 'Сумма',
      sortable: true,
      render: (order: Order) => (
        <div className={styles.totalCell}>
          <span className={styles.totalAmount}>{formatCurrency(Number(order.total))}</span>
          <span className={styles.itemsCount}>{order.itemsCount} позиций</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Дата',
      sortable: true,
      render: (order: Order) => formatDate(order.createdAt),
    },
    {
      key: 'actions',
      title: '',
      width: '80px',
      render: (order: Order) => (
        <button
          className={styles.viewButton}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = isServiceOrder(order)
              ? `/admin/orders/service-orders/${order.id}`
              : `/admin/orders/${order.id}`;
          }}
        >
          Открыть
        </button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Заказы</h1>
          <span className={styles.count}>{total} заказов</span>
          <Link href="/admin/orders/service-orders" className={styles.serviceOrdersLink}>
            Заказы на услуги
          </Link>
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Номер заказа"
          value={orderNumberQuery}
          onChange={(e) => setOrderNumberQuery(e.target.value)}
          className={styles.searchInput}
        />
        <input
          type="search"
          placeholder="Клиент"
          value={customerQuery}
          onChange={(e) => setCustomerQuery(e.target.value)}
          className={styles.searchInput}
        />
        <input
          type="search"
          placeholder="Менеджер"
          value={managerQuery}
          onChange={(e) => setManagerQuery(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все статусы</option>
          <option value="PENDING_REVIEW">На проверке</option>
          <option value="APPROVED">Заказ проверен</option>
          <option value="RETURNED_FOR_CORRECTION">На доработке</option>
          <option value="PENDING">Ожидают</option>
          <option value="PROCESSING">В обработке</option>
          <option value="SHIPPED">Отправлены</option>
          <option value="DELIVERED">Доставлены</option>
          <option value="CANCELLED">Отменены</option>
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className={styles.select}
        >
          <option value="">Все оплаты</option>
          <option value="PENDING">Ожидают оплаты</option>
          <option value="PAID">Оплачены</option>
          <option value="REFUNDED">Возвраты</option>
        </select>
        <input type="date" className={styles.dateInput} placeholder="От" />
        <input type="date" className={styles.dateInput} placeholder="До" />
      </div>

      {selectedIds.length > 0 && (
        <div className={styles.bulkActions}>
          <span>Выбрано: {selectedIds.length}</span>
          <button className={styles.bulkButton}>Изменить статус</button>
          <button className={styles.bulkButton}>Экспорт</button>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Загрузка заказов...</div>
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          keyExtractor={(order) => order.id}
          onRowClick={(order) => {
            window.location.href = isServiceOrder(order)
              ? `/admin/orders/service-orders/${order.id}`
              : `/admin/orders/${order.id}`;
          }}
          selectable
          onSelectionChange={setSelectedIds}
          pagination={{
            page,
            limit,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
