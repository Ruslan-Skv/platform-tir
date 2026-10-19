'use client';

import { useEffect, useState } from 'react';

import type {
  AdminSupplierLedgerEntry,
  AdminSupplierRequisite,
  SaveSupplierLedgerEntryParams,
} from '@/shared/api/admin-suppliers';
import { Modal } from '@/shared/ui/Modal';

import { parseMoneyInput } from '../../suppliers-page.utils';

type LedgerEntryModalProps = {
  open: boolean;
  onClose: () => void;
  /** null — новая запись. */
  initial: AdminSupplierLedgerEntry | null;
  /** Блоки реквизитов поставщика (селект виден, когда их больше одного). */
  requisites: AdminSupplierRequisite[];
  submitting: boolean;
  onSubmit: (params: SaveSupplierLedgerEntryParams) => Promise<void>;
};

function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

const VAT_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'НДС: не указано' },
  { value: '0', label: 'Без НДС (0%)' },
  { value: '20', label: 'НДС 20%' },
  { value: '22', label: 'НДС 22%' },
];

/** Запись ведомости поставщика: счёт (начисление) и/или оплата — как строка
 *  вкладки поставщика в таблице (дата, № счёта, сумма, оплата, примечание, НДС). */
export function LedgerEntryModal({
  open,
  onClose,
  initial,
  requisites,
  submitting,
  onSubmit,
}: LedgerEntryModalProps) {
  const [date, setDate] = useState(todayIso);
  const [documentNo, setDocumentNo] = useState('');
  const [amount, setAmount] = useState('');
  const [payment, setPayment] = useState('');
  const [note, setNote] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [requisiteId, setRequisiteId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setDate(initial?.date ?? todayIso());
    setDocumentNo(initial?.documentNo ?? '');
    setAmount(initial?.amount != null ? String(initial.amount) : '');
    setPayment(initial?.payment != null ? String(initial.payment) : '');
    setNote(initial?.note ?? '');
    setVatRate(initial?.vatRate != null ? String(initial.vatRate) : '');
    setRequisiteId(initial?.requisiteId ?? '');
  }, [open, initial]);

  const amountNumber = amount.trim() ? parseMoneyInput(amount) : null;
  const paymentNumber = payment.trim() ? parseMoneyInput(payment) : null;

  const handleSubmit = () => {
    if (!date) {
      setFormError('Укажите дату записи');
      return;
    }
    const hasAmount = amountNumber != null && amountNumber !== 0;
    const hasPayment = paymentNumber != null && paymentNumber !== 0;
    if (!hasAmount && !hasPayment) {
      setFormError('Заполните сумму счёта и/или оплату');
      return;
    }
    if (amount.trim() && amountNumber == null) {
      setFormError('Сумма счёта — число, например 84742');
      return;
    }
    if (payment.trim() && paymentNumber == null) {
      setFormError('Оплата — число, например 43342,50');
      return;
    }
    setFormError(null);
    void onSubmit({
      date,
      documentNo: documentNo.trim() || undefined,
      amount: hasAmount ? Math.round(amountNumber! * 100) / 100 : null,
      payment: hasPayment ? Math.round(paymentNumber! * 100) / 100 : null,
      note: note.trim() || undefined,
      vatRate: vatRate === '' ? null : Number(vatRate),
      requisiteId: requisiteId || null,
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={initial ? 'Изменить запись ведомости' : 'Запись в ведомости поставщика'}
      size="md"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Счёт увеличивает задолженность перед поставщиком, оплата — уменьшает. Можно заполнить обе
          суммы (счёт и частичную оплату по нему). № документа — свободной строкой, как в таблице.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="ledger_date">Дата *</label>
            <input
              id="ledger_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="ledger_document">Документ (№ счёта)</label>
            <input
              id="ledger_document"
              type="text"
              placeholder="№ 71 от 14 октября 2026 г."
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              disabled={submitting}
              maxLength={200}
            />
          </div>
        </div>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="ledger_amount">Сумма счёта, ₽</label>
            <input
              id="ledger_amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="ledger_payment">Оплата, ₽</label>
            <input
              id="ledger_payment"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="ledger_vat">НДС</label>
            <select
              id="ledger_vat"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              disabled={submitting}
            >
              {VAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {requisites.length > 1 ? (
            <div data-modal-form-group>
              <label htmlFor="ledger_requisite">Реквизиты (юрлицо)</label>
              <select
                id="ledger_requisite"
                value={requisiteId}
                onChange={(e) => setRequisiteId(e.target.value)}
                disabled={submitting}
              >
                <option value="">Не указаны</option>
                {requisites.map((requisite) => (
                  <option key={requisite.id} value={requisite.id}>
                    {requisite.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div data-modal-form-group>
          <label htmlFor="ledger_note">Примечание (№ договора)</label>
          <input
            id="ledger_note"
            type="text"
            placeholder="3742о-1 / бн с ип сбер"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            maxLength={500}
          />
        </div>

        {formError ? <p data-modal-form-error>{formError}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button
            type="button"
            data-admin-mutation
            data-modal-btn="primary"
            onClick={handleSubmit}
            disabled={submitting || (!amount.trim() && !payment.trim())}
          >
            {submitting ? 'Сохранение…' : initial ? 'Сохранить' : 'Добавить запись'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
