'use client';

import { useEffect, useState } from 'react';

import type {
  CashBookOpeningBalance,
  CashBookOpeningBalanceParams,
} from '@/shared/api/accounting/admin-cash-book';
import { Modal } from '@/shared/ui/Modal';

import styles from './CashPage.module.css';

type OpeningBalanceModalProps = {
  open: boolean;
  onClose: () => void;
  /** Уже зафиксированный остаток; null — задаётся впервые. */
  openingBalance: CashBookOpeningBalance | null;
  submitting: boolean;
  onSubmit: (input: CashBookOpeningBalanceParams) => Promise<void>;
  /** Кнопка «Удалить остаток» (с подтверждением на странице). */
  onDeleteAsk: () => void;
};

function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** Модалка фиксации начального остатка кассы (центра) — супер-админ. */
export function OpeningBalanceModal({
  open,
  onClose,
  openingBalance,
  submitting,
  onSubmit,
  onDeleteAsk,
}: OpeningBalanceModalProps) {
  const [date, setDate] = useState(todayIso);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (openingBalance) {
      setDate(openingBalance.date);
      setAmount(String(openingBalance.amount));
      setNotes(openingBalance.notes ?? '');
    } else {
      setDate(todayIso());
      setAmount('');
      setNotes('');
    }
  }, [open, openingBalance]);

  const amountNumber = Number(amount.trim().replace(',', '.'));

  const handleSubmit = () => {
    if (!date) {
      setFormError('Укажите дату, на которую зафиксирован остаток');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setFormError('Укажите сумму остатка (положительное число)');
      return;
    }
    setFormError(null);
    void onSubmit({
      date,
      amount: Math.round(amountNumber * 100) / 100,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={openingBalance ? 'Изменить начальный остаток' : 'Задать начальный остаток'}
      size="sm"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Фактическая сумма наличных в центральной кассе на выбранную дату (по пересчёту денег).
          Остатки на все даты пересчитаются автоматически: начальный остаток не входит в обороты
          «Итого за период», только в остатки.
        </p>

        <div data-modal-form-group>
          <label htmlFor="cash_opening_date">Дата остатка *</label>
          <input
            id="cash_opening_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="cash_opening_amount">Сумма в кассе, ₽ *</label>
          <input
            id="cash_opening_amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="cash_opening_notes">Комментарий</label>
          <input
            id="cash_opening_notes"
            type="text"
            placeholder="Например: остаток по пересчёту 16.10"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            maxLength={1000}
          />
        </div>

        {formError ? <p data-modal-form-error>{formError}</p> : null}

        <div data-modal-form-actions>
          {openingBalance ? (
            <button
              type="button"
              className={styles.openingBtn}
              onClick={onDeleteAsk}
              disabled={submitting}
            >
              Удалить остаток
            </button>
          ) : null}
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button
            type="button"
            data-admin-mutation
            data-modal-btn="primary"
            onClick={handleSubmit}
            disabled={submitting || amount.trim() === ''}
          >
            {submitting ? 'Сохранение…' : openingBalance ? 'Сохранить' : 'Зафиксировать остаток'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
