'use client';

import { Modal } from '@/shared/ui/Modal';

export function EstimateDetachEditModal({
  isOpen,
  saving,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (saving) return;
        onCancel();
      }}
      title="Редактирование расчёта"
      size="md"
      showCloseButton
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Этот расчёт прикреплён к смете договора или к дополнительному соглашению. После сохранения
          изменений его нужно будет заново прикрепить в пакете документов. Текущая привязка будет
          снята автоматически. Продолжить?
        </p>
        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" disabled={saving} onClick={onCancel}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="button"
            data-modal-btn="primary"
            disabled={saving}
            onClick={() => void onConfirm()}
          >
            {saving ? 'Подождите…' : 'Продолжить'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
