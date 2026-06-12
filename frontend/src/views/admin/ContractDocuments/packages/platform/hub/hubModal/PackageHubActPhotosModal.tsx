'use client';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import cdHubModals from '../../../../styles/hub-modals.module.css';
import type { PackageHubModalModel } from './usePackageHubModal';

type PackageHubActPhotosModalProps = Pick<PackageHubModalModel, 'hub'>;

export function PackageHubActPhotosModal({ hub }: PackageHubActPhotosModalProps) {
  return (
    <Modal
      isOpen={hub.actPhotosModalOpen}
      onClose={() => hub.setActPhotosModalOpen(false)}
      title="Фото актов к статусам договора"
      size="lg"
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <div className={cdHubModals.packageAttachedActPhotosList}>
          {hub.attachedActPhotos.map((it) => (
            <section key={it.key} className={cdHubModals.packageAttachedActPhotoBlock}>
              <h3 className={cdHubModals.packageAttachedActPhotoTitle}>{it.title}</h3>
              <p className={cdHubModals.packageAttachedActPhotoMeta}>
                Дата по акту: <strong>{it.dateLabel}</strong>
              </p>
              <div className={cdHubModals.packageWorkStartModalPreview}>
                <a
                  href={it.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cdHubModals.packageAttachedActPhotoImageLink}
                >
                  <img src={it.src} alt={it.title} />
                </a>
              </div>
            </section>
          ))}
        </div>
        <div data-modal-form-actions>
          <button
            type="button"
            data-modal-btn="primary"
            onClick={() => hub.setActPhotosModalOpen(false)}
          >
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
