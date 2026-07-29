'use client';

import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from './OrderHistoryModal.module.css';
import type { OrderDetail } from './order-detail-page.types';
import { buildOrderHistory, formatEventDateTime } from './order-detail-page.utils';

type OrderHistoryModalProps = {
  isOpen: boolean;
  order: OrderDetail;
  onClose: () => void;
};

export function OrderHistoryModal({ isOpen, order, onClose }: OrderHistoryModalProps) {
  const events = buildOrderHistory(order);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`История заказа ${order.orderNumber}`}
      size="lg"
      className={`${panelStyles.modalPanel} ${styles.modalPanel}`}
      showCloseButton
    >
      <div
        className={`${panelStyles.formShell} ${modalStyles.formBlueShell} ${styles.shell}`}
        data-modal-form
        data-modal-density="compact"
      >
        <p data-modal-form-hint>
          Хронология статусов и действий по заказу: кто и когда отправил на проверку, проверил,
          вернул на доработку или изменил статус.
        </p>

        {events.length === 0 ? (
          <p data-modal-form-hint>Нет событий</p>
        ) : (
          <div className={styles.list} data-modal-readonly-panel data-modal-density="compact">
            <div className={styles.headerRow}>
              <span className={styles.colTime}>Дата и время</span>
              <span className={styles.colLabel}>Событие</span>
              <span className={styles.colDuration}>Продолжительность</span>
              <span className={styles.colAuthor}>Автор</span>
            </div>
            <ul className={styles.eventList}>
              {events.map((event) => (
                <li key={`${event.at}-${event.label}`} className={styles.eventRow}>
                  <span className={styles.colTime}>{formatEventDateTime(event.at)}</span>
                  <span className={styles.colLabel}>{event.label}</span>
                  <span className={styles.colDuration}>{event.duration ?? '—'}</span>
                  <span className={styles.colAuthor}>{event.author}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
