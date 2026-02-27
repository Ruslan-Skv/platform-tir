'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import styles from '@/pages/admin/Orders/OrdersPage.module.css';
import { type AdminOrderSummary, getAdminOrders } from '@/shared/api/admin-orders';
import { DataTable } from '@/shared/ui/admin/DataTable';

type OrderWithDelivery = AdminOrderSummary & {
  shippingAddress?: {
    street?: string;
    city?: string;
    region?: string | null;
    postalCode?: string;
    country?: string;
  } | null;
  shippingCost?: string | number;
  itemsCount?: number;
};

const STATUS_LABELS: Record<string, string> = {
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

export default function AdminOrdersShippingPage() {
  const [orders, setOrders] = useState<OrderWithDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminOrders(page, limit, statusFilter || undefined, { hasDelivery: true })
      .then((res) => {
        if (cancelled) return;
        setTotal(res.total);
        setOrders(
          res.data.map((o) => ({
            ...o,
            itemsCount: Array.isArray(o.items) ? o.items.length : 0,
          })) as OrderWithDelivery[]
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));

  const formatAddress = (order: OrderWithDelivery) => {
    const addr = order.shippingAddress;
    if (!addr) return '—';
    const parts = [addr.street, addr.city].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  };

  const columns = [
    {
      key: 'orderNumber',
      title: 'Заказ',
      render: (order: OrderWithDelivery) => (
        <span className={styles.orderNumber}>{order.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      title: 'Клиент',
      render: (order: OrderWithDelivery) => {
        const isManagerCreated = Boolean(order.createdByManagerId);
        const name = isManagerCreated
          ? `${order.customerFirstName ?? ''} ${order.customerLastName ?? ''}`.trim()
          : `${order.user?.firstName ?? ''} ${order.user?.lastName ?? ''}`.trim();
        const email = isManagerCreated ? (order.customerEmail ?? '—') : (order.user?.email ?? '—');
        return (
          <div className={styles.customerCell}>
            <span className={styles.customerName}>{name || '—'}</span>
            <span className={styles.customerEmail}>{email}</span>
          </div>
        );
      },
    },
    {
      key: 'address',
      title: 'Адрес доставки',
      render: (order: OrderWithDelivery) => (
        <span className={styles.addressCell}>{formatAddress(order)}</span>
      ),
    },
    {
      key: 'shippingCost',
      title: 'Стоимость доставки',
      render: (order: OrderWithDelivery) =>
        order.shippingCost != null ? formatCurrency(Number(order.shippingCost)) : '—',
    },
    {
      key: 'status',
      title: 'Статус',
      render: (order: OrderWithDelivery) => (
        <span className={`${styles.statusBadge} ${styles[`status${order.status}`] ?? ''}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Дата',
      render: (order: OrderWithDelivery) => formatDate(order.createdAt),
    },
    {
      key: 'actions',
      title: '',
      width: '80px',
      render: (order: OrderWithDelivery) => (
        <Link href={`/admin/orders/${order.id}`} className={styles.viewButton}>
          Открыть
        </Link>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Заказы по доставке</h1>
          <span className={styles.count}>{total} заказов</span>
        </div>
      </div>

      <p className={styles.subtitle} style={{ marginBottom: 16 }}>
        Все заказы, в которых оформлена доставка. Настройки расчёта доставки — в разделе{' '}
        <Link
          href="/admin/settings/delivery"
          style={{ color: '#4f46e5', textDecoration: 'underline' }}
        >
          Настройки → Доставка
        </Link>
        .
      </p>

      <div className={styles.filters}>
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
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка заказов...</div>
      ) : (
        <DataTable
          data={orders}
          columns={columns}
          keyExtractor={(order) => order.id}
          onRowClick={(order) => {
            window.location.href = `/admin/orders/${order.id}`;
          }}
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
