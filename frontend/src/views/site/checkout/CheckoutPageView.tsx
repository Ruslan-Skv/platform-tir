'use client';

import React, { Suspense, useEffect, useState } from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { PublicOfferAcceptFields } from '@/features/public-offer/ui/PublicOfferAcceptField';
import {
  useApplicablePublicOffers,
  usePublicOfferAcceptance,
} from '@/features/public-offer/useApplicablePublicOffers';
import { SellerLegalNoticeBlock } from '@/features/seller-legal/ui/SellerLegalNoticeBlock';
import {
  type UserOrder,
  formatApprovalCountdown,
  getApprovalRemainingMs,
  getUserOrder,
} from '@/shared/api/user-orders';

import styles from './CheckoutPage.module.css';

function CheckoutContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { data: applicableOffers = [] } = useApplicablePublicOffers(
    { orderId },
    { enabled: Boolean(orderId) }
  );
  const offerRequired = applicableOffers.length > 0;
  const {
    acceptedIds: acceptedOfferIds,
    toggleOffer,
    allAccepted: allOffersAccepted,
  } = usePublicOfferAcceptance(applicableOffers);
  const [order, setOrder] = useState<UserOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

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
  const approvalValidMinutes = order.approvalValidMinutes ?? 60;
  const approvalRemainingMs = getApprovalRemainingMs(
    order.approvedAt ?? null,
    approvalValidMinutes
  );
  const approvalExpired = approvalRemainingMs <= 0;

  if (approvalExpired) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1 className={styles.title}>Оформление заказа</h1>
          <p>
            Время действия заказа истекло ({approvalValidMinutes} мин). Заказ снова на проверке.
          </p>
          <Link href="/cart" className={styles.link}>
            Вернуться в корзину
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Оформление заказа</h1>
      {order.adminEditedAt && (
        <p className={styles.editedBadge} role="status">
          Изменено!
        </p>
      )}
      <p className={styles.orderNumber}>Заказ {order.orderNumber}</p>
      <p className={styles.approvalCountdown}>
        Оформить в течение:{' '}
        <span className={styles.approvalCountdownTime}>
          {formatApprovalCountdown(approvalRemainingMs)}
        </span>
      </p>
      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Товаров:</span>
          <span>{order.items.length}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Сумма:</span>
          <span className={styles.totalPrice}>{total.toLocaleString()} ₽</span>
        </div>
        {(Number(order.shippingCost ?? 0) > 0 || Number(order.carryCost ?? 0) > 0) && (
          <div className={styles.deliveryBreakdown}>
            <div className={styles.deliveryBreakdownTitle}>
              Стоимость доставки
              {order.deliveryPaymentMode === 'ON_SITE' && (
                <span className={styles.deliveryPayOnSiteBadge} role="status">
                  Оплатить водителю!
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
            <div className={styles.deliveryBreakdownTotal}>
              <span>Итого стоимость доставки:</span>
              <span>
                {(Number(order.shippingCost ?? 0) + Number(order.carryCost ?? 0)).toLocaleString(
                  'ru-RU'
                )}{' '}
                ₽
              </span>
            </div>
          </div>
        )}
        {order.plannedDeliveryDate && (
          <div className={styles.summaryRow}>
            <span>Планируемая дата доставки:</span>
            <span>{new Date(order.plannedDeliveryDate).toLocaleDateString('ru-RU')}</span>
          </div>
        )}
      </div>
      <p className={styles.hint}>
        Укажите адрес доставки и способ оплаты. Раздел оплаты можно подключить позже.
      </p>
      <SellerLegalNoticeBlock variant="card" className={styles.sellerLegalNotice} />
      <PublicOfferAcceptFields
        offers={applicableOffers}
        acceptedIds={acceptedOfferIds}
        onToggle={toggleOffer}
        className={styles.offerAcceptField}
      />
      {offerRequired && !allOffersAccepted ? (
        <p className={styles.offerHint}>
          Для продолжения оформления примите условия всех применимых договоров оферты.
        </p>
      ) : null}
      <Link href="/cart" className={styles.backLink}>
        ← Вернуться в корзину
      </Link>
    </div>
  );
}

export function CheckoutPageView() {
  return (
    <Suspense
      fallback={
        <div className={styles.container}>
          <div className={styles.loading}>Загрузка...</div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
