'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  ReconciliationEntry,
  UnmatchedPayment,
} from '@/shared/api/accounting/admin-bank-reconciliation';
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
  /** Связи для создания: поступление → сумма части оплаты. */
  onLink: (links: { bankEntryId: string; amount: number }[], movementId: string) => void;
};

/**
 * Модалка выбора поступлений для непоступившей оплаты ДП. Оплата могла прийти
 * на счёт частями (несколько зачислений) — можно отметить несколько поступлений
 * и указать сумму каждой части (по умолчанию — остаток поступления в пределах
 * несвёренного остатка оплаты).
 */
export function ChooseEntryModal({
  isOpen,
  onClose,
  payment,
  entries,
  busy,
  canEdit,
  onLink,
}: ChooseEntryModalProps) {
  /** Сумма части оплаты для каждого отмеченного поступления (по id записи). */
  const [amountsById, setAmountsById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setAmountsById({});
  }, [isOpen, payment]);

  const candidates = useMemo(
    () => entries.filter((entry) => Number(entry.remainingAmount) > 0.005),
    [entries]
  );

  /** Остаток оплаты, который ещё не распределён по отмеченным поступлениям. */
  const paymentRemainder = payment ? Number(payment.remainder) : 0;
  const allocated = Object.values(amountsById).reduce(
    (acc, value) => acc + (Number(value) || 0),
    0
  );
  const leftover = paymentRemainder - allocated;

  const toggle = (entry: ReconciliationEntry) => {
    setAmountsById((prev) => {
      const next = { ...prev };
      if (next[entry.id] != null) {
        delete next[entry.id];
        return next;
      }
      // По умолчанию — сколько влезет: остаток оплаты против остатка поступления.
      const alreadyTaken = Object.entries(prev).reduce(
        (acc, [, value]) => acc + (Number(value) || 0),
        0
      );
      const free = paymentRemainder - alreadyTaken;
      const defaultAmount = Math.max(0, Math.min(free, Number(entry.remainingAmount)));
      next[entry.id] = defaultAmount.toFixed(2);
      return next;
    });
  };

  const links = Object.entries(amountsById)
    .map(([bankEntryId, value]) => ({ bankEntryId, amount: Number(value) || 0 }))
    .filter((link) => link.amount > 0);

  const invalidAmount = Object.values(amountsById).some(
    (value) => (Number(value) || 0) <= 0 || (Number(value) || 0) > paymentRemainder + 0.005
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
          {payment.customerName ? `, ${payment.customerName}` : ''}. Можно отметить несколько
          поступлений и указать сумму каждой части. Фиксация исключит суммы из дальнейших сверок.
        </p>

        {candidates.length === 0 ? (
          <p className={styles.emptyHint}>
            Нет несвёренных поступлений этого способа за период — оплата не поступила.
          </p>
        ) : (
          <ul className={styles.movementList}>
            {candidates.map((entry) => {
              const checked = amountsById[entry.id] != null;
              return (
                <li key={entry.id} className={styles.movementRow}>
                  <label className={styles.candidateLabel}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(entry)}
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
                  {checked ? (
                    <div className={styles.amountSplitRow}>
                      <label className={styles.amountSplitLabel}>
                        Часть оплаты к этому поступлению, ₽
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={amountsById[entry.id]}
                          onChange={(e) =>
                            setAmountsById((prev) => ({
                              ...prev,
                              [entry.id]: e.target.value,
                            }))
                          }
                          disabled={busy}
                        />
                      </label>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <p className={styles.leftoverHint}>
          Распределено:{' '}
          <strong>{formatMoneyRub(String(Math.min(allocated, paymentRemainder)))}</strong> из{' '}
          {formatMoneyRub(String(paymentRemainder))}
          {leftover > 0.005 ? ` — остаток ${formatMoneyRub(String(leftover))}` : ''}
        </p>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button
            type="button"
            data-admin-mutation
            data-modal-btn="primary"
            disabled={busy || links.length === 0 || invalidAmount || !canEdit}
            onClick={() => onLink(links, payment.id)}
          >
            {busy ? 'Фиксация…' : 'Зафиксировать'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
