'use client';

import Link from 'next/link';

import type { CartServiceItem } from '@/shared/api/cart';
import {
  type CalculateDeliveryResult,
  type UserOrder,
  formatApprovalCountdown,
} from '@/shared/api/user-orders';
import type { CartSection } from '@/views/cart/lib/build-cart-sections';
import { pluralizeRu } from '@/views/cart/lib/pluralize-ru';

import styles from './CartPage.module.css';

type CartSectionSummaryProps = {
  section: CartSection;
  cartSections: CartSection[];
  cartServiceItems: CartServiceItem[];
  wantDelivery: boolean;
  orderWithDelivery: UserOrder | null;
  calculatedDelivery: CalculateDeliveryResult | null;
  deliveryPaymentMode: 'WITH_ORDER' | 'ON_SITE';
  pendingOrderHasDelivery: boolean;
  returnedOrderHasDelivery: boolean;
  approvedOrderHasDelivery: boolean;
  returnedForCorrectionOrder: UserOrder | null;
  canSubmitForReview: boolean;
  submitInProgress: boolean;
  cancelInProgress: boolean;
  pendingReviewOrder: UserOrder | null;
  approvedOrder: UserOrder | null;
  approvalRemainingMs: number;
  canSendToEmail: boolean;
  onSubmitForReview: () => void;
  onCancelReview: () => void;
  onOpenSendToEmailModal: () => void;
};

