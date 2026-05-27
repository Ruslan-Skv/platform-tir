'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import {
  type ContractDocumentPackagePayment,
  getContractDocumentPackagePayments,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import {
  type ContractDocumentPaymentInvoice,
  createPackagePaymentInvoice,
  listPackagePaymentInvoices,
} from '@/shared/api/admin-payment-invoices';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/AddCrmCustomerModal.module.css';
import crmDetailStyles from '@/views/admin/CRM/Customers/CrmCustomerDetailModal.module.css';

import { RepairIssueInvoicePanel } from './RepairIssueInvoicePanel';
import type { RepairDocumentTemplateTabId } from './formDataTemplateStorage';
import { getRepairContractNumberDisplayForForm } from './packageContractDisplay';
import { REPAIR_PAYMENT_INVOICE_TEMPLATE_TAB } from './repairActTwinCopiesOnOnePageHtml';
import { formatRepairIssuedInvoiceAmountRub } from './repairInvoiceNumber';
import {
  type RepairInvoiceConductDraft,
  buildRepairInvoicePrintHtml,
  downloadRepairPaymentInvoice,
  lineItemsForPaymentInvoiceReprint,
  paymentInvoiceLineItemsForApi,
  printRepairPaymentInvoice,
} from './repairInvoicePrint';
import type { RepairPackageFormData } from './repairPackageForm';
import type { RepairPaymentBasisOption } from './repairPaymentBasisOptions';
import { resolveRepairTemplateHtml } from './resolveRepairTemplateHtml';

export const REPAIR_CONTRACT_INVOICES_MODAL_TITLE = 'Счета на оплату';

export type RepairContractInvoicesModalProps = {
  packageId: string;
  form: RepairPackageFormData;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onInvoicesChanged?: () => void;
  contractTemplatePresets: ContractTemplatePreset[];
  templateOverrides: Partial<Record<RepairDocumentTemplateTabId, string>>;
  selectedTemplateIds: Partial<Record<RepairDocumentTemplateTabId, string>>;
};

export function RepairContractInvoicesModal({
  packageId,
  form,
  isOpen,
  onClose,
  onError,
  onInvoicesChanged,
  contractTemplatePresets,
  templateOverrides,
  selectedTemplateIds,
}: RepairContractInvoicesModalProps) {
  const [issuedRows, setIssuedRows] = useState<ContractDocumentPaymentInvoice[]>([]);
  const [paymentRows, setPaymentRows] = useState<ContractDocumentPackagePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const contractNumberLabel = getRepairContractNumberDisplayForForm(form);

  const resolveInvoiceTemplateHtml = useCallback((): string => {
    return resolveRepairTemplateHtml(
      REPAIR_PAYMENT_INVOICE_TEMPLATE_TAB,
      contractTemplatePresets,
      selectedTemplateIds,
      templateOverrides
    );
  }, [contractTemplatePresets, selectedTemplateIds, templateOverrides]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invoices, payments] = await Promise.all([
        listPackagePaymentInvoices(packageId),
        getContractDocumentPackagePayments(packageId).catch(
          () => [] as ContractDocumentPackagePayment[]
        ),
      ]);
      setIssuedRows(invoices);
      setPaymentRows(payments);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось загрузить счета');
      setIssuedRows([]);
      setPaymentRows([]);
    } finally {
      setLoading(false);
    }
  }, [packageId, onError]);

  useEffect(() => {
    if (!isOpen) return;
    void load();
  }, [isOpen, load]);

  const buildInvoiceHtml = async (conduct: RepairInvoiceConductDraft) => {
    const html = await buildRepairInvoicePrintHtml(form, resolveInvoiceTemplateHtml(), conduct);
    if (!html.trim()) {
      onError('Нет данных для печати счёта');
      return null;
    }
    return html;
  };

  const printConduct = async (conduct: RepairInvoiceConductDraft) => {
    const html = await buildInvoiceHtml(conduct);
    if (html) printRepairPaymentInvoice(html);
  };

  const downloadConduct = async (conduct: RepairInvoiceConductDraft) => {
    try {
      const html = await buildInvoiceHtml(conduct);
      if (html) await downloadRepairPaymentInvoice(html, conduct);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сформировать PDF');
    }
  };

  const handleIssue = async (
    conduct: RepairInvoiceConductDraft,
    option: RepairPaymentBasisOption
  ) => {
    const amountNum = Number.parseFloat(conduct.amount.replace(',', '.'));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      onError('Укажите корректную сумму счёта');
      return;
    }
    const lineItems = paymentInvoiceLineItemsForApi(conduct.lineItems);
    if (lineItems.length === 0) {
      onError('Добавьте позиции в таблицу счёта');
      return;
    }
    setSaving(true);
    try {
      await createPackagePaymentInvoice(packageId, {
        invoiceDate: conduct.invoiceDate,
        amount: amountNum,
        paymentType: option.paymentType,
        basis: conduct.paymentBasis,
        lineItems,
        ...(option.addendumNumber != null ? { addendumNumber: option.addendumNumber } : {}),
      });
      await load();
      onInvoicesChanged?.();
      await printConduct(conduct);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось выставить счёт');
    } finally {
      setSaving(false);
    }
  };

  const reprintIssued = (row: ContractDocumentPaymentInvoice) => {
    void printConduct({
      invoiceDate: row.invoiceDate,
      invoiceNumber: row.invoiceNumber,
      paymentBasis: row.basis,
      amount: formatRepairIssuedInvoiceAmountRub(Number(row.amount)),
      lineItems: lineItemsForPaymentInvoiceReprint(row),
    });
  };

  const modalTitle = (
    <span className={crmDetailStyles.titleWithEdit}>
      <span>Счета на оплату по договору</span>
      {contractNumberLabel ? (
        <span style={{ fontWeight: 400, marginLeft: 8 }}>№{contractNumberLabel}</span>
      ) : null}
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      className={crmFormStyles.modalPanel}
      showCloseButton
    >
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Нумерация счетов единая для всей организации. «Выставить счёт» сохраняет запись в{' '}
          <Link href="/admin/accounting/invoices">бухгалтерии</Link> и открывает печать. «Скачать
          PDF» — файл счёта для отправки клиенту или оплаты по QR. Оплату проводите в «Оплаты и
          этапы».
        </p>
        {loading ? <p data-modal-form-hint>Загрузка…</p> : null}
        {!loading ? (
          <RepairIssueInvoicePanel
            packageId={packageId}
            form={form}
            issuedRows={issuedRows}
            paymentRows={paymentRows}
            onError={onError}
            onIssue={handleIssue}
            onPrint={printConduct}
            onDownload={downloadConduct}
            saving={saving}
            onReprint={reprintIssued}
          />
        ) : null}
      </div>
    </Modal>
  );
}
