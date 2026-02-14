'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type SupplierSettlementHistoryEntry,
  getSupplierSettlementHistory,
  rollbackSupplierSettlement,
} from '@/shared/api/admin-crm';

import styles from './SupplierSettlementHistoryModal.module.css';

const FIELD_LABELS: Record<string, string> = {
  date: 'Дата',
  invoice: 'Счёт',
  amount: 'Стоимость',
  payment: 'Оплата',
  note: 'Примечание',
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

function formatSnapshotValue(_key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

interface SupplierSettlementHistoryModalProps {
  supplierId: string;
  supplierName?: string;
  onClose: () => void;
  onRollback?: () => void;
}

export function SupplierSettlementHistoryModal({
  supplierId,
  supplierName,
  onClose,
  onRollback,
}: SupplierSettlementHistoryModalProps) {
  const [history, setHistory] = useState<SupplierSettlementHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSupplierSettlementHistory(supplierId);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRollback = async (historyId: string) => {
    if (!confirm('Откатить расчёты к этой версии? Текущие данные будут заменены.')) return;
    setRollingBackId(historyId);
    try {
      await rollbackSupplierSettlement(supplierId, historyId);
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
            История изменений
            {supplierName ? `: ${supplierName}` : ''}
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
                      {((entry.snapshot?.rows ?? []) as Array<Record<string, unknown>>).map(
                        (row, rowIdx) => (
                          <div key={rowIdx} className={styles.snapshotBlock}>
                            <div className={styles.snapshotBlockTitle}>Строка {rowIdx + 1}</div>
                            {Object.entries(row)
                              .filter(([k]) => !['id'].includes(k))
                              .map(([key, value]) => (
                                <div key={key} className={styles.snapshotRow}>
                                  <span className={styles.snapshotLabel}>
                                    {FIELD_LABELS[key] ?? key}:
                                  </span>
                                  <span className={styles.snapshotValue}>
                                    {formatSnapshotValue(key, value)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )
                      )}
                      {((entry.snapshot?.rows ?? []) as unknown[]).length === 0 && (
                        <div className={styles.snapshotEmpty}>Нет записей</div>
                      )}
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
