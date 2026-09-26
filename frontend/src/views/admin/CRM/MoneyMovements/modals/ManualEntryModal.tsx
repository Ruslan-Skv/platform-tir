'use client';

import { useEffect, useState } from 'react';

import {
  type IncassationCashBalance,
  type ManualMoneyMovementParams,
  type MoneyMovement,
  type MoneyMovementManagerOption,
} from '@/shared/api/crm/admin-money-movements';
import { Modal } from '@/shared/ui/Modal';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import styles from '../MoneyMovements.module.css';
import {
  DP_FURNITURE_DIRECTION,
  DP_MANUAL_DIRECTION_OPTIONS,
  DP_OTHER_DIRECTION,
  DP_PAYMENT_FORM_OPTIONS,
} from '../money-movements-page.constants';
import formStyles from './MoneyMovementModalForm.module.css';

export type ManualEntrySubmitData = ManualMoneyMovementParams;

type ManualEntryKind = 'withdrawal' | 'deposit';
type ManualEntryModalProps = {
  open: boolean;
  onClose: () => void;
  /** Менеджеры из справочника карточек — как в фильтре «Все менеджеры». */
  managers: MoneyMovementManagerOption[];
  /** Ответ баланса — источник дефолтного менеджера (текущий пользователь). */
  defaultManager: IncassationCashBalance | null;
  /** Названия исполнителей из справочника реквизитов — для направления «Мебель». */
  executors: string[];
  submitting: boolean;
  onSubmit: (data: ManualEntrySubmitData) => Promise<void>;
  /** Редактируемая запись — режим правки (супер-админ); null/undefined — создание. */
  editing?: MoneyMovement | null;
};

