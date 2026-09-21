'use client';

import { useEffect, useState } from 'react';

import {
  type IncassationCashBalance,
  type MoneyMovementManagerOption,
  createManualMoneyMovement,
} from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from '../MoneyMovements.module.css';
import { DP_PAYMENT_FORM_OPTIONS, todayIsoDate } from '../money-movements-page.constants';
import formStyles from './MoneyMovementModalForm.module.css';

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

  // Кнопка «Записать» неактивна, пока не заполнены обязательные поля
  // (критерии те же, что в валидации handleSubmit).
  const amountNumber = Number(amount.replace(',', '.'));
  const canSubmit =
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    Boolean(managerId) &&
    basis.trim().length >= 2 &&
    Boolean(paymentDate);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Ручная запись в журнале ДП"
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
          Проводка вне оплат по договорам: изъятие из кассы (например, на бытовые нужды) или
          внесение сумм, не проведённых в оплатах. Наличные записи участвуют в остатке для
          инкассации.
        </p>

        <div data-modal-form-group>
          <label>Тип операции *</label>
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

        <div data-modal-form-group>
          <label htmlFor="manual-entry-manager">Менеджер (касса) *</label>
          <select
            id="manual-entry-manager"
            value={managerId}
            onChange={(e) => setManagerId(e.target.value)}
            disabled={submitting}
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
          <label htmlFor="manual-entry-amount">Сумма, ₽ *</label>
          <input
            id="manual-entry-amount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="manual-entry-payment-form">Способ *</label>
          <select
            id="manual-entry-payment-form"
            value={paymentForm}
            onChange={(e) => setPaymentForm(e.target.value)}
            disabled={submitting}
            required
          >
            {DP_PAYMENT_FORM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div data-modal-form-group>
          <label htmlFor="manual-entry-payment-date">Дата записи *</label>
          <input
            id="manual-entry-payment-date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="manual-entry-basis">Основание *</label>
          <input
            id="manual-entry-basis"
            type="text"
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            disabled={submitting}
            placeholder="Например: Бытовые нужды"
            maxLength={500}
            required
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="manual-entry-notes">Примечание</label>
          <textarea
            id="manual-entry-notes"
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
            {submitting ? 'Сохранение…' : 'Записать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
