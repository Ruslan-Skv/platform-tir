'use client';

import Link from 'next/link';

import { SERVICE_ORDER_STATUS_LABELS } from '../../list/orders-page.constants';
import { formatOrderCurrency, formatOrderDate } from '../../list/orders-page.utils';
import styles from './ServiceOrderDetailPage.module.css';
import type { ServiceOrderDetailPageModel } from './hooks/useServiceOrderDetailPage';

type ServiceOrderDetailPageViewProps = {
  model: ServiceOrderDetailPageModel;
};

export function ServiceOrderDetailPageView({ model }: ServiceOrderDetailPageViewProps) {
  const {
    order,
    loading,
    error,
    customerEmail,
    setCustomerEmail,
    customerFirstName,
    setCustomerFirstName,
    customerLastName,
    setCustomerLastName,
    customerPhone,
    setCustomerPhone,
    saving,
    handleSaveCustomer,
  } = model;

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Загрузка...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{error ?? 'Заказ не найден'}</p>
        <Link href="/admin/orders/service-orders" className={styles.link}>
          ← К списку заказов на услуги
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Заказ {order.orderNumber}</h1>
        <Link href="/admin/orders/service-orders" className={styles.backLink}>
          ← К списку
        </Link>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Данные покупателя</h2>
        <p className={styles.hint}>
          Заполните или отредактируйте данные покупателя. Аналогично оформлению заказов товаров.
        </p>
        <div className={styles.form}>
          <div className={styles.formRow}>
            <label className={styles.label}>
              Email <span className={styles.required}>*</span>
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={styles.input}
              placeholder="email@example.com"
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Имя</label>
            <input
              type="text"
              value={customerFirstName}
              onChange={(e) => setCustomerFirstName(e.target.value)}
              className={styles.input}
              placeholder="Иван"
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Фамилия</label>
            <input
              type="text"
              value={customerLastName}
              onChange={(e) => setCustomerLastName(e.target.value)}
              className={styles.input}
              placeholder="Иванов"
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label}>Телефон</label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className={styles.input}
              placeholder="+7 (999) 123-45-67"
            />
          </div>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSaveCustomer}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Информация о заказе</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Статус</span>
            <span>{SERVICE_ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Сумма</span>
            <span>{formatOrderCurrency(Number(order.total))}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Дата создания</span>
            <span>{formatOrderDate(order.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Позиции заказа</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Наименование</th>
              <th>Категория</th>
              <th>Кол-во</th>
              <th>Цена</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.categoryName}</td>
                <td>
                  {item.quantity} {item.unit}
                </td>
                <td>{formatOrderCurrency(Number(item.price))}</td>
                <td>{formatOrderCurrency(Number(item.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
