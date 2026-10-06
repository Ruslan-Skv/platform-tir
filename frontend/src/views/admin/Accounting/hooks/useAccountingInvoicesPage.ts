'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import {
  type ContractDocumentPaymentInvoice,
  cancelPackagePaymentInvoiceEp,
  deletePackagePaymentInvoice,
  getPaymentInvoiceTrashCount,
  listAllPaymentInvoices,
  signPackagePaymentInvoiceEp,
} from '@/shared/api/admin-payment-invoices';
import {
  buildPackageInvoiceSharePdfFile,
  downloadInvoicePdfFile,
  loadPackageInvoiceShareContext,
  printInvoicePdfFile,
} from '@/views/admin/ContractDocuments/packages/platform/share/packageInvoiceShare';
import { packageContractorStampInfo } from '@/views/admin/ContractDocuments/packages/platform/share/remoteSigningContractor';

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
  const [issueChoiceOpen, setIssueChoiceOpen] = useState(false);
  const [freeIssueOpen, setFreeIssueOpen] = useState(false);
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

  /** «+ Выставить счёт»: сначала выбор сценария — по договору из базы или без договора. */
  const openIssueModal = () => {
    if (!canEdit) return;
    setIssueChoiceOpen(true);
  };

  /** Сценарий 1: счёт по договору из базы — заказ ищется панелью «Поиск заказа». */
  const openContractIssue = () => {
    setIssueOpen(true);
  };

  /** Выбор из модалки сценариев выставления счёта. */
  const pickIssueChoice = (choice: 'contract' | 'free') => {
    setIssueChoiceOpen(false);
    if (choice === 'contract') void openContractIssue();
    else setFreeIssueOpen(true);
  };
  const closeIssueModal = () => {
    setIssueOpen(false);
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

  /** Выбор договора в поиске: открываем ту же модалку счетов, что и из договора. */
  const pickIssuePackage = (packageId: string) => {
    setIssueOpen(false);
    openContractInvoices(packageId);
  };

  const openShareInvoice = (invoice: ContractDocumentPaymentInvoice) => {
    setShareInvoice(invoice);
  };

  const closeShareInvoice = () => {
    setShareInvoice(null);
  };

  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePackagePaymentInvoice(deleteTarget.id);
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
        await cancelPackagePaymentInvoiceEp(invoice.id);
      } else {
        const ctx = await loadPackageInvoiceShareContext(invoice);
        const file = await buildPackageInvoiceSharePdfFile(ctx);
        await signPackagePaymentInvoiceEp(invoice.id, {
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
    contractEditorOpen,
    contractEditorPackageId,
    load,
    openIssueModal,
    pickIssueChoice,
    issueChoiceOpen,
    setIssueChoiceOpen,
    freeIssueOpen,
    setFreeIssueOpen,
    closeIssueModal,
    pickIssuePackage,
    openContractInvoices,
    closeContractInvoices,
    shareInvoice,
    openShareInvoice,
    closeShareInvoice,
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
