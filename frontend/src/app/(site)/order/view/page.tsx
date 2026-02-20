'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import {
  type UserOrder,
  formatApprovalCountdown,
  getApprovalRemainingMs,
  getUserOrderByToken,
} from '@/shared/api/user-orders';

import styles from './page.module.css';

export default function OrderViewByTokenPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [order, setOrder] = useState<UserOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!token) {
      setError('Не указана ссылка на заказ');
      setLoading(false);
      return;
    }
    let cancelled = false;
    getUserOrderByToken(token)
      .then((data) => {
        if (!cancelled) setOrder(data);
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
  }, [token]);

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
          <h1 className={styles.title}>Заказ</h1>
          <p>{error ?? 'Заказ не найден'}</p>
          <p className={styles.hint}>
            Ссылка могла истечь или быть недействительной. Если у вас есть аккаунт, войдите в личный
            кабинет, чтобы просмотреть заказы.
          </p>
          <Link href="/" className={styles.link}>
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const total = typeof order.total === 'string' ? parseFloat(order.total) : Number(order.total);
  const approvalRemainingMs = getApprovalRemainingMs(order.approvedAt ?? null);
  const approvalExpired = approvalRemainingMs <= 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Ваш заказ {order.orderNumber}</h1>
      {order.adminEditedAt && (
        <p className={styles.editedBadge} role="status">
          Изменено менеджером
        </p>
      )}
      {order.status === 'APPROVED' && order.approvedAt && !approvalExpired && (
        <p className={styles.approvalCountdown}>
          Оформить и оплатить в течение:{' '}
          <span className={styles.approvalCountdownTime}>
            {formatApprovalCountdown(approvalRemainingMs)}
          </span>
        </p>
      )}
      {approvalExpired && order.status === 'APPROVED' && (
        <p className={styles.expiredNotice}>
          Время действия заказа истекло. Обратитесь к менеджеру для уточнения.
        </p>
      )}

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Товаров:</span>
          <span>{order.items.length}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Сумма:</span>
          <span className={styles.totalPrice}>{total.toLocaleString('ru-RU')} ₽</span>
        </div>
        {(Number(order.shippingCost ?? 0) > 0 || Number(order.carryCost ?? 0) > 0) && (
          <div className={styles.deliveryBreakdown}>
            <div className={styles.deliveryBreakdownTitle}>
              Стоимость доставки
              {order.deliveryPaymentMode === 'ON_SITE' && (
                <span className={styles.deliveryPayOnSiteBadge} role="status">
                  Оплатить водителю
                </span>
              )}
            </div>
            <div className={styles.deliveryBreakdownRow}>
              <span>Доставка:</span>
              <span>{Number(order.shippingCost ?? 0).toLocaleString('ru-RU')} ₽</span>
            </div>
            {order.carryCost != null && Number(order.carryCost) > 0 && (
              <div className={styles.deliveryBreakdownRow}>
                <span>
                  {order.moversCount != null && order.moversCount > 0
                    ? `${order.moversCount} грузчик${order.moversCount === 1 ? '' : order.moversCount < 5 ? 'а' : 'ов'}:`
                    : 'Грузчики:'}
                </span>
                <span>{Number(order.carryCost).toLocaleString('ru-RU')} ₽</span>
              </div>
            )}
          </div>
        )}
        {order.plannedDeliveryDate && (
          <div className={styles.summaryRow}>
            <span>Планируемая дата доставки:</span>
            <span>{new Date(order.plannedDeliveryDate).toLocaleDateString('ru-RU')}</span>
          </div>
        )}
      </div>

      <div className={styles.items}>
        <h2>Состав заказа</h2>
        <ul>
          {order.items.map((item) => (
            <li key={item.id}>
              {item.product?.name ?? 'Товар'} × {item.quantity} —{' '}
              {(Number(item.price) * item.quantity).toLocaleString('ru-RU')} ₽
            </li>
          ))}
        </ul>
      </div>

      <p className={styles.hint}>
        Для оплаты и уточнения деталей доставки свяжитесь с менеджером или войдите в личный кабинет,
        если у вас есть аккаунт.
      </p>

      <div className={styles.actions}>
        <Link href="/login" className={styles.primaryLink}>
          Войти в личный кабинет
        </Link>
        <Link href="/" className={styles.secondaryLink}>
          На главную
        </Link>
      </div>
    </div>
  );
}
