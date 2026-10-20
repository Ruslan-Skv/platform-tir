'use client';

import { useEffect, useState } from 'react';

import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import type {
  AdminSupplierLedgerEntry,
  AdminSupplierRequisite,
  SaveSupplierLedgerEntryParams,
} from '@/shared/api/admin-suppliers';
import { Modal } from '@/shared/ui/Modal';
import {
  PackageOrderSearch,
  packageContractNumberLabel,
} from '@/views/admin/CRM/shared/PackageOrderSearch';

import { parseMoneyInput } from '../../suppliers-page.utils';
import styles from './OrderLinksEditor.module.css';

type InvoiceEntryModalProps = {
  open: boolean;
  onClose: () => void;
  /** null — новый счёт. */
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
  { value: '5', label: 'НДС 5%' },
  { value: '10', label: 'НДС 10%' },
  { value: '20', label: 'НДС 20%' },
  { value: '22', label: 'НДС 22%' },
];

/** Строка разбивки: выбранный заказ + отнесённая на него часть суммы счёта. */
type OrderLinkRow = {
  packageId: string;
  label: string;
  amount: string;
};

/** Серийный пакет из ссылки ведомости — для подписи хелперами поиска заказа
 *  (читают только formData/title), полноценный ContractDocumentPackage не нужен. */
