'use client';

import { type FormEvent } from 'react';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

type KanbanBoardModalProps = {
  open: boolean;
  busy: boolean;
  mode: 'create' | 'rename';
  name: string;
  description: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void> | void;
};

export function KanbanBoardModal({
  open,
  busy,
  mode,
  name,
  description,
  onNameChange,
  onDescriptionChange,
  onClose,
  onSubmit,
}: KanbanBoardModalProps) {
  const isRename = mode === 'rename';

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    await onSubmit();
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={isRename ? 'Переименовать доску' : 'Новая доска'}
      size="md"
      className={crmFormStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <form
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p data-modal-form-hint>
          {isRename
            ? 'Измените название и при необходимости описание доски.'
            : 'После создания появятся колонки «Бэклог → В работе → На проверке → Готово».'}
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="kanban-board-name">Название *</label>
            <input
              id="kanban-board-name"
              type="text"
              value={name}
              disabled={busy}
              required
              autoFocus
              placeholder="Например: Маркетинг Q3"
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>

          <div data-modal-form-group data-modal-span>
            <label htmlFor="kanban-board-description">Описание</label>
            <textarea
              id="kanban-board-description"
              value={description}
              disabled={busy}
              rows={3}
              placeholder="Кратко о процессе команды"
              onChange={(e) => onDescriptionChange(e.target.value)}
            />
          </div>
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={busy}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={busy || !name.trim()}
          >
            {busy ? 'Сохранение…' : isRename ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
