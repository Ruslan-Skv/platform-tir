'use client';

import { useEffect, useState } from 'react';

import {
  type IncassationCashBalance,
  type MoneyMovementManagerOption,
  createManualMoneyMovement,
} from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';

import styles from '../MoneyMovements.module.css';
import { DP_PAYMENT_FORM_OPTIONS, todayIsoDate } from '../money-movements-page.constants';

export type ManualEntrySubmitData = Parameters<typeof createManualMoneyMovement>[0];

type ManualEntryKind = 'withdrawal' | 'deposit';

type ManualEntryModalProps = {
  open: boolean;
  onClose: () => void;
  /** Менеджеры из справочника карточек — как в фильтре «Все менеджеры». */
  managers: MoneyMovementManagerOption[];
  /** Ответ баланса — источник дефолтного менеджера (текущий пользователь). */
  defaultManager: IncassationCashBalance | null;
  submitting: boolean;
  onSubmit: (data: ManualEntrySubmitData) => Promise<void>;
};

export function ManualEntryModal({
  open,
  onClose,
  managers,
  defaultManager,
  submitting,
  onSubmit,
}: ManualEntryModalProps) {
  const [kind, setKind] = useState<ManualEntryKind>('withdrawal');
  const [managerId, setManagerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentForm, setPaymentForm] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState('');
  const [basis, setBasis] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Новая проводка — чистая форма: сегодня, изъятие, наличные.
  useEffect(() => {
    if (!open) return;
    setKind('withdrawal');
    setManagerId('');
    setAmount('');
    setPaymentForm('CASH');
    setPaymentDate(todayIsoDate());
    setBasis('');
    setNotes('');
    setError(null);
  }, [open]);

  // Дефолт в селекте — текущий пользователь (из ответа баланса).
  useEffect(() => {
    if (!open || managerId || !defaultManager) return;
    setManagerId(defaultManager.managerId);
  }, [open, defaultManager, managerId]);

  const managerInList = managers.some((m) => m.id === managerId);
  const fallbackManagerOption =
    !managerInList && managerId && defaultManager?.managerName ? (
      <option value={managerId}>{defaultManager.managerName}</option>
    ) : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const amountNumber = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Укажите сумму проводки (положительное число)');
      return;
    }
    if (!managerId) {
      setError('Выберите менеджера, по кассе которого проводится запись');
      return;
    }
    if (basis.trim().length < 2) {
      setError('Укажите основание (например: Бытовые нужды)');
      return;
    }
    if (!paymentDate) {
      setError('Укажите дату записи');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        managerId,
        amount: kind === 'withdrawal' ? -amountNumber : amountNumber,
        paymentForm,
        paymentDate,
        basis: basis.trim(),
        notes: notes.trim() || undefined,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось записать проводку');
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Ручная запись в журнале ДП" size="sm">
      <form className={styles.incassationForm} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.incassationField}>
          <span>Тип операции *</span>
          <div className={styles.manualEntryKindRow} role="group" aria-label="Тип операции">
            <button
              type="button"
              disabled={submitting}
              className={
                kind === 'withdrawal'
                  ? styles.manualEntryKindActiveWithdrawal
                  : styles.manualEntryKindBtn
              }
              onClick={() => setKind('withdrawal')}
            >
              − Изъятие из кассы
            </button>
            <button
              type="button"
              disabled={submitting}
              className={
                kind === 'deposit' ? styles.manualEntryKindActiveDeposit : styles.manualEntryKindBtn
              }
              onClick={() => setKind('deposit')}
            >
              + Внесение в кассу
            </button>
          </div>
        </div>

        <label className={styles.incassationField}>
          <span>Менеджер (касса) *</span>
          <select
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            disabled={submitting}
            required
            aria-label="Менеджер, по кассе которого проводится запись"
          >
            <option value="">— выбрать менеджера —</option>
            {fallbackManagerOption}
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.incassationField}>
          <span>Сумма, ₽ *</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            required
            aria-label="Сумма проводки"
          />
        </label>

        <label className={styles.incassationField}>
          <span>Способ *</span>
          <select
            value={paymentForm}
            onChange={(e) => setPaymentForm(e.target.value)}
            disabled={submitting}
            required
            aria-label="Способ"
          >
            {DP_PAYMENT_FORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.incassationField}>
          <span>Дата записи *</span>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            disabled={submitting}
            required
            aria-label="Дата записи"
          />
        </label>

        <label className={styles.incassationField}>
          <span>Основание *</span>
          <input
            type="text"
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            disabled={submitting}
            placeholder="Например: Бытовые нужды"
            maxLength={500}
            required
            aria-label="Основание проводки"
          />
        </label>

        <label className={styles.incassationField}>
          <span>Примечание</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={2}
            maxLength={1000}
            aria-label="Примечание к проводке"
          />
        </label>

        {error ? <div className={styles.incassationError}>{error}</div> : null}

        <div className={styles.incassationActions}>
          <button type="button" className={styles.resetBtn} onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button type="submit" className={styles.incassationSubmitBtn} disabled={submitting}>
            {submitting ? 'Сохранение…' : 'Записать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