function linkPackageLabel(pkg: AdminSupplierLedgerEntry['orderLinks'][number]['package']): string {
  return packageContractNumberLabel(pkg as unknown as ContractDocumentPackage);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Счёт от поставщика (вносят ведущие специалисты): сумма, НДС и разбивка по
 *  заказам/договорам — для будущего контроля рентабельности закупок. */
export function InvoiceEntryModal({
  open,
  onClose,
  initial,
  requisites,
  submitting,
  onSubmit,
}: InvoiceEntryModalProps) {
  const [date, setDate] = useState(todayIso);
  const [documentNo, setDocumentNo] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [vatRate, setVatRate] = useState('');
  const [requisiteId, setRequisiteId] = useState('');
  const [orders, setOrders] = useState<OrderLinkRow[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setDate(initial?.date ?? todayIso());
    setDocumentNo(initial?.documentNo ?? '');
    setAmount(initial?.amount != null ? String(initial.amount) : '');
    setNote(initial?.note ?? '');
    setVatRate(initial?.vatRate != null ? String(initial.vatRate) : '');
    setRequisiteId(initial?.requisiteId ?? '');
    setOrders(
      (initial?.orderLinks ?? []).map((link) => ({
        packageId: link.packageId,
        label: linkPackageLabel(link.package),
        amount: String(link.amount),
      }))
    );
    setOrderSearch('');
  }, [open, initial]);

  const amountNumber = amount.trim() ? parseMoneyInput(amount) : null;

  const parsedOrderAmounts = orders.map((row) =>
    row.amount.trim() ? parseMoneyInput(row.amount) : null
  );
  const ordersSum = round2(
    parsedOrderAmounts.reduce<number>((acc, value) => acc + (value ?? 0), 0)
  );
  const amountValue = amountNumber != null && amountNumber !== 0 ? round2(amountNumber) : null;
  const remainder = amountValue != null ? round2(amountValue - ordersSum) : null;

  const handleOrderSelect = (pkg: ContractDocumentPackage) => {
    setOrders((current) => {
      if (current.some((row) => row.packageId === pkg.id)) return current;
      return [
        ...current,
        { packageId: pkg.id, label: packageContractNumberLabel(pkg), amount: '' },
      ];
    });
    setOrderSearch('');
  };

  const handleSubmit = () => {
    if (!date) {
      setFormError('Укажите дату счёта');
      return;
    }
    if (!documentNo.trim()) {
      setFormError('Укажите номер счёта');
      return;
    }
    if (amountNumber == null || amountNumber <= 0) {
      setFormError('Сумма счёта — положительное число, например 84742');
      return;
    }
    if (vatRate === '') {
      setFormError('Укажите НДС (или выберите «Без НДС»)');
      return;
    }
    if (orders.some((row, index) => parsedOrderAmounts[index] == null)) {
      setFormError('Укажите сумму по каждому прикреплённому заказу (или уберите его)');
      return;
    }
    if (ordersSum > round2(amountNumber) + 0.005) {
      setFormError('Сумма разбивки по заказам превышает сумму счёта');
      return;
    }
    setFormError(null);
    void onSubmit({
      date,
      documentNo: documentNo.trim() || undefined,
      amount: round2(amountNumber),
      note: note.trim() || undefined,
      vatRate: vatRate === '' ? null : Number(vatRate),
      requisiteId: requisiteId || null,
      orderLinks: orders.map((row, index) => ({
        packageId: row.packageId,
        amount: round2(parsedOrderAmounts[index] ?? 0),
      })),
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={initial ? 'Изменить счёт' : 'Счёт от поставщика'}
      size="md"
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Счёт увеличивает задолженность перед поставщиком — его вносит ведущий специалист. Оплату
          по счетам проводит супер-админ отдельной записью «Оплата». Разбивку по заказам оставьте
          пустой, если счёт нельзя отнести к конкретным заказам (мелкие комплектующие сразу на много
          заказов).
        </p>

        <div data-modal-form-grid="quad">
          <div data-modal-form-group>
            <label htmlFor="invoice_date">Дата счёта *</label>
            <input
              id="invoice_date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="invoice_document">№ счёта *</label>
            <input
              id="invoice_document"
              type="text"
              placeholder="№ 71 от 14 октября 2026 г."
              value={documentNo}
              onChange={(e) => setDocumentNo(e.target.value)}
              disabled={submitting}
              maxLength={200}
              required
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="invoice_amount">Сумма счёта, ₽ *</label>
            <input
              id="invoice_amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="invoice_vat">НДС *</label>
            <select
              id="invoice_vat"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              disabled={submitting}
              required
            >
              {VAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {requisites.length > 1 ? (
          <div data-modal-form-group>
            <label htmlFor="invoice_requisite">Реквизиты (юрлицо)</label>
            <select
              id="invoice_requisite"
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

        <PackageOrderSearch
          id="invoice-order-search"
          searchValue={orderSearch}
          selectedPackageId=""
          onSearchChange={setOrderSearch}
          onSelect={handleOrderSelect}
          onClear={() => setOrderSearch('')}
        />

        {orders.length > 0 ? (
          <div className={styles.orderLinkList}>
            {orders.map((row, index) => (
              <div key={row.packageId} className={styles.orderLinkRow}>
                <span className={styles.orderLinkName}>
                  {row.label}
                  {parsedOrderAmounts[index] == null ? (
                    <span className={styles.orderLinkMeta}>укажите сумму</span>
                  ) : null}
                </span>
                <input
                  type="text"
                  className={styles.orderLinkAmount}
                  inputMode="decimal"
                  placeholder="0,00"
                  aria-label={`Сумма счёта по заказу ${row.label}, ₽`}
                  value={row.amount}
                  onChange={(e) =>
                    setOrders((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, amount: e.target.value } : item
                      )
                    )
                  }
                  disabled={submitting}
                />
                <button
                  type="button"
                  className={styles.orderLinkRemove}
                  onClick={() =>
                    setOrders((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                  disabled={submitting}
                  title="Убрать заказ из разбивки"
                  aria-label={`Убрать заказ ${row.label} из разбивки`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={14}
                    height={14}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <p
              className={`${styles.orderLinkTotal}${
                remainder != null && remainder < -0.005 ? ` ${styles.orderLinkTotalOver}` : ''
              }`}
            >
              Распределено по заказам:{' '}
              {ordersSum.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽
              {remainder != null
                ? ` · не распределено: ${remainder.toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                  })} ₽`
                : ''}
            </p>
          </div>
        ) : (
          <p data-modal-form-hint>
            Заказы не прикреплены — счёт целиком уйдёт в общую задолженность без разбивки (вариант
            для мелких комплектующих).
          </p>
        )}

        <div data-modal-form-group>
          <label htmlFor="invoice_note">Примечание</label>
          <input
            id="invoice_note"
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
            disabled={submitting || !amount.trim() || !documentNo.trim() || vatRate === ''}
          >
            {submitting ? 'Сохранение…' : initial ? 'Сохранить счёт' : 'Добавить счёт'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
