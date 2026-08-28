'use client';

import confirmModalStyles from '@/shared/ui/ConfirmModal/ConfirmModal.module.css';
import { Modal } from '@/shared/ui/Modal';

import { KANBAN_TRASH_RETENTION_NOTICE } from '../shared/kanbanTrashRetention';

type KanbanDeleteBoardModalProps = {
  open: boolean;
  busy: boolean;
  boardName: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function KanbanDeleteBoardModal({
  open,
  busy,
  boardName,
  onClose,
  onConfirm,
}: KanbanDeleteBoardModalProps) {
  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (busy) return;
        onClose();
      }}
      title="Удалить доску?"
      size="sm"
      showCloseButton
      compactOnMobile
    >
      <div className={confirmModalStyles.content}>
        <p className={confirmModalStyles.message}>
          Доска «<strong>{boardName}</strong>» будет перемещена в корзину вместе с колонками и
          карточками. Восстановить её можно из корзины. {KANBAN_TRASH_RETENTION_NOTICE}
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
            {busy ? 'Удаление…' : 'В корзину'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
