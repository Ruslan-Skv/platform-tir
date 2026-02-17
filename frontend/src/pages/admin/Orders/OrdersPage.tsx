'use client';

import { useEffect, useState } from 'react';

import { type AdminOrderSummary, getAdminOrders } from '@/shared/api/admin-orders';
import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './OrdersPage.module.css';

type Order = AdminOrderSummary & {
  itemsCount: number;
};

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAdminOrders(page, limit, statusFilter || undefined)
      .then((res) => {
        if (cancelled) return;
        setTotal(res.total);
        setOrders(
          res.data.map((o) => ({
            ...o,
            itemsCount: Array.isArray(o.items) ? o.items.length : 0,
          }))
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

  const columns = [
    {
      key: 'orderNumber',
      title: 'Заказ',
      sortable: true,
      render: (order: Order) => <span className={styles.orderNumber}>{order.orderNumber}</span>,
    },
    {
      key: 'customer',
      title: 'Клиент',
      render: (order: Order) => (
        <div className={styles.customerCell}>
          <span className={styles.customerName}>
            {order.user?.firstName} {order.user?.lastName}
          </span>
          <span className={styles.customerEmail}>{order.user?.email}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (order: Order) => (
        <span className={`${styles.statusBadge} ${styles[`status${order.status}`]}`}>
          {getStatusLabel(order.status)}
        </span>
      ),
    },
    {
      key: 'payment',
      title: 'Оплата',
      render: (order: Order) => (
        <span
          className={`${styles.paymentBadge} ${styles[`payment${order.paymentStatus ?? 'PENDING'}`]}`}
        >
          {getPaymentLabel(order.paymentStatus ?? 'PENDING')}
        </span>
      ),
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
            window.location.href = `/admin/orders/${order.id}`;
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
        </div>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Поиск по номеру, клиенту..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
            window.location.href = `/admin/orders/${order.id}`;
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
