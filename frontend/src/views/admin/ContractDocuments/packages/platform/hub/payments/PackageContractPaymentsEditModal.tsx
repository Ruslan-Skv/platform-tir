'use client';

import { useEffect, useState } from 'react';

import {
  type ContractDocumentPackagePayment,
  type ContractDocumentPackagePaymentForm,
  type ContractDocumentPackagePaymentPatch,
} from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';

import cdBase from '../../../../styles/base.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import { PACKAGE_PAYMENT_FORM_LABELS } from '../../payments/packagePaymentFormLabels';

export type PackageContractPaymentsEditModalProps = {
  payment: ContractDocumentPackagePayment | null;
  /** Пока PATCH летит на сервер — блокируем форму и кнопку «Сохранить». */
  saving: boolean;
  onClose: () => void;
  onSave: (patch: ContractDocumentPackagePaymentPatch) => void;
};

type EditDraft = {
  paymentDate: string;
  amount: string;
  paymentForm: ContractDocumentPackagePaymentForm;
  basis: string;
};

function draftFromPayment(payment: ContractDocumentPackagePayment): EditDraft {
  const amountNum = Number.parseFloat(payment.amount);
  return {
    paymentDate: payment.paymentDate,
    amount: Number.isFinite(amountNum) ? String(amountNum) : '',
    paymentForm: payment.paymentForm,
    basis: payment.basis ?? '',
  };
}

const EMPTY_DRAFT: EditDraft = {
  paymentDate: '',
  amount: '',
  paymentForm: 'CASH',
  basis: '',
};

export function PackageContractPaymentsEditModal({
  payment,
  saving,
  onClose,
  onSave,
}: PackageContractPaymentsEditModalProps) {
  const [draft, setDraft] = useState<EditDraft>(() =>
    payment ? draftFromPayment(payment) : EMPTY_DRAFT
  );

  // При открытии модалки на другой строке журнала — перечитываем черновик.
  useEffect(() => {
    if (payment) setDraft(draftFromPayment(payment));
  }, [payment]);

  if (!payment) {
    return (
      <Modal isOpen={false} onClose={onClose} title="Изменить проведённую оплату" showCloseButton>
        <div />
      </Modal>
    );
  }

  // Запятая допустима как десятичный разделитель при вводе суммы.
  const parsedAmount = Number.parseFloat(draft.amount.trim().replace(',', '.'));
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const formComplete = draft.paymentDate.trim() !== '' && amountValid;

  const isRefund = payment.paymentType === 'REFUND';
  const recordedByName = payment.recordedBy
    ? [payment.recordedBy.firstName, payment.recordedBy.lastName].filter(Boolean).join(' ') ||
      payment.recordedBy.email
    : null;

  const handleSave = () => {
    if (!formComplete || saving) return;
    onSave({
      paymentDate: draft.paymentDate,
      amount: Math.round(parsedAmount * 100) / 100,
      paymentForm: draft.paymentForm,
      basis: draft.basis.trim() ? draft.basis.trim() : null,
    });
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Изменить проведённую оплату"
      size="md"
      showCloseButton
    >
      <div className={cdBase.paymentsEditModal}>
        <p className={cdProduct.hint}>
          {isRefund ? 'Запись возврата. ' : ''}
          Менять проведённые оплаты может только супер-админ — для исправления ошибок. После
          сохранения оплаченная сумма и покрытие оснований пересчитаются автоматически.
          {isRefund
            ? ' Сумма возврата хранится положительной, в журнале показывается со знаком минус.'
            : ''}
        </p>
        {recordedByName ? <p className={cdProduct.hint}>Внёс запись: {recordedByName}</p> : null}
        <div className={cdBase.paymentsFormGrid}>
          <div className={cdBase.field}>
            <label htmlFor="pay_edit_date">Дата оплаты</label>
            <input
              id="pay_edit_date"
              type="date"
              value={draft.paymentDate}
              disabled={saving}
              onChange={(e) => setDraft((d) => ({ ...d, paymentDate: e.target.value }))}
            />
          </div>
          <div className={`${cdBase.field} ${cdBase.paymentsAmountField}`}>
            <label htmlFor="pay_edit_amount">Сумма, ₽</label>
            <input
              id="pay_edit_amount"
              inputMode="decimal"
              value={draft.amount}
              disabled={saving}
              placeholder="Напр. 175000 или 175000,50"
              autoComplete="off"
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
            />
            {draft.amount.trim() !== '' && !amountValid ? (
              <p className={cdBase.paymentsEditModalFieldError}>Укажите число больше нуля</p>
            ) : null}
          </div>
          <div className={cdBase.field}>
            <label htmlFor="pay_edit_form">Способ оплаты</label>
            <select
              id="pay_edit_form"
              value={draft.paymentForm}
              disabled={saving}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  paymentForm: e.target.value as ContractDocumentPackagePaymentForm,
                }))
              }
            >
              {Object.entries(PACKAGE_PAYMENT_FORM_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={`${cdBase.field} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor="pay_edit_basis">Основание</label>
            <input
              id="pay_edit_basis"
              type="text"
              value={draft.basis}
              disabled={saving}
              placeholder="Напр. Предоплата по договору"
              onChange={(e) => setDraft((d) => ({ ...d, basis: e.target.value }))}
            />
          </div>
        </div>
        <div className={cdBase.paymentsFormActions}>
          <button
            data-admin-mutation
            type="button"
            className={cdWorkspace.primaryBtn}
            disabled={saving || !formComplete}
            onClick={handleSave}
          >
            {saving ? 'Сохранение…' : 'Сохранить изменения'}
          </button>
          <button
            type="button"
            className={cdWorkspace.secondaryBtn}
            disabled={saving}
            onClick={onClose}
          >
            Отмена
          </button>
        </div>
      </div>
    </Modal>
  );
}
