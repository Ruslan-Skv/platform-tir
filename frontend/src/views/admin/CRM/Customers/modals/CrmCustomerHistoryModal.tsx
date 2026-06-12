'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type CrmCustomerDetail,
  type CrmCustomerHistoryEntry,
  getCrmCustomerHistory,
} from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';

import { formatCrmAuditActor } from '../shared/crmCustomerDisplay';
import {
  buildCrmCustomerSnapshotFromDetail,
  crmCustomerHistoryFieldLabel,
  formatCrmCustomerHistoryValue,
} from '../shared/crmCustomerHistoryFields';
import panelStyles from './AddCrmCustomerModal.module.css';
import styles from './CrmCustomerHistoryModal.module.css';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function snapshotAfterEntry(
  index: number,
  history: CrmCustomerHistoryEntry[],
  currentSnapshot: Record<string, unknown>
): Record<string, unknown> {
  if (index === 0) return currentSnapshot;
  return history[index - 1]?.snapshot ?? currentSnapshot;
}

interface CrmCustomerHistoryModalProps {
  customerId: string;
  customer: CrmCustomerDetail;
  customerLabel?: string;
  onClose: () => void;
}

export function CrmCustomerHistoryModal({
  customerId,
  customer,
  customerLabel,
  onClose,
}: CrmCustomerHistoryModalProps) {
  const [history, setHistory] = useState<CrmCustomerHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const currentSnapshot = useMemo(() => buildCrmCustomerSnapshotFromDetail(customer), [customer]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCrmCustomerHistory(customerId);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const modalTitle = customerLabel
    ? `История карточки клиента: ${customerLabel}`
    : 'История карточки клиента';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={modalTitle}
      size="lg"
      className={`${panelStyles.modalPanel} ${styles.historyPanel}`}
      showCloseButton
    >
      <div className={styles.shell} data-modal-history>
        {loading ? <p data-modal-form-hint>Загрузка истории…</p> : null}
        {error ? <p data-modal-form-error>{error}</p> : null}
        {!loading && !error && history.length === 0 ? (
          <p data-modal-form-hint>История изменений пуста</p>
        ) : null}
        {!loading && !error && history.length > 0 ? (
          <div className={styles.list} data-modal-readonly-panel data-modal-density="compact">
            {history.map((entry, index) => {
              const after = snapshotAfterEntry(index, history, currentSnapshot);
              const isCreate = entry.action === 'CREATE';
              const fields =
                entry.changedFields.length > 0
                  ? entry.changedFields
                  : isCreate
                    ? Object.keys(entry.snapshot)
                    : [];

              return (
                <article key={entry.id} className={styles.entry}>
                  <button
                    type="button"
                    className={styles.entryHeader}
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    aria-expanded={expandedId === entry.id}
                  >
                    <div className={styles.entryMeta}>
                      <span className={styles.entryDate}>{formatDateTime(entry.changedAt)}</span>
                      <span className={styles.entryUser}>
                        {formatCrmAuditActor(entry.changedBy)}
                      </span>
                      <span
                        className={`${styles.entryAction} ${
                          isCreate ? styles.actionCreate : styles.actionUpdate
                        }`}
                      >
                        {isCreate ? 'Создание' : 'Изменение'}
                      </span>
                      {fields.length > 0 ? (
                        <span className={styles.entryFields}>
                          {fields.map((f) => crmCustomerHistoryFieldLabel(f)).join(', ')}
                        </span>
                      ) : null}
                    </div>
                    <span className={styles.expandIcon} aria-hidden>
                      {expandedId === entry.id ? '▼' : '▶'}
                    </span>
                  </button>

                  {expandedId === entry.id ? (
                    <div className={styles.entryDetails}>
                      <dl data-modal-detail className={styles.changesDetail}>
                        {fields.map((field) => {
                          const oldVal = isCreate
                            ? '—'
                            : formatCrmCustomerHistoryValue(field, entry.snapshot[field]);
                          const newVal = isCreate
                            ? formatCrmCustomerHistoryValue(field, entry.snapshot[field])
                            : formatCrmCustomerHistoryValue(field, after[field]);
                          const changed = oldVal !== newVal;

                          return (
                            <div
                              key={field}
                              data-modal-field
                              className={changed ? styles.changeRowChanged : undefined}
                            >
                              <dt>{crmCustomerHistoryFieldLabel(field)}</dt>
                              <dd>
                                {isCreate ? (
                                  <span className={styles.changeNew}>{newVal}</span>
                                ) : (
                                  <span className={styles.changeValues}>
                                    <span className={styles.changeOld}>{oldVal}</span>
                                    <span className={styles.changeArrow} aria-hidden>
                                      →
                                    </span>
                                    <span className={styles.changeNew}>{newVal}</span>
                                  </span>
                                )}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
