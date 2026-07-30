'use client';

import { useState } from 'react';

import { useWorkDay } from './WorkDayContext';
import styles from './WorkDayWidget.module.css';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function WorkDayWidget() {
  const { status, loading, handleEndDay, handleStartAbsence, handleEndAbsence } = useWorkDay();
  const [busy, setBusy] = useState(false);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (loading || !status?.tracked) return null;

  const day = status.todayWorkDay;
  const isOpen = day?.status === 'OPEN';

  if (!isOpen) return null;

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      setShowAbsenceForm(false);
      setReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.widget}>
      <div className={styles.status}>
        <span className={styles.dot} />
        <span className={styles.label}>
          {status.hasOpenAbsence ? 'По делам' : 'На работе'}
          {day ? ` с ${formatTime(day.startedAt)}` : ''}
          {day?.office?.name ? ` · ${day.office.name}` : ''}
        </span>
      </div>
      <div className={styles.actions}>
        {status.hasOpenAbsence ? (
          <button
            type="button"
            className={styles.btn}
            disabled={busy}
            onClick={() => void run(handleEndAbsence)}
          >
            Вернулся
          </button>
        ) : showAbsenceForm ? (
          <div className={styles.absenceForm}>
            <input
              type="text"
              className={styles.input}
              placeholder="Куда (необязательно)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={() => void run(() => handleStartAbsence(reason || undefined))}
            >
              Ушёл
            </button>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={() => setShowAbsenceForm(false)}
            >
              Отмена
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className={styles.btn}
              disabled={busy}
              onClick={() => setShowAbsenceForm(true)}
            >
              Ушёл по делам
            </button>
            <button
              type="button"
              className={styles.btnEnd}
              disabled={busy}
              onClick={() => void run(handleEndDay)}
            >
              Завершить день
            </button>
          </>
        )}
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
