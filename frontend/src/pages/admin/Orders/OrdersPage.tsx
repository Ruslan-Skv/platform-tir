'use client';

import { useState } from 'react';

import { DataTable } from '@/shared/ui/admin/DataTable';

import styles from './OrdersPage.module.css';

interface Order {
  id: string;
  orderNumber: string;
  user: { firstName: string; lastName: string; email: string };
  status: string;
  paymentStatus: string;
  total: number;
  itemsCount: number;
  createdAt: string;
}

// Mock data
const mockOrders: Order[] = [
  {
    id: '1',
    orderNumber: '#12345',
    user: { firstName: 'Иван', lastName: 'Петров', email: 'ivan@mail.ru' },
    status: 'PENDING',
    paymentStatus: 'PENDING',
    total: 125000,
    itemsCount: 3,
    createdAt: '2026-01-19T10:30:00',
  },
  {
    id: '2',
    orderNumber: '#12344',
    user: { firstName: 'Мария', lastName: 'Сидорова', email: 'maria@mail.ru' },
    status: 'PROCESSING',
    paymentStatus: 'PAID',
    total: 78500,
    itemsCount: 2,
    createdAt: '2026-01-19T09:15:00',
  },
  {
    id: '3',
    orderNumber: '#12343',
    user: { firstName: 'Сергей', lastName: 'Козлов', email: 'sergey@mail.ru' },
    status: 'SHIPPED',
    paymentStatus: 'PAID',
    total: 234000,
    itemsCount: 5,
    createdAt: '2026-01-18T16:45:00',
  },
  {
    id: '4',
    orderNumber: '#12342',
    user: { firstName: 'Анна', lastName: 'Николаева', email: 'anna@mail.ru' },
    status: 'DELIVERED',
    paymentStatus: 'PAID',
    total: 45000,
    itemsCount: 1,
    createdAt: '2026-01-17T14:20:00',
  },
];

export function OrdersPage() {
  const [orders] = useState<Order[]>(mockOrders);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
            {order.user.firstName} {order.user.lastName}
          </span>
          <span className={styles.customerEmail}>{order.user.email}</span>
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
        <span className={`${styles.paymentBadge} ${styles[`payment${order.paymentStatus}`]}`}>
          {getPaymentLabel(order.paymentStatus)}
        </span>
      ),
    },
    {
      key: 'total',
      title: 'Сумма',
      sortable: true,
      render: (order: Order) => (
        <div className={styles.totalCell}>
          <span className={styles.totalAmount}>{formatCurrency(order.total)}</span>
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
          <span className={styles.count}>{orders.length} заказов</span>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>8</span>
          <span className={styles.statLabel}>Ожидают обработки</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>5</span>
          <span className={styles.statLabel}>В обработке</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>3</span>
          <span className={styles.statLabel}>Отправлены</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatCurrency(482500)}</span>
          <span className={styles.statLabel}>Сумма за сегодня</span>
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
          page: 1,
          limit: 20,
          total: orders.length,
          onPageChange: (page) => console.log('Page:', page),
        }}
      />
    </div>
  );
}
