'use client';

import Link from 'next/link';

import type { AdminOrderSummary } from '@/shared/api/admin-orders';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './OrdersPage.module.css';
import type { OrdersPageModel } from './hooks/useOrdersPage';
import { SERVICE_ORDER_STATUS_LABELS } from './orders-page.constants';
import type { OrdersPageOrder } from './orders-page.types';
import {
  formatOrderCurrency,
  formatOrderDate,
  getOrderDetailUrl,
  getOrderStatusLabel,
  getPaymentStatusLabel,
  isServiceOrder,
} from './orders-page.utils';

type OrdersPageViewProps = {
  model: OrdersPageModel;
};

export function OrdersPageView({ model }: OrdersPageViewProps) {
  const {
    orders,
    loading,
    total,
    page,
    setPage,
    limit,
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
  } = model;

  const columns = [
    {
      key: 'orderNumber',
      title: 'Заказ',
      sortable: true,
      render: (order: OrdersPageOrder) => (
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
      render: (order: OrdersPageOrder) => {
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
      render: (order: OrdersPageOrder) => {
        const productOrder = order as AdminOrderSummary;
        const isManagerCreated = Boolean(productOrder.createdByManagerId);
        const name = isManagerCreated
          ? `${order.customerFirstName ?? ''} ${order.customerLastName ?? ''}`.trim()
          : `${order.customerFirstName ?? productOrder.user?.firstName ?? ''} ${
              order.customerLastName ?? productOrder.user?.lastName ?? ''
            }`.trim();
        const email = isManagerCreated
          ? (order.customerEmail ?? '—')
          : (order.customerEmail ?? productOrder.user?.email ?? '—');
        return (
          <div className={styles.customerCell}>
            <span className={styles.customerName}>{name || '—'}</span>
            <span className={styles.customerEmail}>{email}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Статус',
      render: (order: OrdersPageOrder) => (
        <span className={`${styles.statusBadge} ${styles[`status${order.status}`]}`}>
          {isServiceOrder(order)
            ? (SERVICE_ORDER_STATUS_LABELS[order.status] ?? order.status)
            : getOrderStatusLabel(order.status)}
        </span>
      ),
    },
    {
      key: 'payment',
      title: 'Оплата',
      render: (order: OrdersPageOrder) => {
        if (isServiceOrder(order) || order.status === 'CANCELLED') {
          return <span className={styles.paymentMuted}>—</span>;
        }
        const paymentStatus = (order as AdminOrderSummary).paymentStatus ?? 'PENDING';
        return (
          <span className={`${styles.paymentBadge} ${styles[`payment${paymentStatus}`]}`}>
            {getPaymentStatusLabel(paymentStatus)}
          </span>
        );
      },
    },
    {
      key: 'total',
      title: 'Сумма',
      sortable: true,
      render: (order: OrdersPageOrder) => (
        <div className={styles.totalCell}>
          <span className={styles.totalAmount}>{formatOrderCurrency(Number(order.total))}</span>
          <span className={styles.itemsCount}>{order.itemsCount} позиций</span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Дата',
      sortable: true,
      render: (order: OrdersPageOrder) => formatOrderDate(order.createdAt),
    },
    {
      key: 'actions',
      title: '',
      width: '80px',
      render: (order: OrdersPageOrder) => (
        <button
          className={styles.viewButton}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = getOrderDetailUrl(order);
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
          <button data-admin-mutation className={styles.bulkButton}>
            Изменить статус
          </button>
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
            window.location.href = getOrderDetailUrl(order);
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
