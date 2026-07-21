'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import cdHubModals from '../../../../styles/hub-modals.module.css';
import { packageKindUiLabel, packageKindsWithCreateEnabled } from '../../../config';
import { PackageHubModal } from '../../../platform/hub/hubModal/PackageHubModal';
import { PackageWorkOrdersHubListModal } from '../../../platform/hub/workOrders/PackageWorkOrdersHubListModal';
import createDirectionStyles from './ContractsCreateDirectionModal.module.css';
import type { ContractsListActPhotoItem } from './contractsListActPhotos';
import { PackageContractTrashModal } from './modals/PackageContractTrashModal';

type ContractsListModalsProps = {
  creating: boolean;
  createDirectionModalOpen: boolean;
  createDirectionBusyKind: ContractDocumentPackageKind | null;
  onCloseCreateDirection: () => void;
  onCreate: (kind: ContractDocumentPackageKind) => void;
  actPhotosModal: { items: ContractsListActPhotoItem[]; contractLabel: string } | null;
  onCloseActPhotos: () => void;
  deleteConfirmOpen: boolean;
  deleteConfirmMessage: string;
  onCloseDeleteConfirm: () => void;
  onConfirmDelete: () => void;
  trashOpen: boolean;
  onCloseTrash: () => void;
  onTrashRestored: () => void;
  packageHubPackageId: string | null;
  onClosePackageHub: () => void;
  onPackageHubUpdated: () => void;
  workOrdersHubPackageId: string | null;
  onCloseWorkOrdersHub: () => void;
  onWorkOrdersHubUpdated: () => void;
};

export function ContractsListModals({
  creating,
  createDirectionModalOpen,
  createDirectionBusyKind,
  onCloseCreateDirection,
  onCreate,
  actPhotosModal,
  onCloseActPhotos,
  deleteConfirmOpen,
  deleteConfirmMessage,
  onCloseDeleteConfirm,
  onConfirmDelete,
  trashOpen,
  onCloseTrash,
  onTrashRestored,
  packageHubPackageId,
  onClosePackageHub,
  onPackageHubUpdated,
  workOrdersHubPackageId,
  onCloseWorkOrdersHub,
  onWorkOrdersHubUpdated,
}: ContractsListModalsProps) {
  return (
    <>
      <Modal
        isOpen={createDirectionModalOpen}
        onClose={() => {
          if (creating) return;
          onCloseCreateDirection();
        }}
        title="Новое оформление договора"
        size="sm"
        className={crmFormStyles.modalPanel}
        showCloseButton={!creating}
        compactOnMobile
      >
        <div
          className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
          data-modal-form
          data-modal-density="compact"
        >
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Выберите направление, по которому создаётся пакет документов.
          </p>
          <div
            className={createDirectionStyles.directionList}
            role="group"
            aria-label="Направление"
          >
            {packageKindsWithCreateEnabled().map((kind, index) => (
              <button
                key={kind}
                type="button"
                data-modal-btn={index === 0 ? 'primary' : 'secondary'}
                disabled={creating}
                aria-busy={createDirectionBusyKind === kind}
                onClick={() => void onCreate(kind)}
              >
                {createDirectionBusyKind === kind ? 'Создание…' : packageKindUiLabel(kind)}
              </button>
            ))}
          </div>
          <div data-modal-form-actions>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={creating}
              onClick={onCloseCreateDirection}
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={actPhotosModal != null}
        onClose={onCloseActPhotos}
        title={
          actPhotosModal
            ? `Фото актов (${actPhotosModal.contractLabel})`
            : 'Фото актов к статусам договора'
        }
        size="lg"
        compactOnMobile
      >
        {actPhotosModal ? (
          <div data-modal-form data-modal-density="compact">
            <p data-modal-form-hint style={{ marginTop: 0 }}>
              Снимки, загруженные при установке этапов «В работе» и «Договор закрыт».
            </p>
            <div className={cdHubModals.packageAttachedActPhotosList}>
              {actPhotosModal.items.map((it) => (
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
                  <p className={cdHubModals.packageAttachedActPhotoLinkLine}>
                    <a href={it.src} target="_blank" rel="noopener noreferrer">
                      Открыть в полном размере
                    </a>
                  </p>
                </section>
              ))}
            </div>
            <div data-modal-form-actions>
              <button type="button" data-modal-btn="secondary" onClick={onCloseActPhotos}>
                Закрыть
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={onCloseDeleteConfirm}
        onConfirm={onConfirmDelete}
        title="Переместить в корзину?"
        message={deleteConfirmMessage}
        confirmText="В корзину"
        cancelText="Отмена"
        variant="danger"
      />

      <PackageContractTrashModal
        isOpen={trashOpen}
        onClose={onCloseTrash}
        onRestored={onTrashRestored}
      />

      {packageHubPackageId ? (
        <PackageHubModal
          packageId={packageHubPackageId}
          isOpen
          onClose={onClosePackageHub}
          onUpdated={onPackageHubUpdated}
        />
      ) : null}

      {workOrdersHubPackageId ? (
        <PackageWorkOrdersHubListModal
          packageId={workOrdersHubPackageId}
          isOpen
          onClose={onCloseWorkOrdersHub}
          onUpdated={onWorkOrdersHubUpdated}
        />
      ) : null}
    </>
  );
}
