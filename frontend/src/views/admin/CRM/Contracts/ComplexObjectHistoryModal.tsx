'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type ComplexObjectHistoryEntry,
  type CrmUser,
  getComplexObjectHistory,
  rollbackComplexObject,
} from '@/shared/api/admin-crm';

import styles from './ContractHistoryModal.module.css';

const FIELD_LABELS: Record<string, string> = {
  name: 'Название',
  customerName: 'Заказчик',
  customerPhones: 'Телефоны',
  address: 'Адрес',
  notes: 'Примечания',
  hasElevator: 'Лифт',
  floor: 'Этаж',
  officeId: 'Офис',
  managerId: 'Менеджер',
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

function formatSnapshotValue(key: string, value: unknown, users: CrmUser[]): string {
  if (value === null || value === undefined) return '—';
  if (key === 'hasElevator') return value ? 'Да' : 'Нет';
  if (key === 'managerId' || key === 'officeId') {
    if (key === 'managerId') {
      const u = users.find((x) => x.id === value);
      return u ? formatUser(u) : String(value);
    }
    return String(value);
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

interface ComplexObjectHistoryModalProps {
  complexObjectId: string;
  objectName?: string;
  users?: CrmUser[];
  onClose: () => void;
  onRollback?: () => void;
}

export function ComplexObjectHistoryModal({
  complexObjectId,
  objectName,
  users = [],
  onClose,
  onRollback,
}: ComplexObjectHistoryModalProps) {
  const [history, setHistory] = useState<ComplexObjectHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getComplexObjectHistory(complexObjectId);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  }, [complexObjectId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRollback = async (historyId: string) => {
    if (!confirm('Откатить объект к этой версии? Текущие данные будут заменены.')) return;
    setRollingBackId(historyId);
    try {
      await rollbackComplexObject(complexObjectId, historyId);
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
          <h3 className={styles.title}>История изменений{objectName ? `: ${objectName}` : ''}</h3>
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
                      {Object.entries(entry.snapshot).map(([key, value]) => (
                        <div key={key} className={styles.snapshotRow}>
                          <span className={styles.snapshotLabel}>{FIELD_LABELS[key] ?? key}:</span>
                          <span className={styles.snapshotValue}>
                            {formatSnapshotValue(key, value, users)}
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
