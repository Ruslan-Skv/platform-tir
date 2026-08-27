'use client';

import { type FormEvent } from 'react';

import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

type KanbanColumnModalProps = {
  open: boolean;
  busy: boolean;
  isEdit: boolean;
  name: string;
  color: string;
  wipLimit: string;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
  onWipLimitChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void> | void;
};

export function KanbanColumnModal({
  open,
  busy,
  isEdit,
  name,
  color,
  wipLimit,
  onNameChange,
  onColorChange,
  onWipLimitChange,
  onClose,
  onSubmit,
}: KanbanColumnModalProps) {
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
      title={isEdit ? 'Редактировать колонку' : 'Новая колонка'}
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
          WIP-лимит ограничивает число карточек «в работе» и подсвечивает перегрузку колонки.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="kanban-column-name">Название *</label>
            <input
              id="kanban-column-name"
              type="text"
              value={name}
              disabled={busy}
              required
              onChange={(e) => onNameChange(e.target.value)}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="kanban-column-color">Цвет</label>
            <input
              id="kanban-column-color"
              type="color"
              value={color}
              disabled={busy}
              onChange={(e) => onColorChange(e.target.value)}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="kanban-column-wip">WIP-лимит</label>
            <input
              id="kanban-column-wip"
              type="text"
              inputMode="numeric"
              value={wipLimit}
              disabled={busy}
              placeholder="Пусто = без лимита"
              onChange={(e) => onWipLimitChange(e.target.value)}
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
            {busy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
