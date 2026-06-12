'use client';

import Link from 'next/link';

import { pluralizeRu } from '@/views/cart/lib/pluralize-ru';

import styles from './CartPage.module.css';
import { CartPageModals } from './CartPageModals';
import { CartSection, shouldShowCartSection } from './CartSection';
import type { CartPageModel } from './useCartPage';

type CartPageViewProps = {
  model: CartPageModel;
};

export function CartPageView({ model }: CartPageViewProps) {
  const {
    cartServiceItems,
    submitInProgress,
    showAddToApprovedModal,
    setShowAddToApprovedModal,
    showAddToPendingReviewModal,
    setShowAddToPendingReviewModal,
    showSendToEmailModal,
    setShowSendToEmailModal,
    approvedOrder,
    sendToEmailInProgress,
    sendToEmailCustomer,
    setSendToEmailCustomer,
    sendToEmailMessage,
    returnedForCorrectionOrder,
    canSubmitForReview,
    hasAnyContent,
    allSectionsTotal,
    showInitialLoading,
    handleSendToEmailSubmit,
    doSubmitForReview,
    cartSections,
  } = model;

  if (showInitialLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка корзины...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Корзина</h1>
        {hasAnyContent && (
          <p className={styles.subtitle}>
            {allSectionsTotal.items}{' '}
            {pluralizeRu(allSectionsTotal.items, 'позиция', 'позиции', 'позиций')} на сумму{' '}
            {allSectionsTotal.total.toLocaleString('ru-RU')} ₽
          </p>
        )}
      </div>

      {!hasAnyContent ? (
        <div className={styles.empty}>
          <h2>Ваша корзина пуста</h2>
          <p>Добавьте товары или услуги в корзину, чтобы оформить заказ</p>
          <Link href="/catalog/products" className={styles.link}>
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.cartItems}>
            {cartSections.map(
              (section) =>
                shouldShowCartSection(
                  section,
                  cartServiceItems,
                  returnedForCorrectionOrder,
                  canSubmitForReview
                ) && <CartSection key={section.id} section={section} model={model} />
            )}

            <div className={styles.continueShoppingWrap}>
              <Link href="/catalog/products" className={styles.continueShopping}>
                Продолжить покупки
              </Link>
            </div>
          </div>
        </div>
      )}

      <CartPageModals
        showAddToApprovedModal={showAddToApprovedModal}
        showAddToPendingReviewModal={showAddToPendingReviewModal}
        showSendToEmailModal={showSendToEmailModal}
        approvedOrder={approvedOrder}
        submitInProgress={submitInProgress}
        sendToEmailInProgress={sendToEmailInProgress}
        sendToEmailCustomer={sendToEmailCustomer}
        sendToEmailMessage={sendToEmailMessage}
        onCloseAddToApproved={() => setShowAddToApprovedModal(false)}
        onCloseAddToPendingReview={() => setShowAddToPendingReviewModal(false)}
        onCloseSendToEmail={() => setShowSendToEmailModal(false)}
        onSubmitAddToApproved={() => doSubmitForReview({ addToApproved: true })}
        onSubmitAddToPendingReview={() => doSubmitForReview({ addToPendingReview: true })}
        onSubmitSendToEmail={handleSendToEmailSubmit}
        onSendToEmailCustomerChange={setSendToEmailCustomer}
      />
    </div>
  );
}