export function CartSectionSummary({
  section,
  cartSections,
  cartServiceItems,
  wantDelivery,
  orderWithDelivery,
  calculatedDelivery,
  deliveryPaymentMode,
  pendingOrderHasDelivery,
  returnedOrderHasDelivery,
  approvedOrderHasDelivery,
  returnedForCorrectionOrder,
  canSubmitForReview,
  submitInProgress,
  cancelInProgress,
  pendingReviewOrder,
  approvedOrder,
  approvalRemainingMs,
  canSendToEmail,
  onSubmitForReview,
  onCancelReview,
  onOpenSendToEmailModal,
}: CartSectionSummaryProps) {
  const fallbackToReview =
    section.id === 'section1' &&
    returnedForCorrectionOrder &&
    section.products.length === 0 &&
    section.components.length === 0 &&
    cartServiceItems.length === 0;
  const displaySection = fallbackToReview ? cartSections[1] : section;

  const hasDeliveryInSummary =
    (section.id === 'section1' && wantDelivery && !orderWithDelivery && calculatedDelivery) ||
    (section.id === 'section2' &&
      (pendingOrderHasDelivery || returnedOrderHasDelivery) &&
      orderWithDelivery) ||
    (section.id === 'section3' && approvedOrderHasDelivery && orderWithDelivery);

  const baseTotal = fallbackToReview ? (cartSections[1]?.total ?? 0) : section.total;
  const deliveryAmount = hasDeliveryInSummary
    ? section.id === 'section1' && calculatedDelivery
      ? calculatedDelivery.totalShippingCost
      : orderWithDelivery
        ? Number(orderWithDelivery.shippingCost ?? 0) + Number(orderWithDelivery.carryCost ?? 0)
        : 0
    : 0;
  const sectionTotal =
    deliveryPaymentMode === 'WITH_ORDER' && hasDeliveryInSummary
      ? baseTotal + deliveryAmount
      : baseTotal;

  return (
    <div className={styles.cartSectionSummary}>
      <div className={styles.cartSectionSummaryRows}>
        <div className={styles.cartSectionSummaryRow}>
          <span className={styles.cartSectionSummaryLabel}>Товары:</span>
          <span>
            {displaySection.productCount}{' '}
            {pluralizeRu(displaySection.productCount, 'товар', 'товара', 'товаров')} ·{' '}
            {displaySection.productTotal.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        <div className={styles.cartSectionSummaryRow}>
          <span className={styles.cartSectionSummaryLabel}>Услуги:</span>
          <span>
            {displaySection.serviceCategoryCount}{' '}
            {pluralizeRu(displaySection.serviceCategoryCount, 'услуга', 'услуги', 'услуг')} ·{' '}
            {displaySection.serviceTotal.toLocaleString('ru-RU')} ₽
          </span>
        </div>
        {hasDeliveryInSummary ? (
          <>
            <div className={styles.cartSectionSummaryRow}>
              <span className={styles.cartSectionSummaryLabel}>Доставка:</span>
              <span>
                {section.id === 'section1' && calculatedDelivery
                  ? calculatedDelivery.totalShippingCost.toLocaleString()
                  : orderWithDelivery
                    ? (
                        Number(orderWithDelivery.shippingCost ?? 0) +
                        Number(orderWithDelivery.carryCost ?? 0)
                      ).toLocaleString()
                    : '0'}{' '}
                ₽
              </span>
            </div>
            {deliveryPaymentMode === 'ON_SITE' && (
              <p className={styles.cartSectionDeliveryNote}>
                Стоимость доставки не включена в заказ
              </p>
            )}
          </>
        ) : (
          <div className={styles.cartSectionSummaryRow}>
            <span className={styles.cartSectionSummaryLabel}>Доставка:</span>
            <span>—</span>
          </div>
        )}
        <div className={`${styles.cartSectionSummaryRow} ${styles.cartSectionSummaryRowTotal}`}>
          <span className={styles.cartSectionTotalLabel}>Итого:</span>
          <span className={styles.cartSectionTotal}>{sectionTotal.toLocaleString()} ₽</span>
        </div>
      </div>

      {section.id === 'section1' && returnedForCorrectionOrder && (
        <div className={styles.returnedForCorrectionBanner} role="alert">
          <p className={styles.returnedForCorrectionTitle}>
            Заказ {returnedForCorrectionOrder.orderNumber} отправлен на доработку
          </p>
          {returnedForCorrectionOrder.returnedForCorrectionComment && (
            <p className={styles.returnedForCorrectionHint}>
              {returnedForCorrectionOrder.returnedForCorrectionComment}
            </p>
          )}
        </div>
      )}

      {section.id === 'section1' && canSubmitForReview && (
        <div className={styles.cartSectionActions}>
          <button
            type="button"
            className={styles.checkoutButton}
            onClick={onSubmitForReview}
            disabled={submitInProgress || !canSubmitForReview}
          >
            {submitInProgress
              ? 'Отправка...'
              : returnedForCorrectionOrder
                ? 'Отправить на проверку повторно'
                : 'Отправить на проверку'}
          </button>
          {!returnedForCorrectionOrder && (
            <p className={styles.checkoutHint}>Обычно проверка длится около 15 минут</p>
          )}
        </div>
      )}

      {section.id === 'section2' && (pendingReviewOrder || returnedForCorrectionOrder) && (
        <div className={styles.cartSectionActions}>
          {returnedForCorrectionOrder && (
            <p className={styles.cartSectionHint}>
              Менеджер оставил комментарии. Внесите изменения и нажмите кнопку «Отправить на
              проверку» в блоке выше.
            </p>
          )}
          {pendingReviewOrder && (
            <p className={`${styles.checkoutHint} ${styles.checkoutHintPink}`}>
              Обычно проверка длится около 15 минут
            </p>
          )}
          <button
            type="button"
            className={styles.cancelReviewLink}
            onClick={onCancelReview}
            disabled={cancelInProgress}
          >
            {cancelInProgress ? 'Отмена…' : 'Отменить проверку'}
          </button>
        </div>
      )}

      {section.id === 'section3' && approvedOrder && approvalRemainingMs > 0 && (
        <div className={styles.cartSectionActions}>
          <p className={styles.approvalCountdown}>
            Оформить в течение:{' '}
            <span className={styles.approvalCountdownTime}>
              {formatApprovalCountdown(approvalRemainingMs)}
            </span>
          </p>
          <Link href={`/checkout?orderId=${approvedOrder.id}`} className={styles.checkoutButton}>
            Оформить заказ
          </Link>
          {canSendToEmail && (
            <button
              type="button"
              className={styles.sendToEmailLink}
              onClick={onOpenSendToEmailModal}
            >
              Отправить заказ на email клиенту
            </button>
          )}
        </div>
      )}

      {section.id === 'section3' && approvedOrder && approvalRemainingMs <= 0 && (
        <p className={styles.checkoutHint}>Время действия заказа истекло. Обновляю…</p>
      )}
    </div>
  );
}
