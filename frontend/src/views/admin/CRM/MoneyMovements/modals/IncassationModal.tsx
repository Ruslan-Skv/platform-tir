'use client';

import { useEffect, useState } from 'react';

import {
  type IncassationCashBalance,
  type MoneyMovementManagerOption,
  createManagerIncassation,
} from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from '../MoneyMovements.module.css';
import { formatDpDate, formatDpMoney, formatDpTime } from '../money-movements-page.constants';
import formStyles from './MoneyMovementModalForm.module.css';

export type IncassationSubmitData = Parameters<typeof createManagerIncassation>[0];

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
  const [onBehalfOfId, setOnBehalfOfId] = useState('');
  const [amount, setAmount] = useState('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [incassator, setIncassator] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Новая запись — чистая форма: дата по умолчанию «сейчас».
  useEffect(() => {
    if (!open) return;
    setManagerId('');
    setManagerTouched(false);
    setOnBehalfOfId('');
    setAmount('');
    setAmountTouched(false);
    setIncassator('');
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

  // Остаток наличных считается по кассе менеджера из «За кого сдаётся инкассация»,
  // а если он не выбран — по кассе самого сдающего.
  const handleManagerChange = (nextId: string) => {
    setManagerTouched(true);
    setManagerId(nextId);
    // Сумма пересчитается под нового менеджера — ручные правки суммы сбрасываем.
    setAmountTouched(false);
    setAmount('');
    onManagerChange(onBehalfOfId || nextId);
  };

  const handleOnBehalfOfChange = (nextId: string) => {
    // Фиксируем дефолт сдающего (текущего пользователя), чтобы он не перетёрся балансом.
    setManagerTouched(true);
    setOnBehalfOfId(nextId);
    setAmountTouched(false);
    setAmount('');
    onManagerChange(nextId || managerId);
  };

  // Если дефолтный менеджер (текущий пользователь) не из справочника — показываем его отдельной опцией.
  const managerInList = managers.some((m) => m.id === managerId);
  const fallbackManagerOption =
    !managerInList && managerId && balance?.managerName ? (
      <option value={managerId}>{balance.managerName}</option>
    ) : null;

  // Кнопка «Записать инкассацию» неактивна, пока не заполнены обязательные поля
  // (критерии те же, что в валидации handleSubmit).
  const amountNumber = Number(amount.replace(',', '.'));
  const canSubmit =
    Boolean(managerId) &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    incassator.trim().length >= 2;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!managerId) {
      setError('Выберите менеджера, сдающего инкассацию');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Укажите сумму инкассации (положительное число)');
      return;
    }
    if (incassator.trim().length < 2) {
      setError('Укажите ФИО лица, производившего инкассацию');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        managerId,
        onBehalfOfId: onBehalfOfId && onBehalfOfId !== managerId ? onBehalfOfId : undefined,
        amount: amountNumber,
        incassator: incassator.trim(),
        notes: notes.trim() || undefined,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Не удалось записать инкассацию'
      );
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Инкассация наличных"
      size="sm"
      className={formStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <form
        className={`${formStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Запись закрывает остаток наличных менеджера с момента последней инкассации: наличные
          оплаты минус наличные возвраты.
        </p>

        <div data-modal-form-group>
          <label htmlFor="incassation-manager">Менеджер, сдающий инкассацию *</label>
          <select
            id="incassation-manager"
            value={managerId}
            onChange={(e) => handleManagerChange(e.target.value)}
            disabled={submitting || balanceLoading}
            required
          >
            <option value="">— выбрать менеджера —</option>
            {fallbackManagerOption}
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div data-modal-form-group>
          <label htmlFor="incassation-on-behalf">За кого сдаётся инкассация</label>
          <select
            id="incassation-on-behalf"
            value={onBehalfOfId}
            onChange={(e) => handleOnBehalfOfChange(e.target.value)}
            disabled={submitting || balanceLoading}
          >
            <option value="">— сдал за себя —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className={formStyles.balanceBox}>
          {balanceLoading ? (
            <span className={styles.muted}>Считаем наличчные с последней инкассации…</span>
          ) : balance ? (
            <>
              <div className={styles.incassationBalanceRow}>
                <span>
                  Наличные с последней инкассации
                  {onBehalfOfId && balance.managerName ? ` (${balance.managerName})` : ''}:
                </span>
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

        <div data-modal-form-group>
          <label htmlFor="incassation-amount">Сумма инкассации, ₽ *</label>
          <input
            id="incassation-amount"
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
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="incassation-incassator">ФИО лица, производившего инкассацию *</label>
          <input
            id="incassation-incassator"
            type="text"
            value={incassator}
            onChange={(e) => setIncassator(e.target.value)}
            disabled={submitting}
            placeholder="Например: Иванов Иван Иванович"
            maxLength={500}
            required
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="incassation-notes">Примечание</label>
          <textarea
            id="incassation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            rows={2}
            maxLength={1000}
          />
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button
            type="submit"
            data-admin-mutation
            data-modal-btn="primary"
            disabled={submitting || !canSubmit}
          >
            {submitting ? 'Сохранение…' : 'Записать инкассацию'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
