'use client';

import { useEffect, useState } from 'react';

import type {
  AdminSupplierLedgerEntry,
  AdminSupplierRequisite,
  SaveSupplierLedgerEntryParams,
} from '@/shared/api/admin-suppliers';
import { Modal } from '@/shared/ui/Modal';

import { parseMoneyInput } from '../../suppliers-page.utils';

type PaymentEntryModalProps = {
  open: boolean;
  onClose: () => void;
  /** null — новая оплата. */
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

/** Оплата поставщику (проводит супер-админ): одной суммой по всем счетам —
 *  после проведения система сама гасит самые ранние неоплаченные счета (FIFO). */
export function PaymentEntryModal({
  open,
  onClose,
  initial,
  requisites,
  submitting,
  onSubmit,
}: PaymentEntryModalProps) {
  const [date, setDate] = useState(todayIso);
  const [documentNo, setDocumentNo] = useState('');
  const [payment, setPayment] = useState('');
  const [note, setNote] = useState('');
  const [requisiteId, setRequisiteId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setDate(initial?.date ?? todayIso());
    setDocumentNo(initial?.documentNo ?? '');
    setPayment(initial?.payment != null ? String(initial.payment) : '');
    setNote(initial?.note ?? '');
    setRequisiteId(initial?.requisiteId ?? '');
  }, [open, initial]);

  const paymentNumber = payment.trim() ? parseMoneyInput(payment) : null;

  const handleSubmit = () => {
    if (!date) {
      setFormError('Укажите дату оплаты');
      return;
    }
    if (paymentNumber == null || paymentNumber <= 0) {
      setFormError('Сумма оплаты — положительное число, например 43342,50');
      return;
    }
    setFormError(null);
    void onSubmit({
      date,
      documentNo: documentNo.trim() || undefined,
      payment: Math.round(paymentNumber * 100) / 100,
      note: note.trim() || undefined,
      requisiteId: requisiteId || null,
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={initial ? 'Изменить оплату' : 'Оплата поставщику'}
      size="sm"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Оплату проводит только супер-админ — обычно одной суммой сразу по всем счетам. После
          сохранения система автоматически отметит оплаченными самые ранние неоплаченные счета этого
          поставщика; если суммы не хватит — останутся «Частично»/«Не оплачен», излишек станет
          переплатой.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="payment_date">Дата оплаты *</label>
            <input
              id="payment_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="payment_amount">Сумма оплаты, ₽ *</label>
            <input
              id="payment_amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div data-modal-form-group>
          <label htmlFor="payment_document">Документ (№ п/п)</label>
          <input
            id="payment_document"
            type="text"
            placeholder="№ 128 от 18 октября 2026 г."
            value={documentNo}
            onChange={(e) => setDocumentNo(e.target.value)}
            disabled={submitting}
            maxLength={200}
          />
        </div>

        {requisites.length > 1 ? (
          <div data-modal-form-group>
            <label htmlFor="payment_requisite">Реквизиты (юрлицо)</label>
            <select
              id="payment_requisite"
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

        <div data-modal-form-group>
          <label htmlFor="payment_note">Примечание</label>
          <input
            id="payment_note"
            type="text"
            placeholder="с р/с сбер, по счетам за неделю…"
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
            disabled={submitting || !payment.trim()}
          >
            {submitting ? 'Сохранение…' : initial ? 'Сохранить оплату' : 'Провести оплату'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
