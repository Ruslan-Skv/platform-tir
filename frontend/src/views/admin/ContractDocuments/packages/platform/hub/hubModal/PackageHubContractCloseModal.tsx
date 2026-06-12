'use client';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/AddCrmCustomerModal.module.css';

import cdHubModals from '../../../../styles/hub-modals.module.css';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import type { PackageHubModalModel } from './usePackageHubModal';

type PackageHubContractCloseModalProps = Pick<
  PackageHubModalModel,
  'hub' | 'contractCloseFileInputRef' | 'contractCloseFilePreview'
>;

export function PackageHubContractCloseModal({
  hub,
  contractCloseFileInputRef,
  contractCloseFilePreview,
}: PackageHubContractCloseModalProps) {
  return (
    <Modal
      isOpen={hub.contractCloseModalOpen}
      onClose={() => {
        if (hub.contractCloseModalBusy) return;
        hub.setContractCloseModalOpen(false);
      }}
      title="Закрытие договора"
      size="md"
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          {isProductDirectionPackageKind(hub.packageKind)
            ? 'Укажите дату акта приёмки-передачи и приложите фото акта.'
            : 'Укажите дату акта сдачи-приёмки и приложите фото акта.'}
        </p>
        <div data-modal-form-grid className={cdHubModals.packageWorkStartModalTopGrid}>
          <div data-modal-form-group>
            <label htmlFor="hub_repair_contract_close_act_date">Дата акта сдачи-приёмки</label>
            <div className={cdHubModals.packageWorkStartModalDateFieldWrap}>
              <input
                id="hub_repair_contract_close_act_date"
                type="date"
                value={hub.contractCloseModalDate}
                onChange={(e) => hub.setContractCloseModalDate(e.target.value)}
                disabled={hub.contractCloseModalBusy}
              />
            </div>
          </div>
          <div data-modal-form-group>
            <label htmlFor="hub_repair_contract_close_act_photo">Фото акта сдачи-приёмки</label>
            <div className={cdHubModals.packageWorkStartModalFileRow}>
              <input
                ref={contractCloseFileInputRef}
                id="hub_repair_contract_close_act_photo"
                type="file"
                className={cdHubModals.packageWorkStartModalFileInputSrOnly}
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={hub.contractCloseModalBusy}
                onChange={(e) => hub.setContractCloseModalFile(e.target.files?.[0] ?? null)}
              />
              <label
                htmlFor="hub_repair_contract_close_act_photo"
                data-modal-btn="secondary"
                className={cdHubModals.packageWorkStartModalFilePickBtn}
              >
                {hub.contractCloseModalFile ? 'Заменить файл' : 'Выберите файл'}
              </label>
            </div>
          </div>
        </div>
        {contractCloseFilePreview ? (
          <div className={cdHubModals.packageWorkStartModalPreview}>
            <img src={contractCloseFilePreview} alt="Предпросмотр" />
          </div>
        ) : null}
        {hub.contractCloseModalError ? (
          <p data-modal-form-error role="alert">
            {hub.contractCloseModalError}
          </p>
        ) : null}
        <div data-modal-form-actions>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={hub.contractCloseModalBusy}
            onClick={() => hub.setContractCloseModalOpen(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            data-modal-btn="primary"
            disabled={hub.contractCloseModalBusy}
            onClick={() => void hub.handleConfirmContractClose()}
          >
            {hub.contractCloseModalBusy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
