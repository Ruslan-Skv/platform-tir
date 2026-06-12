'use client';

import Link from 'next/link';

import { SERVICE_ORDER_STATUS_LABELS } from '../../list/orders-page.constants';
import { formatOrderCurrency, formatOrderDate } from '../../list/orders-page.utils';
import styles from './ServiceOrdersPage.module.css';
import type { ServiceOrdersPageModel } from './hooks/useServiceOrdersPage';

type ServiceOrdersPageViewProps = {
  model: ServiceOrdersPageModel;
};

export function ServiceOrdersPageView({ model }: ServiceOrdersPageViewProps) {
  const { orders, loading, total, page, setPage, limit, statusFilter, setStatusFilter } = model;
  const totalPages = Math.ceil(total / limit);

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
          {Object.entries(SERVICE_ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
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
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNumber}</td>
                  <td>{formatOrderDate(order.createdAt)}</td>
                  <td>
                    <span className={styles.customerEmail}>{order.customerEmail}</span>
                    {(order.customerFirstName || order.customerLastName) && (
                      <span className={styles.customerName}>
                        {' '}
                        {[order.customerFirstName, order.customerLastName]
                          .filter(Boolean)
                          .join(' ')}
                      </span>
                    )}
                  </td>
                  <td>{SERVICE_ORDER_STATUS_LABELS[order.status] ?? order.status}</td>
                  <td>{formatOrderCurrency(Number(order.total))}</td>
                  <td>
                    <Link href={`/admin/orders/service-orders/${order.id}`} className={styles.link}>
                      Детали
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > limit && (
        <div className={styles.pagination}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Назад
          </button>
          <span>
            Страница {page} из {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Вперёд
          </button>
        </div>
      )}
    </div>
  );
}
