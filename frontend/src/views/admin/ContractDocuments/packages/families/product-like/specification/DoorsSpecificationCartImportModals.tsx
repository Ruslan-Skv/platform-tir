'use client';

import confirmModalStyles from '@/shared/ui/ConfirmModal/ConfirmModal.module.css';
import { Modal } from '@/shared/ui/Modal';

import type {
  DoorsSpecificationCartImportInfoModal,
  DoorsSpecificationCartImportModeModal,
} from './useDoorsSpecificationCartImport';

type Props = {
  infoModal: DoorsSpecificationCartImportInfoModal | null;
  modeModal: DoorsSpecificationCartImportModeModal | null;
  onCloseInfo: () => void;
  onCloseMode: () => void;
  onChooseReplace: () => void;
  onChooseAppend: () => void;
};

export function DoorsSpecificationCartImportModals({
  infoModal,
  modeModal,
  onCloseInfo,
  onCloseMode,
  onChooseReplace,
  onChooseAppend,
}: Props) {
  return (
    <>
      <Modal
        isOpen={infoModal != null}
        onClose={onCloseInfo}
        title={infoModal?.title ?? 'Сообщение'}
        size="sm"
        showCloseButton
      >
        {infoModal ? (
          <div className={confirmModalStyles.content}>
            <p className={confirmModalStyles.message}>{infoModal.message}</p>
            <div className={confirmModalStyles.actions}>
              <button
                type="button"
                className={`${confirmModalStyles.confirmButton} ${confirmModalStyles.default}`}
                onClick={onCloseInfo}
              >
                Понятно
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={modeModal != null}
        onClose={onCloseMode}
        title="Загрузка из корзины"
        size="sm"
        showCloseButton
      >
        {modeModal ? (
          <div className={confirmModalStyles.content}>
            <p className={confirmModalStyles.message}>
              В спецификации уже есть строки. Заменить их позициями из корзины или добавить к
              существующим?
            </p>
            <div className={confirmModalStyles.actions}>
              <button
                type="button"
                className={confirmModalStyles.cancelButton}
                onClick={onCloseMode}
              >
                Отмена
              </button>
              <button
                type="button"
                className={confirmModalStyles.cancelButton}
                onClick={onChooseAppend}
              >
                Добавить
              </button>
              <button
                type="button"
                className={`${confirmModalStyles.confirmButton} ${confirmModalStyles.default}`}
                onClick={onChooseReplace}
              >
                Заменить все
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
