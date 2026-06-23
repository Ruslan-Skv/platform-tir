'use client';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import cdChrome from '../../../../styles/editor-chrome.module.css';
import type { PackageHubModalModel } from './usePackageHubModal';

type PackageHubRefusalModalProps = Pick<PackageHubModalModel, 'hub'>;

export function PackageHubRefusalModal({ hub }: PackageHubRefusalModalProps) {
  return (
    <Modal
      isOpen={hub.refusalModalOpen}
      onClose={() => {
        if (hub.refusalModalBusy) return;
        hub.setRefusalModalOpen(false);
        hub.setRefusalModalError(null);
      }}
      title="Отказ по проекту договора"
      size="md"
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Укажите причину отказа — она сохранится вместе со статусом «Отказ».
        </p>
        <div data-modal-form-group>
          <label htmlFor="hub_repair_contract_refusal_reason">Причина отказа</label>
          <textarea
            id="hub_repair_contract_refusal_reason"
            className={cdChrome.packageContractRefusalReasonTextarea}
            rows={5}
            value={hub.refusalReasonDraft}
            onChange={(e) => hub.setRefusalReasonDraft(e.target.value)}
            disabled={hub.refusalModalBusy}
          />
        </div>
        {hub.refusalModalError ? (
          <p data-modal-form-error role="alert">
            {hub.refusalModalError}
          </p>
        ) : null}
        <div data-modal-form-actions>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={hub.refusalModalBusy}
            onClick={() => hub.setRefusalModalOpen(false)}
          >
            Отмена
          </button>
          <button
            data-admin-mutation
            type="button"
            data-modal-btn="primary"
            disabled={hub.refusalModalBusy}
            onClick={() => void hub.handleConfirmContractRefusal()}
          >
            {hub.refusalModalBusy ? 'Сохранение…' : 'Сохранить отказ'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
