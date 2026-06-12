'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
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
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import crmDetailStyles from '@/views/admin/CRM/Customers/modals/CrmCustomerDetailModal.module.css';

import type { PackageDocumentTemplateTabId } from '../../form/formDataTemplateStorage';
import { getPackageContractNumberDisplayForForm } from '../../form/packageContractDisplay';
import type { PackageFormData } from '../../form/packageForm';
import { resolvePackageTemplateHtml } from '../../form/resolvePackageTemplateHtml';
import { formatPackageIssuedInvoiceAmountRub } from '../../payments/packageInvoiceNumber';
import {
  type PackageInvoiceConductDraft,
  buildPackageInvoicePrintHtml,
  downloadPackagePaymentInvoice,
  lineItemsForPaymentInvoiceReprint,
  paymentInvoiceLineItemsForApi,
  printPackagePaymentInvoice,
} from '../../payments/packageInvoicePrint';
import type { PackagePaymentBasisOption } from '../../payments/packagePaymentBasisOptions';
import { PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB } from '../../tabs/packageActPrintTabs';
import { PackageIssueInvoicePanel } from './PackageIssueInvoicePanel';

export const PACKAGE_INVOICES_MODAL_TITLE = 'Счета на оплату';

export type PackageInvoicesModalProps = {
  packageId: string;
  packageKind?: ContractDocumentPackageKind;
  form: PackageFormData;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onInvoicesChanged?: () => void;
  contractTemplatePresets: ContractTemplatePreset[];
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
};

export function PackageInvoicesModal({
  packageId,
  packageKind = 'REPAIR',
  form,
  isOpen,
  onClose,
  onError,
  onInvoicesChanged,
  contractTemplatePresets,
  templateOverrides,
  selectedTemplateIds,
}: PackageInvoicesModalProps) {
  const [issuedRows, setIssuedRows] = useState<ContractDocumentPaymentInvoice[]>([]);
  const [paymentRows, setPaymentRows] = useState<ContractDocumentPackagePayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const invoicesContentReadyRef = useRef(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoicesContentReadyRef.current = false;
    setContentReady(false);
  }, [packageId]);

  const contractNumberLabel = getPackageContractNumberDisplayForForm(form);

  const resolveInvoiceTemplateHtml = useCallback((): string => {
    return resolvePackageTemplateHtml(
      PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB,
      contractTemplatePresets,
      selectedTemplateIds,
      templateOverrides
    );
  }, [contractTemplatePresets, selectedTemplateIds, templateOverrides]);

  const load = useCallback(async () => {
    const background = invoicesContentReadyRef.current;
    if (!background) setLoading(true);
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
      invoicesContentReadyRef.current = true;
      setContentReady(true);
    }
  }, [packageId, onError]);

  useEffect(() => {
    if (!isOpen) return;
    void load();
  }, [isOpen, load]);

  const buildInvoiceHtml = async (conduct: PackageInvoiceConductDraft) => {
    const html = await buildPackageInvoicePrintHtml(form, resolveInvoiceTemplateHtml(), conduct);
    if (!html.trim()) {
      onError('Нет данных для печати счёта');
      return null;
    }
    return html;
  };

  const printConduct = async (conduct: PackageInvoiceConductDraft) => {
    const html = await buildInvoiceHtml(conduct);
    if (html) printPackagePaymentInvoice(html);
  };

  const downloadConduct = async (conduct: PackageInvoiceConductDraft) => {
    try {
      const html = await buildInvoiceHtml(conduct);
      if (html) await downloadPackagePaymentInvoice(html, conduct);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось сформировать PDF');
    }
  };

  const handleIssue = async (
    conduct: PackageInvoiceConductDraft,
    option: PackagePaymentBasisOption
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
      amount: formatPackageIssuedInvoiceAmountRub(Number(row.amount)),
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
      <div
        data-modal-form
        data-modal-density="compact"
        style={{ minHeight: 'min(60vh, 28rem)', position: 'relative' }}
        aria-busy={loading && !contentReady}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Нумерация счетов единая для всей организации. «Выставить счёт» сохраняет запись в{' '}
          <Link href="/admin/accounting/invoices">бухгалтерии</Link> и открывает печать. «Скачать
          PDF» — файл счёта для отправки клиенту или оплаты по QR. Оплату проводите в «Оплаты и
          этапы».
        </p>
        {loading && !contentReady ? (
          <p data-modal-form-hint style={{ margin: '12px 0 0' }}>
            Загрузка…
          </p>
        ) : null}
        {contentReady ? (
          <PackageIssueInvoicePanel
            packageId={packageId}
            packageKind={packageKind}
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
