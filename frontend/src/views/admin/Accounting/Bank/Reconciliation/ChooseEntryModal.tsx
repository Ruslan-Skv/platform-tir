'use client';

import { useEffect, useMemo, useState } from 'react';

import type { ReconciliationEntry, UnmatchedPayment } from '@/shared/api/admin-bank-reconciliation';
import { Modal } from '@/shared/ui/Modal';

import { formatDateRu, formatMoneyRub } from '../../accounting-invoices-page.utils';
import { BANK_ENTRY_TYPE_LABELS, BANK_LABELS } from '../bank-page.constants';
import styles from './Reconciliation.module.css';

type ChooseEntryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  payment: UnmatchedPayment | null;
  /** Поступления с ненулевым остатком того же способа. */
  entries: ReconciliationEntry[];
  busy: boolean;
  canEdit: boolean;
  onLink: (bankEntryId: string, movementId: string) => void;
};

/** Модалка выбора поступления для непоступившей оплаты ДП. */
export function ChooseEntryModal({
  isOpen,
  onClose,
  payment,
  entries,
  busy,
  canEdit,
  onLink,
}: ChooseEntryModalProps) {
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId('');
  }, [isOpen, payment]);

  const candidates = useMemo(
    () => entries.filter((entry) => Number(entry.remainingAmount) > 0.005),
    [entries]
  );

  if (!payment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Привязать оплату к поступлению — ${formatMoneyRub(payment.amount)}`}
      size="md"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form>
        <p data-modal-form-hint>
          Оплата от {formatDateRu(payment.paymentDate)}
          {payment.managerName ? `, ${payment.managerName}` : ''}
          {payment.contractNumber ? `, договор №${payment.contractNumber}` : ''}
          {payment.customerName ? `, ${payment.customerName}` : ''}. Выберите поступление — фиксация
          исключит сумму из дальнейших сверок.
        </p>

        {candidates.length === 0 ? (
          <p className={styles.emptyHint}>
            Нет несвёренных поступлений этого способа за период — оплата не поступила.
          </p>
        ) : (
          <ul className={styles.movementList}>
            {candidates.map((entry) => (
              <li key={entry.id} className={styles.movementRow}>
                <label className={styles.candidateLabel}>
                  <input
                    type="radio"
                    name="reconciliation_entry"
                    checked={selectedId === entry.id}
                    onChange={() => setSelectedId(entry.id)}
                    disabled={busy}
                  />
                  <span className={styles.movementDate}>{formatDateRu(entry.entryDate)}</span>
                  <span className={styles.movementTitle}>
                    {BANK_LABELS[entry.bank]} · {BANK_ENTRY_TYPE_LABELS[entry.entryType]}
                  </span>
                  <span className={styles.movementAmount}>
                    остаток {formatMoneyRub(entry.remainingAmount)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button
            type="button"
            data-admin-mutation
            data-modal-btn="primary"
            disabled={busy || !selectedId || !canEdit}
            onClick={() => onLink(selectedId, payment.id)}
          >
            {busy ? 'Фиксация…' : 'Зафиксировать'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
