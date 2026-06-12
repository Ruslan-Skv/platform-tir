'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type CrmDirection, type CrmUser, getMeasurementHistory } from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';

import panelStyles from '../../Customers/modals/AddCrmCustomerModal.module.css';
import { buildMeasurementJournal } from '../shared/measurementEventLog';
import styles from './MeasurementHistoryModal.module.css';

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface MeasurementHistoryModalProps {
  measurementId: string;
  measurementName?: string;
  users?: CrmUser[];
  directions?: CrmDirection[];
  onClose: () => void;
}

export function MeasurementHistoryModal({
  measurementId,
  measurementName,
  users = [],
  directions = [],
  onClose,
}: MeasurementHistoryModalProps) {
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getMeasurementHistory>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMeasurementHistory(measurementId);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки журнала');
    } finally {
      setLoading(false);
    }
  }, [measurementId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const journal = useMemo(
    () => buildMeasurementJournal(history, users, directions),
    [history, users, directions]
  );

  const modalTitle = measurementName
    ? `Журнал событий замера: ${measurementName}`
    : 'Журнал событий замера';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={modalTitle}
      size="lg"
      className={`${panelStyles.modalPanel} ${styles.journalPanel}`}
      showCloseButton
    >
      <div className={styles.shell} data-modal-history>
        <p className={styles.subtitle}>
          Ключевые действия при работе с замером: когда, кто и что изменил.
        </p>

        {loading ? <p data-modal-form-hint>Загрузка журнала…</p> : null}
        {error ? <p data-modal-form-error>{error}</p> : null}
        {!loading && !error && journal.length === 0 ? (
          <p data-modal-form-hint>Событий пока нет</p>
        ) : null}
        {!loading && !error && journal.length > 0 ? (
          <div className={styles.list} data-modal-readonly-panel data-modal-density="compact">
            {journal.map((item) => (
              <article key={item.id} className={styles.entry}>
                <div className={styles.entryMeta}>
                  <time className={styles.entryDate} dateTime={item.changedAt}>
                    {formatDateTime(item.changedAt)}
                  </time>
                  <span className={styles.entryUser}>{item.changedByLabel}</span>
                  <span
                    className={`${styles.entryAction} ${
                      item.actionLabel === 'Откат' ? styles.actionRollback : ''
                    }`}
                  >
                    {item.actionLabel}
                  </span>
                </div>
                <ul className={styles.eventList}>
                  {item.descriptions.map((text, idx) => (
                    <li key={`${item.id}-${idx}`}>{text}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
