'use client';

import cdBase from '../../../../styles/base.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';

export function EstimateDetachEditModal({
  saving,
  onCancel,
  onConfirm,
}: {
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div
      className={cdDocPreview.saveModalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detach-edit-estimate-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel();
      }}
    >
      <div className={cdDocPreview.saveModalCard} onClick={(e) => e.stopPropagation()}>
        <h3 id="detach-edit-estimate-title" className={cdDocPreview.saveModalTitle}>
          Редактирование расчёта
        </h3>
        <p className={cdDocPreview.saveModalText}>
          Этот расчёт прикреплён к смете договора или к дополнительному соглашению. После сохранения
          изменений его нужно будет заново прикрепить в пакете документов. Текущая привязка будет
          снята автоматически. Продолжить?
        </p>
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            marginTop: 4,
          }}
        >
          <button
            type="button"
            className={cdBase.secondaryBtn}
            disabled={saving}
            onClick={onCancel}
          >
            Отмена
          </button>
          <button
            type="button"
            className={cdWorkspace.primaryBtn}
            disabled={saving}
            onClick={() => void onConfirm()}
          >
            {saving ? 'Подождите…' : 'Продолжить'}
          </button>
        </div>
      </div>
    </div>
  );
}
