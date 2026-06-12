'use client';

import type { UserOrder } from '@/shared/api/user-orders';

import styles from './CartPage.module.css';

export type SendToEmailCustomerForm = {
  customerEmail: string;
  customerFirstName: string;
  customerMiddleName: string;
  customerLastName: string;
  customerPhone: string;
};

type CartPageModalsProps = {
  showAddToApprovedModal: boolean;
  showAddToPendingReviewModal: boolean;
  showSendToEmailModal: boolean;
  approvedOrder: UserOrder | null;
  submitInProgress: boolean;
  sendToEmailInProgress: boolean;
  sendToEmailCustomer: SendToEmailCustomerForm;
  sendToEmailMessage: string | null;
  onCloseAddToApproved: () => void;
  onCloseAddToPendingReview: () => void;
  onCloseSendToEmail: () => void;
  onSubmitAddToApproved: () => void;
  onSubmitAddToPendingReview: () => void;
  onSubmitSendToEmail: () => void;
  onSendToEmailCustomerChange: (
    updater: (prev: SendToEmailCustomerForm) => SendToEmailCustomerForm
  ) => void;
};

export function CartPageModals({
  showAddToApprovedModal,
  showAddToPendingReviewModal,
  showSendToEmailModal,
  approvedOrder,
  submitInProgress,
  sendToEmailInProgress,
  sendToEmailCustomer,
  sendToEmailMessage,
  onCloseAddToApproved,
  onCloseAddToPendingReview,
  onCloseSendToEmail,
  onSubmitAddToApproved,
  onSubmitAddToPendingReview,
  onSubmitSendToEmail,
  onSendToEmailCustomerChange,
}: CartPageModalsProps) {
  return (
    <>
      {showAddToApprovedModal && (
        <div
          className={styles.confirmModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-to-approved-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseAddToApproved();
          }}
        >
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <h3 id="add-to-approved-modal-title" className={styles.confirmModalTitle}>
              Добавить товары к проверенному заказу?
            </h3>
            <p className={styles.confirmModalText}>
              У вас уже есть проверенный заказ. При отправке новых товаров и услуг на проверку они
              будут добавлены к вашему проверенному заказу, и заказ снова отправится на проверку
              менеджеру.
            </p>
            <p className={styles.confirmModalHint}>
              После проверки вы сможете оформить и оплатить весь заказ целиком.
            </p>
            <div className={styles.confirmModalActions}>
              <button
                type="button"
                className={styles.confirmModalButtonSecondary}
                onClick={onCloseAddToApproved}
                disabled={submitInProgress}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.confirmModalButtonPrimary}
                onClick={onSubmitAddToApproved}
                disabled={submitInProgress}
              >
                {submitInProgress ? 'Отправка…' : 'Да, добавить к заказу'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSendToEmailModal && approvedOrder && (
        <div
          className={styles.confirmModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="send-to-email-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !sendToEmailInProgress) onCloseSendToEmail();
          }}
        >
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <h3 id="send-to-email-modal-title" className={styles.confirmModalTitle}>
              Отправить заказ на email клиенту
            </h3>
            <p className={styles.confirmModalText}>
              Заполните данные покупателя. На указанный email будет отправлена ссылка на просмотр и
              оформление заказа.
            </p>
            <div className={styles.sendToEmailForm}>
              <div className={styles.sendToEmailRow}>
                <div className={styles.sendToEmailField}>
                  <label className={styles.sendToEmailLabel} htmlFor="send-email">
                    Email <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="send-email"
                    type="email"
                    value={sendToEmailCustomer.customerEmail}
                    onChange={(e) =>
                      onSendToEmailCustomerChange((s) => ({ ...s, customerEmail: e.target.value }))
                    }
                    className={styles.sendToEmailInput}
                    placeholder="customer@example.com"
                  />
                </div>
                <div className={styles.sendToEmailField}>
                  <label className={styles.sendToEmailLabel} htmlFor="send-phone">
                    Телефон
                  </label>
                  <input
                    id="send-phone"
                    type="tel"
                    value={sendToEmailCustomer.customerPhone}
                    onChange={(e) =>
                      onSendToEmailCustomerChange((s) => ({ ...s, customerPhone: e.target.value }))
                    }
                    className={styles.sendToEmailInput}
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>
              </div>
              <div className={styles.sendToEmailRow}>
                <div className={styles.sendToEmailField}>
                  <label className={styles.sendToEmailLabel} htmlFor="send-lastName">
                    Фамилия
                  </label>
                  <input
                    id="send-lastName"
                    type="text"
                    value={sendToEmailCustomer.customerLastName}
                    onChange={(e) =>
                      onSendToEmailCustomerChange((s) => ({
                        ...s,
                        customerLastName: e.target.value,
                      }))
                    }
                    className={styles.sendToEmailInput}
                  />
                </div>
                <div className={styles.sendToEmailField}>
                  <label className={styles.sendToEmailLabel} htmlFor="send-firstName">
                    Имя
                  </label>
                  <input
                    id="send-firstName"
                    type="text"
                    value={sendToEmailCustomer.customerFirstName}
                    onChange={(e) =>
                      onSendToEmailCustomerChange((s) => ({
                        ...s,
                        customerFirstName: e.target.value,
                      }))
                    }
                    className={styles.sendToEmailInput}
                  />
                </div>
                <div className={styles.sendToEmailField}>
                  <label className={styles.sendToEmailLabel} htmlFor="send-middleName">
                    Отчество
                  </label>
                  <input
                    id="send-middleName"
                    type="text"
                    value={sendToEmailCustomer.customerMiddleName}
                    onChange={(e) =>
                      onSendToEmailCustomerChange((s) => ({
                        ...s,
                        customerMiddleName: e.target.value,
                      }))
                    }
                    className={styles.sendToEmailInput}
                  />
                </div>
              </div>
              {sendToEmailMessage && (
                <p className={styles.sendToEmailError} role="alert">
                  {sendToEmailMessage}
                </p>
              )}
            </div>
            <div className={styles.confirmModalActions}>
              <button
                type="button"
                className={styles.confirmModalButtonSecondary}
                onClick={() => !sendToEmailInProgress && onCloseSendToEmail()}
                disabled={sendToEmailInProgress}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.confirmModalButtonPrimary}
                onClick={onSubmitSendToEmail}
                disabled={sendToEmailInProgress}
              >
                {sendToEmailInProgress ? 'Отправка…' : 'Отправить на email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddToPendingReviewModal && (
        <div
          className={styles.confirmModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-to-pending-review-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseAddToPendingReview();
          }}
        >
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <h3 id="add-to-pending-review-modal-title" className={styles.confirmModalTitle}>
              Обновить заказ на проверке?
            </h3>
            <p className={styles.confirmModalText}>
              У вас уже есть заказ на проверке. При отправке новых товаров и услуг они добавятся к
              этому заказу, и проверка запустится заново с обновлённым списком товаров и услуг.
            </p>
            <p className={styles.confirmModalHint}>
              Менеджер увидит объединённый заказ и проверит его заново.
            </p>
            <div className={styles.confirmModalActions}>
              <button
                type="button"
                className={styles.confirmModalButtonSecondary}
                onClick={onCloseAddToPendingReview}
                disabled={submitInProgress}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.confirmModalButtonPrimary}
                onClick={onSubmitAddToPendingReview}
                disabled={submitInProgress}
              >
                {submitInProgress ? 'Отправка…' : 'Да, обновить заказ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
