'use client';

import { uploadPackagePaymentProofPhoto } from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import { PackageAttachedPhotosTab } from '../../editor/attachedPhotosTab/PackageAttachedPhotosTab';
import { PACKAGE_PAYMENT_PROOF_PHOTOS_MAX } from '../../form';
import type { PackageHubModalModel } from './usePackageHubModal';

type PackageHubPaymentProofsModalProps = Pick<PackageHubModalModel, 'packageId' | 'hub'>;

/** Скрины чеков об оплате, которые клиенты присылают менеджеру при оплате по QR или переводом. */
export function PackageHubPaymentProofsModal({
  packageId,
  hub,
}: PackageHubPaymentProofsModalProps) {
  return (
    <Modal
      isOpen={hub.paymentProofsModalOpen}
      onClose={() => hub.setPaymentProofsModalOpen(false)}
      title="Подтверждения оплат (чеки клиентов)"
      size="lg"
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <PackageAttachedPhotosTab
          packageId={packageId}
          inputId="package-payment-proof-photo-input"
          title="Фото-подтверждения оплат"
          hint="Прикрепите скрины чеков об оплате, которые клиент прислал после оплаты по QR или банковским переводом (jpg, png, webp, gif, до 8 МБ) — не более 12 шт. Нажмите на фото, чтобы открыть в полном размере."
          itemNoun="фото-подтверждение"
          addButtonLabel="Добавить фото"
          emptyStateText="Фото-подтверждения оплат ещё не прикреплены."
          photos={hub.form.paymentProofPhotoUrls}
          maxPhotos={PACKAGE_PAYMENT_PROOF_PHOTOS_MAX}
          uploadPhoto={uploadPackagePaymentProofPhoto}
          onAppendPhoto={(imageUrl) => void hub.appendPaymentProofPhoto(imageUrl)}
          onRemovePhoto={(index) => void hub.removePaymentProofPhoto(index)}
        />
        <div data-modal-form-actions>
          <button
            type="button"
            data-modal-btn="primary"
            onClick={() => hub.setPaymentProofsModalOpen(false)}
          >
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
