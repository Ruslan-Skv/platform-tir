'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  type ServiceOrderSummary,
  getServiceOrder,
  updateServiceOrderCustomer,
} from '@/shared/api/admin-orders';

import styles from './page.module.css';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждён',
  CANCELLED: 'Отменён',
};

export default function AdminServiceOrderDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [order, setOrder] = useState<ServiceOrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getServiceOrder(id);
      setOrder(data);
      setCustomerEmail(data.customerEmail ?? '');
      setCustomerFirstName(data.customerFirstName ?? '');
      setCustomerLastName(data.customerLastName ?? '');
      setCustomerPhone(data.customerPhone ?? '');
    } catch {
      setError('Заказ не найден');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveCustomer = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateServiceOrderCustomer(id, {
        customerEmail: customerEmail.trim() || null,
        customerFirstName: customerFirstName.trim() || null,
        customerLastName: customerLastName.trim() || null,
        customerPhone: customerPhone.trim() || null,
      });
      setOrder(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

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
            <span>{STATUS_LABELS[order.status] ?? order.status}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Сумма</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Дата создания</span>
            <span>{formatDate(order.createdAt)}</span>
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
                <td>{formatCurrency(item.price)}</td>
                <td>{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
