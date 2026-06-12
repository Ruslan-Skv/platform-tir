'use client';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import cdHubModals from '../../../../styles/hub-modals.module.css';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import type { PackageHubModalModel } from './usePackageHubModal';

type PackageHubWorkStartModalProps = Pick<
  PackageHubModalModel,
  'hub' | 'workStartFileInputRef' | 'workStartFilePreview'
>;

export function PackageHubWorkStartModal({
  hub,
  workStartFileInputRef,
  workStartFilePreview,
}: PackageHubWorkStartModalProps) {
  return (
    <Modal
      isOpen={hub.workStartModalOpen}
      onClose={() => {
        if (hub.workStartModalBusy) return;
        hub.setWorkStartModalOpen(false);
      }}
      title={
        isProductDirectionPackageKind(hub.packageKind)
          ? 'Статус «В работе» (предоплата)'
          : 'Статус «В работе»'
      }
      size="md"
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          {isProductDirectionPackageKind(hub.packageKind)
            ? 'Укажите дату получения предоплаты не менее 70% — с неё начинается отсчёт срока по договору (п. 2.2 и 3.1).'
            : 'Укажите дату начала работ и приложите фото акта начала работ.'}
        </p>
        <div
          data-modal-form-grid
          className={
            isProductDirectionPackageKind(hub.packageKind)
              ? undefined
              : cdHubModals.packageWorkStartModalTopGrid
          }
        >
          <div data-modal-form-group>
            <label htmlFor="hub_repair_work_start_act_date">
              {isProductDirectionPackageKind(hub.packageKind)
                ? 'Дата предоплаты (начало срока)'
                : 'Дата начала работ'}
            </label>
            <div className={cdHubModals.packageWorkStartModalDateFieldWrap}>
              <input
                id="hub_repair_work_start_act_date"
                type="date"
                value={hub.workStartModalDate}
                onChange={(e) => hub.setWorkStartModalDate(e.target.value)}
                disabled={hub.workStartModalBusy}
              />
            </div>
          </div>
          {hub.packageKind === 'REPAIR' ? (
            <div data-modal-form-group>
              <label htmlFor="hub_repair_work_start_act_photo">Фото акта начала работ</label>
              <div className={cdHubModals.packageWorkStartModalFileRow}>
                <input
                  ref={workStartFileInputRef}
                  id="hub_repair_work_start_act_photo"
                  type="file"
                  className={cdHubModals.packageWorkStartModalFileInputSrOnly}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  disabled={hub.workStartModalBusy}
                  onChange={(e) => hub.setWorkStartModalFile(e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="hub_repair_work_start_act_photo"
                  data-modal-btn="secondary"
                  className={cdHubModals.packageWorkStartModalFilePickBtn}
                >
                  {hub.workStartModalFile ? 'Заменить файл' : 'Выберите файл'}
                </label>
              </div>
            </div>
          ) : null}
        </div>
        {hub.packageKind === 'REPAIR' && workStartFilePreview ? (
          <div className={cdHubModals.packageWorkStartModalPreview}>
            <img src={workStartFilePreview} alt="Предпросмотр" />
          </div>
        ) : null}
        {hub.workStartModalError ? (
          <p data-modal-form-error role="alert">
            {hub.workStartModalError}
          </p>
        ) : null}
        <div data-modal-form-actions>
          <button
            type="button"
            data-modal-btn="secondary"
            disabled={hub.workStartModalBusy}
            onClick={() => hub.setWorkStartModalOpen(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            data-modal-btn="primary"
            disabled={hub.workStartModalBusy}
            onClick={() => void hub.handleConfirmWorkStart()}
          >
            {hub.workStartModalBusy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
