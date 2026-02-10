'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type CrmDirection,
  type CrmUser,
  type MeasurementHistoryEntry,
  getMeasurementHistory,
  rollbackMeasurement,
} from '@/shared/api/admin-crm';

import styles from './MeasurementHistoryModal.module.css';

const FIELD_LABELS: Record<string, string> = {
  receptionDate: 'Дата приёма',
  executionDate: 'Дата выполнения',
  managerId: 'Менеджер',
  surveyorId: 'Замерщик',
  directionId: 'Направление',
  customerName: 'ФИО заказчика',
  customerAddress: 'Адрес',
  customerPhone: 'Телефон',
  status: 'Статус',
  comments: 'Комментарии',
};

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Новый',
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
  CONVERTED: 'В договор',
};

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatUser(
  u: { firstName?: string | null; lastName?: string | null; email?: string } | null | undefined
) {
  if (!u) return '—';
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return name || u.email || '—';
}

interface MeasurementHistoryModalProps {
  measurementId: string;
  measurementName?: string;
  users?: CrmUser[];
  directions?: CrmDirection[];
  onClose: () => void;
  onRollback?: () => void;
}

function formatSnapshotValue(
  key: string,
  value: unknown,
  users: CrmUser[],
  directions: CrmDirection[]
): string {
  if (value === null || value === undefined) return '—';
  if (key === 'status') return STATUS_LABELS[String(value)] ?? String(value);
  if (key === 'receptionDate' || key === 'executionDate') {
    return new Date(String(value)).toLocaleDateString('ru-RU');
  }
  if (key === 'managerId' || key === 'surveyorId') {
    const u = users.find((x) => x.id === value);
    return u ? formatUser(u) : String(value);
  }
  if (key === 'directionId') {
    const d = directions.find((x) => x.id === value);
    return d ? d.name : String(value);
  }
  return String(value);
}

export function MeasurementHistoryModal({
  measurementId,
  measurementName,
  users = [],
  directions = [],
  onClose,
  onRollback,
}: MeasurementHistoryModalProps) {
  const [history, setHistory] = useState<MeasurementHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMeasurementHistory(measurementId);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  }, [measurementId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRollback = async (historyId: string) => {
    if (!confirm('Откатить замер к этой версии? Текущие данные будут заменены.')) return;
    setRollingBackId(historyId);
    try {
      await rollbackMeasurement(measurementId, historyId);
      onRollback?.();
      loadHistory();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отката');
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            История изменений{measurementName ? `: ${measurementName}` : ''}
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка истории...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : history.length === 0 ? (
          <div className={styles.empty}>История изменений пуста</div>
        ) : (
          <div className={styles.list}>
            {history.map((entry) => (
              <div key={entry.id} className={styles.entry}>
                <div
                  className={styles.entryHeader}
                  onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                >
                  <div className={styles.entryMeta}>
                    <span className={styles.entryDate}>{formatDateTime(entry.changedAt)}</span>
                    <span className={styles.entryUser}>{formatUser(entry.changedBy)}</span>
                    <span
                      className={`${styles.entryAction} ${
                        entry.action === 'ROLLBACK' ? styles.actionRollback : ''
                      }`}
                    >
                      {entry.action === 'ROLLBACK' ? 'Откат' : 'Изменение'}
                    </span>
                    {entry.changedFields.length > 0 && (
                      <span className={styles.entryFields}>
                        {entry.changedFields.map((f) => FIELD_LABELS[f] ?? f).join(', ')}
                      </span>
                    )}
                  </div>
                  {entry.action === 'UPDATE' && (
                    <button
                      type="button"
                      className={styles.rollbackButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRollback(entry.id);
                      }}
                      disabled={!!rollingBackId}
                      title="Откатиться к этой версии"
                    >
                      {rollingBackId === entry.id ? 'Откат...' : 'Откатить'}
                    </button>
                  )}
                  <span className={styles.expandIcon}>{expandedId === entry.id ? '▼' : '▶'}</span>
                </div>

                {expandedId === entry.id && (
                  <div className={styles.entryDetails}>
                    <div className={styles.snapshotTable}>
                      {Object.entries(entry.snapshot)
                        .filter(([k]) => !['customerId'].includes(k))
                        .map(([key, value]) => (
                          <div key={key} className={styles.snapshotRow}>
                            <span className={styles.snapshotLabel}>
                              {FIELD_LABELS[key] ?? key}:
                            </span>
                            <span className={styles.snapshotValue}>
                              {formatSnapshotValue(key, value, users, directions)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
