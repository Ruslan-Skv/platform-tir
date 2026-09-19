'use client';

import { useEffect, useState } from 'react';

import {
  type IncassationCashBalance,
  type MoneyMovementManagerOption,
  createManagerIncassation,
} from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';

import styles from '../MoneyMovements.module.css';
import { formatDpDate, formatDpMoney, formatDpTime } from '../money-movements-page.constants';

export type IncassationSubmitData = Parameters<typeof createManagerIncassation>[0];

function toLocalDateTimeValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type IncassationModalProps = {
  open: boolean;
  onClose: () => void;
  /** Менеджеры из справочника карточек — как в фильтре «Все менеджеры». */
  managers: MoneyMovementManagerOption[];
  balance: IncassationCashBalance | null;
  balanceLoading: boolean;
  /** Смена менеджера — пересчитать остаток наличных. */
  onManagerChange: (managerId: string) => void;
  submitting: boolean;
  onSubmit: (data: IncassationSubmitData) => Promise<void>;
};

export function IncassationModal({
  open,
  onClose,
  managers,
  balance,
  balanceLoading,
  onManagerChange,
  submitting,
  onSubmit,
}: IncassationModalProps) {
  const [managerId, setManagerId] = useState('');
  const [managerTouched, setManagerTouched] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [incassator, setIncassator] = useState('');
  const [performedAt, setPerformedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Новая запись — чистая форма: дата по умолчанию «сейчас».
  useEffect(() => {
    if (!open) return;
    setManagerId('');
    setManagerTouched(false);
    setAmount('');
    setAmountTouched(false);
    setIncassator('');
    setPerformedAt(toLocalDateTimeValue(new Date()));
    setNotes('');
    setError(null);
  }, [open]);

  // Дефолт в селекте — менеджер из ответа баланса (текущий пользователь без выбора id).
  useEffect(() => {
    if (!open || managerTouched || !balance) return;
    setManagerId(balance.managerId);
  }, [open, balance, managerTouched]);

  // Подставляем рассчитанный остаток, пока сумму не правили вручную.
  useEffect(() => {
    if (!open || amountTouched || !balance) return;
    setAmount(balance.balance);
  }, [open, balance, amountTouched]);

  const handleManagerChange = (nextId: string) => {
    setManagerTouched(true);
    setManagerId(nextId);
    // Сумма пересчитается под нового менеджера — ручные правки суммы сбрасываем.
    setAmountTouched(false);
    setAmount('');
    onManagerChange(nextId);
  };

  // Если дефолтный менеджер (текущий пользователь) не из справочника — показываем его отдельной опцией.
  const managerInList = managers.some((m) => m.id === managerId);
  const fallbackManagerOption =
    !managerInList && managerId && balance?.managerName ? (
      <option value={managerId}>{balance.managerName}</option>
    ) : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!managerId) {
      setError('Выберите менеджера, сдающего инкассацию');
      return;
    }
    const amountNumber = Number(amount.replace(',', '.'));
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Укажите сумму инкассации (положительное число)');
      return;
    }
    if (incassator.trim().length < 2) {
      setError('Укажите ФИО лица, производившего инкассацию');
      return;
    }
    if (!performedAt) {
      setError('Укажите дату и время инкассации');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        managerId,
        amount: amountNumber,
        incassator: incassator.trim(),
        performedAt: new Date(performedAt).toISOString(),
        notes: notes.trim() || undefined,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Не удалось записать инкассацию'
      );
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Инкассация наличных" size="sm">
      <form className={styles.incassationForm} onSubmit={(e) => void handleSubmit(e)}>
        <label className={styles.incassationField}>
          <span>Менеджер, сдающий инкассацию *</span>
          <select
            value={managerId}
            onChange={(e) => handleManagerChange(e.target.value)}
            disabled={submitting || balanceLoading}
            required
            aria-label="Менеджер, сдающий инкассацию"
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

        <div className={styles.incassationBalanceBox}>
          {balanceLoading ? (
            <span className={styles.muted}>Считаем наличчные с последней инкассации…</span>
          ) : balance ? (
            <>
              <div className={styles.incassationBalanceRow}>
                <span>Наличные с последней инкассации:</span>
                <strong>{formatDpMoney(balance.balance)}</strong>
              </div>
              {balance.lastIncassation ? (
                <div className={styles.incassationBalanceHint}>
                  Последняя инкассация: {formatDpDate(balance.lastIncassation.performedAt)}{' '}
                  {formatDpTime(balance.lastIncassation.performedAt)},{' '}
                  {formatDpMoney(balance.lastIncassation.amount)} —{' '}
                  {balance.lastIncassation.incassator}
                </div>
              ) : (
                <div className={styles.incassationBalanceHint}>
                  Инкассаций ещё не было — в расчёте все наличные оплаты
                </div>
              )}
            </>
          ) : (
            <span className={styles.muted}>Остаток наличных недоступен</span>
          )}
        </div>

        <label className={styles.incassationField}>
          <span>Сумма инкассации, ₽ *</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmountTouched(true);
              setAmount(e.target.value);
            }}
            disabled={submitting}
            required
            aria-label="Сумма инкассации"
          />
        </label>

        <label className={styles.incassationField}>
          <span>ФИО лица, производившего инкассацию *</span>
          <input
            type="text"
            value={incassator}
            onChange={(e) => setIncassator(e.target.value)}
            disabled={submitting}
            placeholder="Например: Иванов Иван Иванович"
            maxLength={500}
            required
            aria-label="ФИО лица, производившего инкассацию"
          />
        </label>

        <label className={styles.incassationField}>
          <span>Дата и время инкассации *</span>
          <input
            type="datetime-local"
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            disabled={submitting}
            required
            aria-label="Дата и время инкассации"
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
            aria-label="Примечание к инкассации"
          />
        </label>

        {error ? <div className={styles.incassationError}>{error}</div> : null}

        <div className={styles.incassationActions}>
          <button type="button" className={styles.resetBtn} onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button type="submit" className={styles.incassationSubmitBtn} disabled={submitting}>
            {submitting ? 'Сохранение…' : 'Записать инкассацию'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