export function ManualEntryModal({
  open,
  onClose,
  managers,
  defaultManager,
  executors,
  submitting,
  onSubmit,
  editing = null,
}: ManualEntryModalProps) {
  /** Тип операции не выбран по умолчанию — менеджер осознанно выбирает режим записи. */
  const [kind, setKind] = useState<ManualEntryKind | null>(null);
  const [managerId, setManagerId] = useState('');
  const [direction, setDirection] = useState('');
  const [executor, setExecutor] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentForm, setPaymentForm] = useState('CASH');
  const [basis, setBasis] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // № договора и заказчик — только для направлений и «Материалов»; «Прочее» — вне договоров.
  const showContractFields = Boolean(direction) && direction !== DP_OTHER_DIRECTION;
  // Исполнитель — только для «Мебели» (наборы реквизитов со страницы «Реквизиты»).
  const showExecutorField = direction === DP_FURNITURE_DIRECTION;

  const changeDirection = (value: string) => {
    setDirection(value);
    if (value !== DP_FURNITURE_DIRECTION) {
      setExecutor('');
    }
    if (!value || value === DP_OTHER_DIRECTION) {
      setContractNumber('');
      setCustomerName('');
    }
  };

  // Новая проводка — чистая форма: сегодня, тип операции не выбран, наличные.
  // Правка — форма предзаполнена данными редактируемой записи.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      const editingAmount = Number(editing.amount);
      setKind(editingAmount < 0 ? 'withdrawal' : 'deposit');
      setManagerId(editing.manager?.id ?? '');
      setDirection(editing.direction ?? '');
      setExecutor(editing.executorName ?? '');
      setContractNumber(editing.contractNumber ?? '');
      setCustomerName(editing.customerName ?? '');
      setAmount(Number.isFinite(editingAmount) ? String(Math.abs(editingAmount)) : '');
      setPaymentForm(editing.paymentForm);
      setBasis(editing.basis ?? '');
      setNotes(editing.notes ?? '');
    } else {
      setKind(null);
      setManagerId('');
      setDirection('');
      setExecutor('');
      setContractNumber('');
      setCustomerName('');
      setAmount('');
      setPaymentForm('CASH');
      setBasis('');
      setNotes('');
    }
    setError(null);
  }, [open, editing]);

  // Дефолт в селекте — текущий пользователь (из ответа баланса); в режиме правки не подставляем,
  // чтобы случайно не переатрибутировать запись на редактирующего.
  useEffect(() => {
    if (!open || editing || managerId || !defaultManager) return;
    setManagerId(defaultManager.managerId);
  }, [open, editing, defaultManager, managerId]);

  const managerInList = managers.some((m) => m.id === managerId);
  // Менеджер записи может быть не из справочника карточек — держим его видимой опцией селекта.
  const fallbackManagerName =
    editing && editing.manager?.id === managerId
      ? (editing.manager?.name ?? null)
      : defaultManager && defaultManager.managerId === managerId
        ? defaultManager.managerName
        : null;
  const fallbackManagerOption =
    !managerInList && managerId && fallbackManagerName ? (
      <option value={managerId}>{fallbackManagerName}</option>
    ) : null;

  // Исполнитель записи мог исчезнуть из справочника реквизитов — держим его видимой опцией селекта.
  const executorInList = executors.some((name) => name === executor);
  const fallbackExecutorOption =
    editing && executor && !executorInList ? <option value={executor}>{executor}</option> : null;

  // Кнопка «Записать» неактивна, пока не заполнены обязательные поля
  // (критерии те же, что в валидации handleSubmit).
  const amountNumber = Number(amount.replace(',', '.'));
  const canSubmit =
    kind !== null &&
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    Boolean(managerId) &&
    Boolean(direction) &&
    basis.trim().length >= 2;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!kind) {
      setError('Выберите тип операции: внесение или изъятие из кассы');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Укажите сумму проводки (положительное число)');
      return;
    }
    if (!managerId) {
      setError('Выберите менеджера, по кассе которого проводится запись');
      return;
    }
    if (!direction) {
      setError('Выберите направление (для движений вне продаж — «Прочее»)');
      return;
    }
    if (basis.trim().length < 2) {
      setError('Укажите основание (например: Бытовые нужды)');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        managerId,
        amount: kind === 'withdrawal' ? -amountNumber : amountNumber,
        paymentForm,
        direction,
        // № договора, заказчик и исполнитель — поля не всех направлений.
        ...(showContractFields
          ? {
              contractNumber: contractNumber.trim() || undefined,
              customerName: customerName.trim() || undefined,
            }
          : {}),
        ...(showExecutorField ? { executorName: executor.trim() || undefined } : {}),
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
      title={editing ? 'Редактирование ручной записи ДП' : 'Ручная запись в журнале ДП'}
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
          инкассации. Записи «Прочее» не учитываются в итоговых продажах.
        </p>

        <div data-modal-form-group>
          <label>Тип операции *</label>
          <div className={styles.manualEntryKindRow} role="group" aria-label="Тип операции">
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
          <label htmlFor="manual-entry-direction">Направление *</label>
          <select
            id="manual-entry-direction"
            value={direction}
            onChange={(e) => changeDirection(e.target.value)}
            disabled={submitting}
            required
          >
            <option value="">— выбрать направление —</option>
            {DP_MANUAL_DIRECTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showExecutorField ? (
          <div data-modal-form-group>
            <label htmlFor="manual-entry-executor">Исполнитель</label>
            <select
              id="manual-entry-executor"
              value={executor}
              onChange={(e) => setExecutor(e.target.value)}
              disabled={submitting}
            >
              <option value="">— не выбран —</option>
              {fallbackExecutorOption}
              {executors.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {showContractFields ? (
          <>
            <div data-modal-form-group>
              <label htmlFor="manual-entry-contract-number">№ договора</label>
              <input
                id="manual-entry-contract-number"
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                disabled={submitting}
                placeholder="Например: 123-д"
                maxLength={100}
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="manual-entry-customer-name">Заказчик</label>
              <input
                id="manual-entry-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={submitting}
                placeholder="ФИО или организация"
                maxLength={200}
              />
            </div>
          </>
        ) : null}

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
            {submitting ? 'Сохранение…' : editing ? 'Сохранить' : 'Записать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
