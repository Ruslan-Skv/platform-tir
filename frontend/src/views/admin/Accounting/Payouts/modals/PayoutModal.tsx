'use client';

import { useEffect, useState } from 'react';

import {
  SALARY_PAYOUT_CATEGORY_LABELS,
  SALARY_PAYOUT_METHOD_LABELS,
  type SalaryPayoutCategory,
  type SalaryPayoutInput,
  type SalaryPayoutItem,
  type SalaryPayoutMethod,
} from '@/shared/api/accounting/admin-salary-payouts';
import { Modal } from '@/shared/ui/Modal';
import formStyles from '@/views/admin/CRM/MoneyMovements/modals/MoneyMovementModalForm.module.css';
import modalStyles from '@/views/admin/Catalog/Components/shared/ComponentCatalogModal.module.css';

import { todayIso } from '../../Bank/bank-page.constants';

/** Значение селекта получателя «другое лицо» — ФИО вводится вручную. */
const RECIPIENT_CUSTOM_VALUE = '__custom__';

type PayoutModalProps = {
  open: boolean;
  onClose: () => void;
  /** Сотрудники справочника «Карточки менеджеров» — как в селекте менеджера ДП. */
  managers: { id: string; name: string }[];
  /** Дефолтный менеджер кассы (текущий пользователь). */
  defaultManager: { managerId: string; managerName: string | null } | null;
  submitting: boolean;
  onSubmit: (data: SalaryPayoutInput) => Promise<void>;
  /** Редактируемая выплата — режим правки (супер-админ); null — создание. */
  editing?: SalaryPayoutItem | null;
};

