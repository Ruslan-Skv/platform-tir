'use client';

import { Modal } from '@/shared/ui/Modal';

export type CompletedMeasurementOption = {
  id: string;
  customerName: string;
  receptionDate: string;
  customerAddress?: string | null;
};

export function EstimateGenerateFromMeasurementModal({
  isOpen,
  measurements,
  loading,
  selectedMeasurementId,
  onSelectedMeasurementIdChange,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  measurements: CompletedMeasurementOption[];
  loading: boolean;
  selectedMeasurementId: string;
  onSelectedMeasurementIdChange: (id: string) => void;
  onClose: () => void;
  onCreate: (measurementId: string) => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Создание расчёта из выполненного замера"
      size="md"
      showCloseButton
    >
      <div data-modal-form data-modal-density="compact">
        {loading ? (
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Загрузка выполненных замеров…
          </p>
        ) : measurements.length === 0 ? (
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Нет выполненных замеров с данными раздела «Замеры помещений».
          </p>
        ) : (
          <>
            <p data-modal-form-hint style={{ marginTop: 0 }}>
              Выберите выполненный замер — по его данным откроется рабочая область нового расчёта.
            </p>
            <div data-modal-form-group>
              <label htmlFor="generate-from-measurement-select">Выполненный замер</label>
              <select
                id="generate-from-measurement-select"
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
            </div>
          </>
        )}
        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="button"
            data-modal-btn="primary"
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
    </Modal>
  );
}
