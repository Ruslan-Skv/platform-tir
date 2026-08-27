'use client';

import confirmModalStyles from '@/shared/ui/ConfirmModal/ConfirmModal.module.css';
import { Modal } from '@/shared/ui/Modal';

type KanbanDeleteColumnModalProps = {
  open: boolean;
  busy: boolean;
  columnName: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function KanbanDeleteColumnModal({
  open,
  busy,
  columnName,
  onClose,
  onConfirm,
}: KanbanDeleteColumnModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (busy) return;
        onClose();
      }}
      title="Удалить колонку?"
      size="sm"
      showCloseButton
      compactOnMobile
    >
      <div className={confirmModalStyles.content}>
        <p className={confirmModalStyles.message}>
          Колонка «<strong>{columnName}</strong>» будет удалена безвозвратно. Удалять можно только
          пустую колонку, если на доске останется хотя бы одна другая.
        </p>
        <div className={confirmModalStyles.actions}>
          <button
            type="button"
            className={confirmModalStyles.cancelButton}
            disabled={busy}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            data-admin-mutation
            type="button"
            className={`${confirmModalStyles.confirmButton} ${confirmModalStyles.danger}`}
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy ? 'Удаление…' : 'Удалить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
