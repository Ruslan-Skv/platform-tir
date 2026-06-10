'use client';

import cdBase from '../../../../styles/base.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';

export type CompletedMeasurementOption = {
  id: string;
  customerName: string;
  receptionDate: string;
  customerAddress?: string | null;
};

export function EstimateGenerateFromMeasurementModal({
  measurements,
  loading,
  selectedMeasurementId,
  onSelectedMeasurementIdChange,
  onClose,
  onCreate,
}: {
  measurements: CompletedMeasurementOption[];
  loading: boolean;
  selectedMeasurementId: string;
  onSelectedMeasurementIdChange: (id: string) => void;
  onClose: () => void;
  onCreate: (measurementId: string) => void;
}) {
  return (
    <div
      className={cdDocPreview.saveModalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-from-measurement-title"
      onClick={onClose}
    >
      <div className={cdDocPreview.saveModalCard} onClick={(e) => e.stopPropagation()}>
        <h3 className={cdDocPreview.saveModalTitle} id="generate-from-measurement-title">
          Создание расчёта из выполненного замера
        </h3>
        {loading ? (
          <p className={cdBase.hint}>Загрузка выполненных замеров…</p>
        ) : measurements.length === 0 ? (
          <p className={cdBase.hint}>
            Нет выполненных замеров с данными раздела «Замеры помещений».
          </p>
        ) : (
          <label className={cdBase.field}>
            <span>Выберите выполненный замер</span>
            <select
              value={selectedMeasurementId}
              onChange={(e) => onSelectedMeasurementIdChange(e.target.value)}
            >
              {measurements.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.customerName} · {new Date(m.receptionDate).toLocaleDateString('ru-RU')}
                  {m.customerAddress ? ` · ${m.customerAddress}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className={cdDocPreview.saveModalActionsRow}>
          <button type="button" className={cdBase.secondaryBtn} onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className={cdWorkspace.primaryBtn}
            disabled={!selectedMeasurementId || loading}
            onClick={() => {
              if (!selectedMeasurementId) return;
              onCreate(selectedMeasurementId);
            }}
          >
            + Новый расчёт
          </button>
        </div>
      </div>
    </div>
  );
}
