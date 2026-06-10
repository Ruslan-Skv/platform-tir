'use client';

import { Modal } from '@/shared/ui/Modal';

export type EstimateWorkspaceExitModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function EstimateWorkspaceExitModal({
  isOpen,
  onClose,
  onConfirm,
}: EstimateWorkspaceExitModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Выйти без сохранения?"
      size="md"
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Несохранённые изменения в расчёте будут отменены. Для расчёта, открытого из списка,
          черновик калькулятора вернётся к состоянию на момент открытия страницы.
        </p>
        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose}>
            Отмена
          </button>
          <button type="button" data-modal-btn="primary" onClick={onConfirm}>
            Выйти без сохранения
          </button>
        </div>
      </div>
    </Modal>
  );
}
