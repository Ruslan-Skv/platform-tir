'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { type UserOrder, getUserOrder } from '@/shared/api/user-orders';

import styles from './page.module.css';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<UserOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Не указан заказ');
      setLoading(false);
      return;
    }
    let cancelled = false;
    getUserOrder(orderId)
      .then((data) => {
        if (cancelled) return;
        if (data.status !== 'APPROVED') {
          setError('Заказ ещё не проверен. Дождитесь проверки менеджером.');
          return;
        }
        setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить заказ');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка заказа...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Оформление заказа</h1>
          <p>{error ?? 'Заказ не найден'}</p>
          <Link href="/cart" className={styles.link}>
            Вернуться в корзину
          </Link>
        </div>
      </div>
    );
  }

  const total = typeof order.total === 'string' ? parseFloat(order.total) : Number(order.total);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Оформление заказа</h1>
      <p className={styles.orderNumber}>Заказ {order.orderNumber}</p>
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Товаров:</span>
          <span>{order.items.length}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Сумма:</span>
          <span className={styles.totalPrice}>{total.toLocaleString()} ₽</span>
        </div>
      </div>
      <p className={styles.hint}>
        Укажите адрес доставки и способ оплаты. Раздел оплаты можно подключить позже.
      </p>
      <Link href="/cart" className={styles.backLink}>
        ← Вернуться в корзину
      </Link>
    </div>
  );
}
