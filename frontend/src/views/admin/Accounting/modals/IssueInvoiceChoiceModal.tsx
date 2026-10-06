'use client';

import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

export type IssueInvoiceChoice = 'contract' | 'free';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onPick: (choice: IssueInvoiceChoice) => void;
};

/** Выбор сценария выставления счёта: по договору из базы или без договора. */
export function IssueInvoiceChoiceModal({ isOpen, onClose, onPick }: Props) {
  const pick = (choice: IssueInvoiceChoice) => {
    onClose();
    onPick(choice);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Выставить счёт"
      size="sm"
      className={panelStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Выберите, как выставить счёт: по договору из базы или без договора в базе — с ручным
          вводом реквизитов.
        </p>
        <div data-modal-form-actions data-modal-align="center" style={{ flexDirection: 'column' }}>
          <button
            data-admin-mutation
            type="button"
            data-modal-btn="primary"
            onClick={() => pick('contract')}
          >
            Из договора в базе
          </button>
          <button
            data-admin-mutation
            type="button"
            data-modal-btn="secondary"
            onClick={() => pick('free')}
          >
            Без договора в базе
          </button>
        </div>
        <p data-modal-form-hint>
          «Из договора в базе» — найдите договор, основание и суммы подставятся автоматически. «Без
          договора» — № и дата договора, исполнитель и заказчик вводятся вручную.
        </p>
      </div>
    </Modal>
  );
}
