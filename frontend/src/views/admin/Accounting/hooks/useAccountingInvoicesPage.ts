'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import {
  type ContractDocumentPackage,
  getContractDocumentExecutorProfiles,
  getContractDocumentPackage,
  getContractDocumentPackagePayments,
  getContractDocumentPackages,
  getContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import {
  type ContractDocumentPaymentInvoice,
  cancelPackagePaymentInvoiceEp,
  createPackagePaymentInvoice,
  deletePackagePaymentInvoice,
  getPaymentInvoiceTrashCount,
  listAllPaymentInvoices,
  listPackagePaymentInvoices,
  signPackagePaymentInvoiceEp,
} from '@/shared/api/admin-payment-invoices';
import { mergeFormDataFromStorage } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import type { PackageDocumentTemplateTabId } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import { getPackageContractNumberDisplayForForm } from '@/views/admin/ContractDocuments/packages/platform/form/packageContractDisplay';
import { formWithExecutorProfileSync } from '@/views/admin/ContractDocuments/packages/platform/form/packageEditorProfileFields';
import { resolvePackageTemplateHtml } from '@/views/admin/ContractDocuments/packages/platform/form/resolvePackageTemplateHtml';
import {
  type PackageInvoiceConductDraft,
  buildPackageInvoicePrintHtml,
  downloadPackagePaymentInvoice,
  paymentInvoiceLineItemsForApi,
  printPackagePaymentInvoice,
} from '@/views/admin/ContractDocuments/packages/platform/payments/packageInvoicePrint';
import { packagePaymentBasisOptionByKey } from '@/views/admin/ContractDocuments/packages/platform/payments/packagePaymentBasisOptions';
import {
  buildPackageInvoiceSharePdfFile,
  downloadInvoicePdfFile,
  loadPackageInvoiceShareContext,
  printInvoicePdfFile,
} from '@/views/admin/ContractDocuments/packages/platform/share/packageInvoiceShare';
import { packageContractorStampInfo } from '@/views/admin/ContractDocuments/packages/platform/share/remoteSigningContractor';
import { PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageActPrintTabs';

import { currentMonthStartIso, todayIso } from '../Bank/bank-page.constants';

/** Опции количества строк на странице счетов (как в Кассе/ДП). */
export const INVOICES_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type InvoicesPageLimit = (typeof INVOICES_PAGE_LIMIT_OPTIONS)[number];

const DEFAULT_LIMIT: InvoicesPageLimit = 20;
const FILTERS_STORAGE_KEY = 'admin_accounting_invoices_filters_v1';

type InvoicesPersistedFilters = {
  dateFrom: string;
  dateTo: string;
  limit: InvoicesPageLimit;
  filtersCollapsed: boolean;
};

function readPersistedFilters(): Partial<InvoicesPersistedFilters> | null {
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InvoicesPersistedFilters>;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function writePersistedFilters(filters: InvoicesPersistedFilters): void {
  try {
    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* localStorage недоступен — настройки просто не сохранятся */
  }
}

function isInvoicesPageLimit(value: unknown): value is InvoicesPageLimit {
  return (
    typeof value === 'number' && (INVOICES_PAGE_LIMIT_OPTIONS as readonly number[]).includes(value)
  );
}

/** Локальная дата в ISO (YYYY-MM-DD) без сдвига тайзоны. */
function toLocalIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function useAccountingInvoicesPage() {
  const { canEdit } = useAdminSectionCanEdit();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [rows, setRows] = useState<ContractDocumentPaymentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState<InvoicesPageLimit>(DEFAULT_LIMIT);
  const [dateFrom, setDateFrom] = useState(currentMonthStartIso());
  const [dateTo, setDateTo] = useState('');
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
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
  const [deleteTarget, setDeleteTarget] = useState<ContractDocumentPaymentInvoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  // Дебаунс поиска: список перезагружается после паузы в наборе.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 380);
    return () => window.clearTimeout(t);
  }, [search]);

  // Восстановление сохранённых настроек фильтров после монтирования (SSR-безопасно).
  useEffect(() => {
    const persisted = readPersistedFilters();
    if (!persisted) return;
    if (typeof persisted.dateFrom === 'string') setDateFrom(persisted.dateFrom);
    if (typeof persisted.dateTo === 'string') setDateTo(persisted.dateTo);
    if (isInvoicesPageLimit(persisted.limit)) setLimitState(persisted.limit);
    if (typeof persisted.filtersCollapsed === 'boolean') {
      setFiltersCollapsed(persisted.filtersCollapsed);
    }
  }, []);

  // Сохранение настроек фильтров при изменении.
  useEffect(() => {
    writePersistedFilters({ dateFrom, dateTo, limit, filtersCollapsed });
  }, [dateFrom, dateTo, limit, filtersCollapsed]);

  const toggleFiltersCollapsed = useCallback(() => {
    setFiltersCollapsed((prev) => !prev);
  }, []);

  const setLimit = useCallback((value: InvoicesPageLimit) => {
    setLimitState(value);
    setPage(1);
  }, []);

  /** Быстрый период: сегодня / неделя (7 дней) / текущий месяц. */
  const setPeriod = useCallback((kind: 'today' | 'week' | 'month') => {
    const today = todayIso();
    if (kind === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (kind === 'week') {
      const to = new Date(`${today}T00:00:00`);
      to.setDate(to.getDate() + 6);
      setDateFrom(today);
      setDateTo(toLocalIsoDate(to));
    } else {
      setDateFrom(currentMonthStartIso());
      setDateTo('');
    }
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setDateFrom(currentMonthStartIso());
    setDateTo('');
    setPage(1);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAllPaymentInvoices({
        search: debouncedSearch || undefined,
        limit: 1000,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(res.items);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить счета');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshTrashCount = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await getPaymentInvoiceTrashCount();
      setTrashCount(res.count ?? 0);
    } catch {
      // Бейдж корзины не критичен — молча оставляем прошлое значение.
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void refreshTrashCount();
  }, [refreshTrashCount, trashOpen]);

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
      const [row, presetsRes, invoices, payments, profilesRes] = await Promise.all([
        getContractDocumentPackage(packageId),
        getContractDocumentTemplatePresets('REPAIR'),
        listPackagePaymentInvoices(packageId),
        getContractDocumentPackagePayments(packageId).catch(() => []),
        // Реквизиты исполнителя синхронизируем со справочником (дефолтный вариант банка).
        getContractDocumentExecutorProfiles('REPAIR').catch(() => ({ items: [] })),
      ]);
      const merged = mergeFormDataFromStorage(row.formData);
      setIssuePackageForm(
        formWithExecutorProfileSync(merged.form, profilesRes.items ?? [], row.status)
      );
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
    // packageId не сбрасываем: во время анимации закрытия модалка ещё видна.
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
    // Счёт — документ на оплату; для возврата денег клиенту счёт не выставляется.
    if (option.paymentType === 'REFUND') {
      setError('Для возврата денежных средств счёт не выставляется');
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

  /** Удаление счёта в корзину — только супер-админ, после подтверждения в модалке. */
  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePackagePaymentInvoice(deleteTarget.packageId, deleteTarget.id);
      setDeleteTarget(null);
      await load();
      await refreshTrashCount();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить счёт');
    } finally {
      setDeleting(false);
    }
  };

  /**
   * PDF счёта из списка бухгалтерии: подписанная копия со штампом ЭП (если счёт
   * подписан) или сборка из шаблона пакета (как в модалке счетов договора).
   */
  const buildRowPdfFile = async (invoice: ContractDocumentPaymentInvoice) => {
    const ctx = await loadPackageInvoiceShareContext(invoice);
    return buildPackageInvoiceSharePdfFile(ctx);
  };

  const handlePrintRow = async (invoice: ContractDocumentPaymentInvoice) => {
    setRowBusyId(invoice.id);
    try {
      const file = await buildRowPdfFile(invoice);
      printInvoicePdfFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось напечатать счёт');
    } finally {
      setRowBusyId(null);
    }
  };

  const handleDownloadRow = async (invoice: ContractDocumentPaymentInvoice) => {
    setRowBusyId(invoice.id);
    try {
      const file = await buildRowPdfFile(invoice);
      downloadInvoicePdfFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сформировать PDF');
    } finally {
      setRowBusyId(null);
    }
  };

  /** Иконка ЭП — переключатель: неподписанный счёт подписывает, подписанный — отменяет ЭП. */
  const handleToggleEpRow = async (invoice: ContractDocumentPaymentInvoice) => {
    setRowBusyId(invoice.id);
    try {
      if (invoice.signedAt) {
        await cancelPackagePaymentInvoiceEp(invoice.packageId, invoice.id);
      } else {
        const ctx = await loadPackageInvoiceShareContext(invoice);
        const file = await buildPackageInvoiceSharePdfFile(ctx);
        await signPackagePaymentInvoiceEp(invoice.packageId, invoice.id, {
          file,
          fileName: file.name,
          ...packageContractorStampInfo(ctx.form),
        });
      }
      await load();
      await refreshTrashCount();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить подпись ЭП счёта');
    } finally {
      setRowBusyId(null);
    }
  };

  return {
    rows,
    loading,
    error,
    setError,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    setPeriod,
    resetFilters,
    filtersCollapsed,
    toggleFiltersCollapsed,
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
    rowBusyId,
    handlePrintRow,
    handleDownloadRow,
    handleToggleEpRow,
    isSuperAdmin,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDeleteInvoice,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    canEdit,
  };
}

export type AccountingInvoicesPageModel = ReturnType<typeof useAccountingInvoicesPage>;
