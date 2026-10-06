'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import {
  type ContractDocumentPackagePayment,
  getContractDocumentPackagePayments,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import {
  type ContractDocumentPaymentInvoice,
  cancelPackagePaymentInvoiceEp,
  createPackagePaymentInvoice,
  listPackagePaymentInvoices,
  signPackagePaymentInvoiceEp,
} from '@/shared/api/admin-payment-invoices';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import crmDetailStyles from '@/views/admin/CRM/Customers/modals/CrmCustomerDetailModal.module.css';
import { buildDocumentPdfBlob } from '@/views/admin/ContractDocuments/core/printDocument';

import type { PackageDocumentTemplateTabId } from '../../form/formDataTemplateStorage';
import { getPackageContractNumberDisplayForForm } from '../../form/packageContractDisplay';
import type { PackageFormData } from '../../form/packageForm';
import { resolvePackageTemplateHtml } from '../../form/resolvePackageTemplateHtml';
import {
  type PackageInvoiceConductDraft,
  buildPackageInvoicePrintHtml,
  buildPackagePaymentInvoiceDownloadFileName,
  downloadPackagePaymentInvoice,
  paymentInvoiceLineItemsForApi,
  printPackagePaymentInvoice,
} from '../../payments/packageInvoicePrint';
import type { PackagePaymentBasisOption } from '../../payments/packagePaymentBasisOptions';
import {
  type PackageInvoiceShareLiveInput,
  PackageInvoiceShareModal,
} from '../../share/PackageInvoiceShareModal';
import {
  downloadInvoicePdfFile,
  fetchPackageInvoiceSignedPdfFile,
  invoiceRowToConductDraft,
  printInvoicePdfFile,
} from '../../share/packageInvoiceShare';
import { packageContractorStampInfo } from '../../share/remoteSigningContractor';
import { PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB } from '../../tabs/packageActPrintTabs';
import { PackageIssueInvoicePanel } from './PackageIssueInvoicePanel';

export const PACKAGE_INVOICES_MODAL_TITLE = 'Счета на оплату';

