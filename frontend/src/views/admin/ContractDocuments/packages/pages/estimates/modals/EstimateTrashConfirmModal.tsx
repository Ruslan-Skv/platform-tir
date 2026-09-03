'use client';

import { useRef } from 'react';

import confirmModalStyles from '@/shared/ui/ConfirmModal/ConfirmModal.module.css';
import { Modal } from '@/shared/ui/Modal';

import type { EstimatePackageUsage } from '../list/estimatesListUtils';
import { ESTIMATE_TRASH_RETENTION_NOTICE } from './estimateTrashRetention';

export type EstimateTrashConfirmState = {
  estimateId: string;
  title: string;
  inSplitBundle: boolean;
  detachedUsages: EstimatePackageUsage[];
};

export function EstimateTrashConfirmModal({
  state,
  saving,
  onClose,
  onConfirm,
}: {
  state: EstimateTrashConfirmState | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const cachedStateRef = useRef<EstimateTrashConfirmState | null>(null);
  if (state) cachedStateRef.current = state;
  const cachedState = cachedStateRef.current;

  return (
    <Modal
      isOpen={state != null}
      onClose={() => {
        if (saving) return;
        onClose();
      }}
      title="Переместить в корзину?"
      size="sm"
      showCloseButton
    >
      {cachedState ? (
        <div className={confirmModalStyles.content}>
          <p className={confirmModalStyles.message}>
            Расчёт «<strong>{cachedState.title}</strong>» будет скрыт из общего списка. Восстановить
            его можно из корзины на этой странице. {ESTIMATE_TRASH_RETENTION_NOTICE}
          </p>
          {cachedState.detachedUsages.length > 0 ? (
            <p className={confirmModalStyles.message}>
              Расчёт прикреплён к смете договора или к дополнительному соглашению. При перемещении в
              корзину привязка будет снята автоматически.
            </p>
          ) : null}
          {cachedState.inSplitBundle ? (
            <p className={confirmModalStyles.message}>
              Расчёт входит в связку разделения сметы: после перемещения в корзину остальные
              экземпляры связки останутся; их набор выбранных позиций не пересчитается
              автоматически.
            </p>
          ) : null}
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
              className={`${confirmModalStyles.confirmButton} ${confirmModalStyles.danger}`}
              disabled={saving}
              onClick={() => void onConfirm()}
            >
              {saving ? 'Подождите…' : 'В корзину'}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
