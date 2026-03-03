'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import {
  type UserOrder,
  canResendOrderToEmail,
  formatApprovalCountdown,
  getApprovalRemainingMs,
  getUserOrderByToken,
  resendOrderToCustomerEmail,
} from '@/shared/api/user-orders';

import styles from './page.module.css';

const POLL_INTERVAL_MS = 15000;

function OrderViewContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [order, setOrder] = useState<UserOrder | null>(null);
  const [canSendToEmail, setCanSendToEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [resendInProgress, setResendInProgress] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const loadOrder = useCallback(() => {
    if (!token) return;
    getUserOrderByToken(token)
      .then(setOrder)
      .catch(() => {});
  }, [token]);

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
    setLoading(true);
    setError(null);
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

  // Проверить, может ли текущий пользователь отправлять заказ на email (только менеджеры)
  useEffect(() => {
    canResendOrderToEmail()
      .then(setCanSendToEmail)
      .catch(() => setCanSendToEmail(false));
  }, []);

  // Периодическое обновление заказа, чтобы видеть изменения со стороны менеджера (админка)
  useEffect(() => {
    if (!token || !order || loading) return;
    const intervalId = setInterval(loadOrder, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [token, order?.id, loading, loadOrder]);

  // Обновить при возврате на вкладку (например, после правок в админке)
  useEffect(() => {
    if (!token || !order) return;
    const onFocus = loadOrder;
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [token, order?.id, loadOrder]);

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
  const approvalRemainingMs = getApprovalRemainingMs(
    order.approvedAt ?? null,
    order.approvalValidMinutes
  );
  const approvalExpired = approvalRemainingMs <= 0;

  const handleResendToEmail = async () => {
    if (!token) return;
    setResendInProgress(true);
    setResendMessage(null);
    try {
      const result = await resendOrderToCustomerEmail(token);
      if (result.sent) {
        setResendMessage('Заказ отправлен на email клиента');
      } else {
        setResendMessage(result.error ?? 'Не удалось отправить');
      }
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : 'Не удалось отправить');
    } finally {
      setResendInProgress(false);
    }
  };

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

      {order.status === 'APPROVED' && !approvalExpired && canSendToEmail && (
        <div className={styles.resendSection}>
          <button
            type="button"
            onClick={handleResendToEmail}
            disabled={resendInProgress}
            className={styles.resendButton}
            title="Отправить заказ на email клиенту"
          >
            {resendInProgress ? 'Отправка…' : 'Отправить заказ на email клиенту'}
          </button>
          {resendMessage && (
            <p className={styles.resendMessage} role="status">
              {resendMessage}
            </p>
          )}
        </div>
      )}

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

export default function OrderViewByTokenPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.loading}>Загрузка...</div>
        </div>
      }
    >
      <OrderViewContent />
    </Suspense>
  );
}
