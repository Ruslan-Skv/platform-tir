'use client';

import { useRef, useState } from 'react';

import {
  type RepairScheduleImportResult,
  importRepairScheduleExcel,
} from '@/shared/api/crm/admin-repair-schedules';
import { Modal } from '@/shared/ui/Modal';

import styles from '../shared/RepairSchedules.module.css';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImported: (result: RepairScheduleImportResult) => void;
};

export function RepairScheduleImportModal({ isOpen, onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepairScheduleImportResult | null>(null);

  const reset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const runImport = async () => {
    if (!file) {
      setError('Выберите файл .xlsx / .xls / .csv');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await importRepairScheduleExcel(file, [2025, 2026]);
      setResult(res);
      onImported(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Импорт из Excel / Google" size="md">
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint className={styles.formHintFlush}>
          Загрузите выгрузку Google Sheets или Excel «ГрафикРемонт». Импортируются колонки недель
          2025–2026: проекты upsert по № договора, ячейки недель — в таймлайн.
        </p>
        <div data-modal-form-group>
          <label htmlFor="rs-import-file">Файл</label>
          <input
            id="rs-import-file"
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
          />
        </div>
        {error ? <p data-modal-form-error>{error}</p> : null}
        {result ? (
          <p data-modal-form-hint>
            Лист «{result.sheetName}»: колонок недель {result.weekColumns}. В файле{' '}
            {result.projectsInFile} проектов → создано {result.created}, обновлено {result.updated},
            записей динамики {result.entriesUpserted}.
          </p>
        ) : null}
        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" disabled={busy} onClick={handleClose}>
            {result ? 'Закрыть' : 'Отмена'}
          </button>
          <button
            data-admin-mutation
            type="button"
            data-modal-btn="primary"
            disabled={busy || !file}
            onClick={() => void runImport()}
          >
            {busy ? 'Импорт…' : 'Импортировать'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
