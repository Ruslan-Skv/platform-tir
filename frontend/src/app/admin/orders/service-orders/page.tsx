'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { type ServiceOrderSummary, getServiceOrders } from '@/shared/api/admin-orders';

import styles from './page.module.css';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждён',
  CANCELLED: 'Отменён',
};

export default function AdminServiceOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getServiceOrders({ page, limit: 20, status: statusFilter || undefined })
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

  const formatCurrency = (value: number | string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(Number(value));
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Заказы на услуги</h1>
        <Link href="/admin/orders" className={styles.backLink}>
          ← К заказам товаров
        </Link>
      </div>

      <div className={styles.filters}>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={styles.select}
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className={styles.loading}>Загрузка...</p>
      ) : orders.length === 0 ? (
        <p className={styles.empty}>Нет заказов на услуги</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>№ заказа</th>
                <th>Дата</th>
                <th>Покупатель</th>
                <th>Статус</th>
                <th>Сумма</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.orderNumber}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td>
                    <span className={styles.customerEmail}>{o.customerEmail}</span>
                    {(o.customerFirstName || o.customerLastName) && (
                      <span className={styles.customerName}>
                        {' '}
                        {[o.customerFirstName, o.customerLastName].filter(Boolean).join(' ')}
                      </span>
                    )}
                  </td>
                  <td>{STATUS_LABELS[o.status] ?? o.status}</td>
                  <td>{formatCurrency(o.total)}</td>
                  <td>
                    <Link href={`/admin/orders/service-orders/${o.id}`} className={styles.link}>
                      Детали
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 20 && (
        <div className={styles.pagination}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </button>
          <span>
            Страница {page} из {Math.ceil(total / 20)}
          </span>
          <button
            type="button"
            disabled={page >= Math.ceil(total / 20)}
            onClick={() => setPage((p) => p + 1)}
          >
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
