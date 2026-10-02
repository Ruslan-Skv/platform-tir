'use client';

import { useEffect, useMemo, useState } from 'react';

import type {
  BankCode,
  BankEntry,
  BankEntryInput,
  BankEntryType,
} from '@/shared/api/accounting/admin-bank-entries';
import { Modal } from '@/shared/ui/Modal';

import styles from './BankPage.module.css';
import { BANK_ENTRY_TYPE_OPTIONS, BANK_OPTIONS } from './bank-page.constants';

type BankEntryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Редактируемая запись; null — создание новой. */
  entry: BankEntry | null;
  saving: boolean;
  onSubmit: (input: BankEntryInput) => void;
};

function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

function parseAmount(value: string): number {
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function amountToString(value: string | null): string {
  if (value == null) return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

/** Модалка внесения/исправления поступления по банковской выписке. */
export function BankEntryModal({ isOpen, onClose, entry, saving, onSubmit }: BankEntryModalProps) {
  const [entryDate, setEntryDate] = useState(todayIso());
  const [bank, setBank] = useState<BankCode>('SBER');
  const [entryType, setEntryType] = useState<BankEntryType>('TERMINAL_QR');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [refund, setRefund] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFormError(null);
    if (entry) {
      setEntryDate(entry.entryDate);
      setBank(entry.bank);
      setEntryType(entry.entryType);
      setAmount(amountToString(entry.amount));
      setFee(amountToString(entry.fee));
      setRefund(amountToString(entry.refund));
      setCounterparty(entry.counterparty ?? '');
      setNotes(entry.notes ?? '');
    } else {
      setEntryDate(todayIso());
      setBank('SBER');
      setEntryType('TERMINAL_QR');
      setAmount('');
      setFee('');
      setRefund('');
      setCounterparty('');
      setNotes('');
    }
  }, [isOpen, entry]);

  const total = useMemo(
    () => parseAmount(amount) + parseAmount(fee) + parseAmount(refund),
    [amount, fee, refund]
  );

  const handleSubmit = () => {
    const amountNum = parseAmount(amount);
    const feeNum = parseAmount(fee);
    const refundNum = parseAmount(refund);
    if (!entryDate) {
      setFormError('Укажите дату зачисления');
      return;
    }
    if (amountNum < 0 || feeNum < 0 || refundNum < 0) {
      setFormError('Суммы не могут быть отрицательными');
      return;
    }
    if (amountNum + feeNum + refundNum <= 0) {
      setFormError('Укажите хотя бы одну сумму (зачисление, комиссия или возврат)');
      return;
    }
    onSubmit({
      entryDate,
      bank,
      entryType,
      amount: amountNum,
      fee: feeNum,
      refund: refundNum,
      counterparty: counterparty.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={entry ? 'Исправить поступление банка' : 'Внести поступление банка'}
      size="md"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint>
          Запись по банковской выписке: зачисление на счёт (за вычетом комиссии), комиссия банка и
          возврат, если был. «Терминал + QR» включает эквайринг, СБП и QR-оплаты. Итого считается
          автоматически.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="bank_entry_date">Дата зачисления *</label>
            <input
              id="bank_entry_date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="bank_entry_bank">Банк *</label>
            <select
              id="bank_entry_bank"
              value={bank}
              onChange={(e) => setBank(e.target.value as BankCode)}
              disabled={saving}
              required
            >
              {BANK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="bank_entry_type">Способ оплаты *</label>
            <select
              id="bank_entry_type"
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as BankEntryType)}
              disabled={saving}
              required
            >
              {BANK_ENTRY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="bank_entry_amount">Зачислено на счёт, ₽ *</label>
            <input
              id="bank_entry_amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="bank_entry_fee">Комиссия банка, ₽</label>
            <input
              id="bank_entry_fee"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              disabled={saving}
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="bank_entry_refund">Возврат, ₽</label>
            <input
              id="bank_entry_refund"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={refund}
              onChange={(e) => setRefund(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div data-modal-form-group>
          <label htmlFor="bank_entry_counterparty">Контрагент / источник</label>
          <input
            id="bank_entry_counterparty"
            type="text"
            placeholder="Например: токмакова, хибины транс"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            disabled={saving}
            maxLength={500}
          />
        </div>

        <div data-modal-form-group>
          <label htmlFor="bank_entry_notes">Примечание</label>
          <textarea
            id="bank_entry_notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
            maxLength={2000}
          />
        </div>

        <div className={styles.formTotalRow}>
          <span>Итого (зачисление + комиссия + возврат):</span>
          <strong>
            {total.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            ₽
          </strong>
        </div>

        {formError ? <p data-modal-form-error>{formError}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button
            type="button"
            data-admin-mutation
            data-modal-btn="primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Сохранение…' : entry ? 'Сохранить' : 'Внести поступление'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