export function PayoutModal({
  open,
  onClose,
  managers,
  defaultManager,
  submitting,
  onSubmit,
  editing = null,
}: PayoutModalProps) {
  const [paidAt, setPaidAt] = useState(todayIso());
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SalaryPayoutMethod>('CASH');
  const [category, setCategory] = useState<SalaryPayoutCategory>('SALARY');
  const [recipientMode, setRecipientMode] = useState<string>('EMPLOYEE');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [recipientCustomName, setRecipientCustomName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Новая выплата — чистая форма (сегодня, наличные, з/п, получатель-сотрудник).
  // Правка — форма предзаполнена данными редактируемой выплаты.
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setPaidAt(editing.paidAt);
      setAmount(editing.amount);
      setPaymentMethod(editing.method);
      setCategory(editing.category);
      const knownRecipient = managers.some((m) => m.name === editing.recipientName);
      setRecipientMode(knownRecipient ? 'EMPLOYEE' : RECIPIENT_CUSTOM_VALUE);
      setRecipientUserId('');
      setRecipientCustomName(knownRecipient ? '' : editing.recipientName);
      setManagerId(editing.manager?.id ?? '');
      setNote(editing.note ?? '');
    } else {
      setPaidAt(todayIso());
      setAmount('');
      setPaymentMethod('CASH');
      setCategory('SALARY');
      setRecipientMode('EMPLOYEE');
      setRecipientUserId('');
      setRecipientCustomName('');
      setManagerId('');
      setNote('');
    }
    setError(null);
    // managers меняется редко; предзаполнение правки зависит от него при открытии.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  // Дефолт в селекте кассы — текущий пользователь; в режиме правки не подставляем.
  useEffect(() => {
    if (!open || editing || managerId || !defaultManager) return;
    setManagerId(defaultManager.managerId);
  }, [open, editing, defaultManager, managerId]);

  const amountNumber = Number(amount.replace(',', '.'));
  const isCustomRecipient = recipientMode === RECIPIENT_CUSTOM_VALUE;
  const canSubmit =
    Number.isFinite(amountNumber) &&
    amountNumber > 0 &&
    Boolean(paidAt) &&
    (isCustomRecipient ? recipientCustomName.trim().length >= 2 : Boolean(recipientUserId)) &&
    (paymentMethod !== 'CASH' || Boolean(managerId));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paidAt) {
      setError('Укажите дату выплаты');
      return;
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setError('Укажите сумму выплаты (положительное число)');
      return;
    }
    if (!isCustomRecipient && !recipientUserId) {
      setError('Выберите получателя выплаты');
      return;
    }
    if (isCustomRecipient && recipientCustomName.trim().length < 2) {
      setError('Укажите ФИО получателя');
      return;
    }
    if (paymentMethod === 'CASH' && !managerId) {
      setError('Выберите менеджера, по кассе которого выдана выплата');
      return;
    }
    setError(null);
    try {
      await onSubmit({
        paidAt,
        amount: amountNumber,
        paymentMethod,
        category,
        ...(isCustomRecipient
          ? { recipientName: recipientCustomName.trim() }
          : { recipientUserId }),
        ...(paymentMethod === 'CASH' ? { managerId } : {}),
        note: note.trim() || undefined,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось записать выплату');
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={editing ? 'Редактирование выплаты з/п' : 'Выплата з/п'}
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
          Выплата зар/платы сотруднику или стороннему лицу. Наличная выплата попадает в кассу
          (менеджер, по чьей кассе она проведена), безналичная — в раздел «Банк»; обе видны в этом
          журнале.
        </p>

        <div data-modal-form-group>
          <label htmlFor="payout-recipient">Получатель *</label>
          <select
            id="payout-recipient"
            value={recipientMode === RECIPIENT_CUSTOM_VALUE ? recipientMode : recipientUserId}
            onChange={(e) => {
              const value = e.target.value;
              if (value === RECIPIENT_CUSTOM_VALUE) {
                setRecipientMode(RECIPIENT_CUSTOM_VALUE);
              } else {
                setRecipientMode('EMPLOYEE');
                setRecipientUserId(value);
              }
            }}
            disabled={submitting}
            required
          >
            <option value="">— выбрать сотрудника —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
            <option value={RECIPIENT_CUSTOM_VALUE}>— другое лицо (ввести ФИО) —</option>
          </select>
        </div>

        {isCustomRecipient ? (
          <div data-modal-form-group>
            <label htmlFor="payout-recipient-name">ФИО получателя *</label>
            <input
              id="payout-recipient-name"
              type="text"
              value={recipientCustomName}
              onChange={(e) => setRecipientCustomName(e.target.value)}
              disabled={submitting}
              placeholder="ФИО или организация"
              maxLength={200}
            />
          </div>
        ) : null}

        <div data-modal-form-group>
          <label htmlFor="payout-amount">Сумма, ₽ *</label>
          <input
            id="payout-amount"
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
          <label htmlFor="payout-paid-at">Дата выплаты *</label>
          <input
            id="payout-paid-at"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="payout-method">Способ *</label>
          <select
            id="payout-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as SalaryPayoutMethod)}
            disabled={submitting}
            required
          >
            {(Object.keys(SALARY_PAYOUT_METHOD_LABELS) as SalaryPayoutMethod[]).map((value) => (
              <option key={value} value={value}>
                {SALARY_PAYOUT_METHOD_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div data-modal-form-group>
          <label htmlFor="payout-category">Категория</label>
          <select
            id="payout-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as SalaryPayoutCategory)}
            disabled={submitting}
          >
            {(Object.keys(SALARY_PAYOUT_CATEGORY_LABELS) as SalaryPayoutCategory[]).map((value) => (
              <option key={value} value={value}>
                {SALARY_PAYOUT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {paymentMethod === 'CASH' ? (
          <div data-modal-form-group>
            <label htmlFor="payout-manager">Менеджер (касса) *</label>
            <select
              id="payout-manager"
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={submitting}
              required
            >
              <option value="">— выбрать менеджера —</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div data-modal-form-group>
          <label htmlFor="payout-note">Примечание</label>
          <textarea
            id="payout-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
            {submitting ? 'Сохранение…' : editing ? 'Сохранить' : 'Выплатить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
