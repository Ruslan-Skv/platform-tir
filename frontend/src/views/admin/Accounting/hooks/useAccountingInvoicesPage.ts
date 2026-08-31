'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import {
  type ContractDocumentPackage,
  getContractDocumentPackage,
  getContractDocumentPackagePayments,
  getContractDocumentPackages,
  getContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import {
  type ContractDocumentPaymentInvoice,
  createPackagePaymentInvoice,
  listAllPaymentInvoices,
  listPackagePaymentInvoices,
} from '@/shared/api/admin-payment-invoices';
import { mergeFormDataFromStorage } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import type { PackageDocumentTemplateTabId } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import { getPackageContractNumberDisplayForForm } from '@/views/admin/ContractDocuments/packages/platform/form/packageContractDisplay';
import { resolvePackageTemplateHtml } from '@/views/admin/ContractDocuments/packages/platform/form/resolvePackageTemplateHtml';
import {
  type PackageInvoiceConductDraft,
  buildPackageInvoicePrintHtml,
  downloadPackagePaymentInvoice,
  paymentInvoiceLineItemsForApi,
  printPackagePaymentInvoice,
} from '@/views/admin/ContractDocuments/packages/platform/payments/packageInvoicePrint';
import { packagePaymentBasisOptionByKey } from '@/views/admin/ContractDocuments/packages/platform/payments/packagePaymentBasisOptions';
import { PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageActPrintTabs';

export function useAccountingInvoicesPage() {
  const { canEdit } = useAdminSectionCanEdit();
  const [rows, setRows] = useState<ContractDocumentPaymentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [packages, setPackages] = useState<ContractDocumentPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [issuePackageForm, setIssuePackageForm] = useState(() => mergeFormDataFromStorage({}).form);
  const [issueTemplatePresets, setIssueTemplatePresets] = useState<ContractTemplatePreset[]>([]);
  const [issueTemplateOverrides, setIssueTemplateOverrides] = useState<
    Partial<Record<PackageDocumentTemplateTabId, string>>
  >({});
  const [issueSelectedTemplateIds, setIssueSelectedTemplateIds] = useState<
    Partial<Record<PackageDocumentTemplateTabId, string>>
  >({});
  const [issuePackageInvoices, setIssuePackageInvoices] = useState<
    ContractDocumentPaymentInvoice[]
  >([]);
  const [issuePaymentRows, setIssuePaymentRows] = useState<
    Awaited<ReturnType<typeof getContractDocumentPackagePayments>>
  >([]);
  const [issueSaving, setIssueSaving] = useState(false);
  const [contractEditorOpen, setContractEditorOpen] = useState(false);
  const [contractEditorPackageId, setContractEditorPackageId] = useState('');
  const [shareInvoice, setShareInvoice] = useState<ContractDocumentPaymentInvoice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAllPaymentInvoices({ search: search.trim() || undefined, limit: 1000 });
      setRows(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить счета');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const packageOptions = useMemo(() => {
    return packages
      .filter((p) => p.kind === 'REPAIR')
      .map((p) => {
        const { form } = mergeFormDataFromStorage(p.formData);
        const label = `${getPackageContractNumberDisplayForForm(form)}${form.customer.fullName ? ` — ${form.customer.fullName}` : ''}`;
        return { id: p.id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [packages]);

  const loadSelectedPackageForIssue = useCallback(async (packageId: string) => {
    if (!packageId) return;
    try {
      const [row, presetsRes, invoices, payments] = await Promise.all([
        getContractDocumentPackage(packageId),
        getContractDocumentTemplatePresets('REPAIR'),
        listPackagePaymentInvoices(packageId),
        getContractDocumentPackagePayments(packageId).catch(() => []),
      ]);
      const merged = mergeFormDataFromStorage(row.formData);
      setIssuePackageForm(merged.form);
      setIssueTemplateOverrides(merged.templateOverrides);
      setIssueSelectedTemplateIds(merged.templatePresetIds);
      setIssueTemplatePresets(presetsRes.items ?? []);
      setIssuePackageInvoices(invoices);
      setIssuePaymentRows(payments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить договор');
    }
  }, []);

  const resolveIssueTemplateHtml = useCallback(
    () =>
      resolvePackageTemplateHtml(
        PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB,
        issueTemplatePresets,
        issueSelectedTemplateIds,
        issueTemplateOverrides
      ),
    [issueTemplatePresets, issueSelectedTemplateIds, issueTemplateOverrides]
  );

  useEffect(() => {
    if (!issueOpen || !selectedPackageId) return;
    void loadSelectedPackageForIssue(selectedPackageId);
  }, [issueOpen, selectedPackageId, loadSelectedPackageForIssue]);

  const openIssueModal = async () => {
    if (!canEdit) return;
    setIssueOpen(true);
    setPackagesLoading(true);
    try {
      const list = await getContractDocumentPackages('REPAIR');
      setPackages(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить договоры');
    } finally {
      setPackagesLoading(false);
    }
  };

  const closeIssueModal = () => {
    setIssueOpen(false);
    setSelectedPackageId('');
  };

  const openContractInvoices = (packageId: string) => {
    setContractEditorPackageId(packageId);
    setContractEditorOpen(true);
  };

  const closeContractInvoices = () => {
    setContractEditorOpen(false);
    setContractEditorPackageId('');
    void load();
  };

  const openShareInvoice = (invoice: ContractDocumentPaymentInvoice) => {
    setShareInvoice(invoice);
  };

  const closeShareInvoice = () => {
    setShareInvoice(null);
  };

  const handleIssueInvoice = async (
    conduct: PackageInvoiceConductDraft,
    option: NonNullable<ReturnType<typeof packagePaymentBasisOptionByKey>>
  ) => {
    if (!canEdit) return;
    const amountNum = Number.parseFloat(conduct.amount.replace(',', '.'));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Укажите корректную сумму счёта');
      return;
    }
    const lineItems = paymentInvoiceLineItemsForApi(conduct.lineItems);
    if (lineItems.length === 0) {
      setError('Добавьте позиции в таблицу счёта');
      return;
    }
    setIssueSaving(true);
    try {
      await createPackagePaymentInvoice(selectedPackageId, {
        invoiceDate: conduct.invoiceDate,
        amount: amountNum,
        paymentType: option.paymentType,
        basis: conduct.paymentBasis,
        lineItems,
        ...(option.addendumNumber != null ? { addendumNumber: option.addendumNumber } : {}),
      });
      const html = await buildPackageInvoicePrintHtml(
        issuePackageForm,
        resolveIssueTemplateHtml(),
        conduct
      );
      if (html.trim()) printPackagePaymentInvoice(html);
      await load();
      await loadSelectedPackageForIssue(selectedPackageId);
      closeIssueModal();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выставить счёт');
    } finally {
      setIssueSaving(false);
    }
  };

  const handlePrintInvoice = (conduct: PackageInvoiceConductDraft) => {
    void (async () => {
      const html = await buildPackageInvoicePrintHtml(
        issuePackageForm,
        resolveIssueTemplateHtml(),
        conduct
      );
      if (!html.trim()) {
        setError('Нет данных для печати счёта');
        return;
      }
      printPackagePaymentInvoice(html);
    })();
  };

  const handleDownloadInvoice = (conduct: PackageInvoiceConductDraft) => {
    void (async () => {
      try {
        const html = await buildPackageInvoicePrintHtml(
          issuePackageForm,
          resolveIssueTemplateHtml(),
          conduct
        );
        if (!html.trim()) {
          setError('Нет данных для скачивания счёта');
          return;
        }
        await downloadPackagePaymentInvoice(html, conduct);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сформировать PDF');
      }
    })();
  };

  return {
    rows,
    loading,
    error,
    setError,
    search,
    setSearch,
    issueOpen,
    packagesLoading,
    selectedPackageId,
    setSelectedPackageId,
    issuePackageForm,
    issuePackageInvoices,
    issuePaymentRows,
    issueSaving,
    contractEditorOpen,
    contractEditorPackageId,
    packageOptions,
    load,
    openIssueModal,
    closeIssueModal,
    openContractInvoices,
    closeContractInvoices,
    shareInvoice,
    openShareInvoice,
    closeShareInvoice,
    handleIssueInvoice,
    handlePrintInvoice,
    handleDownloadInvoice,
    canEdit,
  };
}

export type AccountingInvoicesPageModel = ReturnType<typeof useAccountingInvoicesPage>;
