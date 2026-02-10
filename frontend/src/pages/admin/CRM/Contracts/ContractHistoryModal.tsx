'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type ContractHistoryEntry,
  type CrmDirection,
  type CrmUser,
  getContractHistory,
  rollbackContract,
} from '@/shared/api/admin-crm';

import styles from './ContractHistoryModal.module.css';

const FIELD_LABELS: Record<string, string> = {
  contractNumber: '№ договора',
  contractDate: 'Дата заключения',
  status: 'Статус',
  directionId: 'Направление',
  managerId: 'Менеджер',
  deliveryId: 'Доставка',
  surveyorId: 'Замерщик',
  validityStart: 'Начало действия',
  validityEnd: 'Окончание действия',
  contractDurationDays: 'Срок договора (дн.)',
  contractDurationType: 'Тип срока',
  installationDate: 'Дата монтажа',
  installationDurationDays: 'Длительность монтажа (дн.)',
  deliveryDate: 'Дата доставки',
  customerName: 'ФИО заказчика',
  customerAddress: 'Адрес',
  customerPhone: 'Телефон',
  discount: 'Скидка',
  totalAmount: 'Сумма',
  advanceAmount: 'Аванс',
  notes: 'Примечания',
  source: 'Источник',
  preferredExecutorId: 'Предпочитаемый исполнитель',
  measurementId: 'Замер',
  actWorkStartDate: 'Дата начала работ',
  actWorkEndDate: 'Дата окончания работ',
  goodsTransferDate: 'Дата передачи товара',
  installers: 'Монтажники',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активный',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершён',
  EXPIRED: 'Истёк',
  CANCELLED: 'Отменён',
};

const CONTRACT_DURATION_TYPE_LABELS: Record<string, string> = {
  CALENDAR: 'Календарные',
  WORKING: 'Рабочие',
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

interface ContractHistoryModalProps {
  contractId: string;
  contractNumber?: string;
  users?: CrmUser[];
  directions?: CrmDirection[];
  onClose: () => void;
  onRollback?: () => void;
}

const HIDDEN_SNAPSHOT_KEYS = ['customerId', 'actWorkStartImages', 'actWorkEndImages', 'installers'];

function formatSnapshotValue(
  key: string,
  value: unknown,
  users: CrmUser[],
  directions: CrmDirection[]
): string {
  if (value === null || value === undefined) return '—';
  if (key === 'status') return STATUS_LABELS[String(value)] ?? String(value);
  if (key === 'contractDurationType')
    return CONTRACT_DURATION_TYPE_LABELS[String(value)] ?? String(value);
  const dateKeys = [
    'contractDate',
    'validityStart',
    'validityEnd',
    'installationDate',
    'deliveryDate',
    'actWorkStartDate',
    'actWorkEndDate',
    'goodsTransferDate',
  ];
  if (dateKeys.includes(key)) {
    return new Date(String(value)).toLocaleDateString('ru-RU');
  }
  if (['managerId', 'surveyorId', 'deliveryId', 'preferredExecutorId'].includes(key)) {
    const u = users.find((x) => x.id === value);
    return u ? formatUser(u) : String(value);
  }
  if (key === 'directionId') {
    const d = directions.find((x) => x.id === value);
    return d ? d.name : String(value);
  }
  if (key === 'measurementId') return String(value);
  if (key === 'discount' || key === 'totalAmount' || key === 'advanceAmount') {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(Number(value));
  }
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

export function ContractHistoryModal({
  contractId,
  contractNumber,
  users = [],
  directions = [],
  onClose,
  onRollback,
}: ContractHistoryModalProps) {
  const [history, setHistory] = useState<ContractHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContractHistory(contractId);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки истории');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRollback = async (historyId: string) => {
    if (!confirm('Откатить договор к этой версии? Текущие данные будут заменены.')) return;
    setRollingBackId(historyId);
    try {
      await rollbackContract(contractId, historyId);
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
            История изменений{contractNumber ? `: ${contractNumber}` : ''}
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
                        .filter(([k]) => !HIDDEN_SNAPSHOT_KEYS.includes(k))
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
