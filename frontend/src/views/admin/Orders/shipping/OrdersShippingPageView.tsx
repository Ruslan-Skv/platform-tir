'use client';

import Link from 'next/link';

import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from '../list/OrdersPage.module.css';
import { ORDER_STATUS_LABELS } from '../list/orders-page.constants';
import { formatOrderCurrency, formatOrderDate } from '../list/orders-page.utils';
import type { OrdersShippingPageModel } from './hooks/useOrdersShippingPage';
import { type ShippingOrder, formatShippingAddress } from './orders-shipping-page.utils';

type OrdersShippingPageViewProps = {
  model: OrdersShippingPageModel;
};

export function OrdersShippingPageView({ model }: OrdersShippingPageViewProps) {
  const { orders, loading, total, page, setPage, limit, statusFilter, setStatusFilter } = model;

  const columns = [
    {
      key: 'orderNumber',
      title: 'Заказ',
      render: (order: ShippingOrder) => (
        <span className={styles.orderNumber}>{order.orderNumber}</span>
      ),
    },
    {
      key: 'customer',
      title: 'Клиент',
      render: (order: ShippingOrder) => {
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
      render: (order: ShippingOrder) => (
        <span className={styles.addressCell}>{formatShippingAddress(order)}</span>
      ),
    },
    {
      key: 'shippingCost',
      title: 'Стоимость доставки',
      render: (order: ShippingOrder) =>
        order.shippingCost != null ? formatOrderCurrency(Number(order.shippingCost)) : '—',
    },
    {
      key: 'status',
      title: 'Статус',
      render: (order: ShippingOrder) => (
        <span className={`${styles.statusBadge} ${styles[`status${order.status}`] ?? ''}`}>
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Дата',
      render: (order: ShippingOrder) => formatOrderDate(order.createdAt),
    },
    {
      key: 'actions',
      title: '',
      width: '80px',
      render: (order: ShippingOrder) => (
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

      <p className={`${styles.subtitle} ${styles.subtitleSpaced}`}>
        Все заказы, в которых оформлена доставка. Настройки расчёта доставки — в разделе{' '}
        <Link href="/admin/settings/delivery" className={styles.introLink}>
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