export type PackageInvoicesModalProps = {
  packageId: string;
  packageKind?: ContractDocumentPackageKind;
  form: PackageFormData;
  isOpen: boolean;
  /** Данные пакета ещё грузятся (модалка открыта сразу, чтобы анимация успела отыграться). */
  preparing?: boolean;
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
  preparing = false,
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
  const [signEpBusy, setSignEpBusy] = useState(false);
  const [shareInvoice, setShareInvoice] = useState<ContractDocumentPaymentInvoice | null>(null);

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
    // Счёт — документ на оплату; для возврата денег клиенту счёт не выставляется.
    if (option.paymentType === 'REFUND') {
      onError('Для возврата денежных средств счёт не выставляется');
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
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось выставить счёт');
    } finally {
      setSaving(false);
    }
  };

  const reprintIssued = (row: ContractDocumentPaymentInvoice) => {
    void (async () => {
      try {
        // Подписанный счёт печатаем копией со штампом ПЭП Подрядчика.
        if (row.signedFileUrl) {
          const signed = await fetchPackageInvoiceSignedPdfFile(row);
          if (signed) printInvoicePdfFile(signed);
          return;
        }
        await printConduct(invoiceRowToConductDraft(row));
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Не удалось напечатать счёт');
      }
    })();
  };

  const downloadIssued = (row: ContractDocumentPaymentInvoice) => {
    void (async () => {
      try {
        // Подписанный счёт скачиваем копией со штампом ПЭП Подрядчика.
        if (row.signedFileUrl) {
          const signed = await fetchPackageInvoiceSignedPdfFile(row);
          if (signed) downloadInvoicePdfFile(signed);
          return;
        }
        await downloadConduct(invoiceRowToConductDraft(row));
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Не удалось сформировать PDF');
      }
    })();
  };

  /** Подписать выставленный счёт ПЭП со стороны Подрядчика (Заказчик не подписывает):
   *  PDF счёта уходит на сервер, там ставится штамп ПЭП и сохраняется подписанная копия. */
  const signEpIssued = async (row: ContractDocumentPaymentInvoice) => {
    const conduct = invoiceRowToConductDraft(row);
    const html = await buildInvoiceHtml(conduct);
    if (!html) return;
    const { blob, fileName } = await buildDocumentPdfBlob(
      html,
      'Счёт на оплату',
      buildPackagePaymentInvoiceDownloadFileName(conduct)
    );
    await signPackagePaymentInvoiceEp(packageId, row.id, {
      file: blob,
      fileName,
      ...packageContractorStampInfo(form),
    });
  };

  /** Иконка ЭП — переключатель: неподписанный счёт подписывает, подписанный — отменяет ЭП. */
  const toggleEpIssued = async (row: ContractDocumentPaymentInvoice) => {
    setSignEpBusy(true);
    try {
      if (row.signedAt) {
        await cancelPackagePaymentInvoiceEp(packageId, row.id);
      } else {
        await signEpIssued(row);
      }
      await load();
      onInvoicesChanged?.();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось изменить подпись ЭП счёта');
    } finally {
      setSignEpBusy(false);
    }
  };

  /** Черновик счёта из формы — как запись счёта, для модалки отправки заказчику. */
  const shareDraft = (conduct: PackageInvoiceConductDraft) => {
    const amountNum = Number.parseFloat(conduct.amount.replace(/\s+/g, '').replace(',', '.'));
    const row: ContractDocumentPaymentInvoice = {
      id: `draft-${conduct.invoiceNumber}`,
      packageId,
      sequenceNumber: 0,
      invoiceNumber: conduct.invoiceNumber,
      invoiceDate: conduct.invoiceDate,
      amount: String(Number.isFinite(amountNum) ? amountNum : 0),
      paymentType: 'PREPAYMENT',
      addendumNumber: null,
      basis: conduct.paymentBasis,
      lineItems: paymentInvoiceLineItemsForApi(conduct.lineItems),
      legacyFormId: null,
      createdAt: '',
      updatedAt: '',
      issuedById: null,
      issuedBy: null,
      signedAt: null,
      signedById: null,
      signedBy: null,
      signedFileUrl: null,
      signedSha256: null,
      packageTitle: null,
      packageKind,
      contractNumber: contractNumberLabel,
      customerName: form.customer.fullName ?? '',
    };
    setShareInvoice(row);
  };

  const shareLiveInput: PackageInvoiceShareLiveInput = {
    packageId,
    packageKind,
    form,
    contractTemplatePresets,
    templateOverrides,
    selectedTemplateIds,
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        size="lg"
        className={crmFormStyles.modalPanel}
        showCloseButton
        compactOnMobile
      >
        <div
          data-modal-form
          data-modal-density="compact"
          style={{ minHeight: 'min(60vh, 28rem)', position: 'relative' }}
          aria-busy={preparing || (loading && !contentReady)}
        >
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Нумерация счетов единая для всей организации. «Выставить счёт» сохраняет запись в
            бухгалтерии. Печать, PDF, отправку заказчику и подписание счёта ЭП со стороны Подрядчика
            выполняйте в таблице выставленных счетов ниже. Оплату проводите в «Оплаты и этапы».
          </p>
          {preparing || (loading && !contentReady) ? (
            <p data-modal-form-hint style={{ margin: '12px 0 0' }}>
              Загрузка…
            </p>
          ) : null}
          {!preparing && contentReady ? (
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
              onShare={setShareInvoice}
              onShareDraft={shareDraft}
              onToggleEp={toggleEpIssued}
              signEpBusy={signEpBusy}
              onDownloadRow={downloadIssued}
            />
          ) : null}
        </div>
      </Modal>

      <PackageInvoiceShareModal
        isOpen={shareInvoice != null}
        onClose={() => setShareInvoice(null)}
        invoice={shareInvoice}
        liveInput={shareLiveInput}
      />
    </>
  );
}
