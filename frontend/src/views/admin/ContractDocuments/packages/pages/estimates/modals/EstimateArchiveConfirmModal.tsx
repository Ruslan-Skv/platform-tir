'use client';

import { useRef } from 'react';

import confirmModalStyles from '@/shared/ui/ConfirmModal/ConfirmModal.module.css';
import { Modal } from '@/shared/ui/Modal';

export type EstimateArchiveConfirmState = {
  estimateId: string;
  title: string;
};

export function EstimateArchiveConfirmModal({
  state,
  saving,
  onClose,
  onConfirm,
}: {
  state: EstimateArchiveConfirmState | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const cachedStateRef = useRef<EstimateArchiveConfirmState | null>(null);
  if (state) cachedStateRef.current = state;
  const cachedState = cachedStateRef.current;

  return (
    <Modal
      isOpen={state != null}
      onClose={() => {
        if (saving) return;
        onClose();
      }}
      title="Отправить в архив?"
      size="sm"
      showCloseButton
    >
      {cachedState ? (
        <div className={confirmModalStyles.content}>
          <p className={confirmModalStyles.message}>
            Расчёт «<strong>{cachedState.title}</strong>» будет скрыт из основного списка и из
            выбора при оформлении договоров. Вернуть его можно из архива на этой странице.
          </p>
          <div className={confirmModalStyles.actions}>
            <button
              type="button"
              className={confirmModalStyles.cancelButton}
              disabled={saving}
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              data-admin-mutation
              type="button"
              className={`${confirmModalStyles.confirmButton} ${confirmModalStyles.default}`}
              disabled={saving}
              onClick={() => void onConfirm()}
            >
              {saving ? 'Подождите…' : 'В архив'}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
