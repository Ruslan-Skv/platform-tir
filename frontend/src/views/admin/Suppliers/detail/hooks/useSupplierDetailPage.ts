'use client';

import { useCallback, useEffect, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  type AdminSupplier,
  type AdminSupplierLedgerEntry,
  type AdminSupplierRequisite,
  type AdminSupplierStats,
  type SaveSupplierLedgerEntryParams,
  type SaveSupplierParams,
  type SaveSupplierRequisiteParams,
  createSupplierLedgerEntry,
  createSupplierRequisite,
  deleteSupplier,
  deleteSupplierLedgerEntry,
  deleteSupplierRequisite,
  getSupplierDetail,
  getSupplierLedger,
  updateSupplier,
  updateSupplierLedgerEntry,
  updateSupplierRequisite,
} from '@/shared/api/admin-suppliers';

const LEDGER_LIMIT = 50;
const DETAIL_TAB_STORAGE_KEY = 'admin_supplier_detail_tab_v1';

export type SupplierDetailTab = 'ledger' | 'requisites';

/** Какая модалка записи ведомости открыта: счёт или оплата. */
export type EntryModalKind = 'invoice' | 'payment' | null;

export type SupplierDetailPageModel = {
  supplier: AdminSupplier | null;
  requisites: AdminSupplierRequisite[];
  stats: AdminSupplierStats | null;
  productsCount: number;
  loading: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  load: () => Promise<void>;
  loadAll: () => Promise<void>;

  // Ведомость
  entries: AdminSupplierLedgerEntry[];
  ledgerTotal: number;
  ledgerPage: number;
  setLedgerPage: (value: number) => void;
  ledgerAmountSum: number;
  ledgerPaymentSum: number;
  ledgerBalance: number | null;
  ledgerLoading: boolean;
  ledgerSearch: string;
  setLedgerSearch: (value: string) => void;
  resetLedgerFilters: () => void;
  tab: SupplierDetailTab;
  setTab: (value: SupplierDetailTab) => void;

  // Модалки
  entryModalKind: EntryModalKind;
  editingEntry: AdminSupplierLedgerEntry | null;
  openCreateInvoiceModal: () => void;
  openCreatePaymentModal: () => void;
  openEditEntryModal: (entry: AdminSupplierLedgerEntry) => void;
  closeEntryModal: () => void;
  entrySubmitting: boolean;
  handleSaveEntry: (params: SaveSupplierLedgerEntryParams) => Promise<void>;

  deleteEntryId: string | null;
  askDeleteEntry: (entryId: string) => void;
  cancelDeleteEntry: () => void;
  deletingEntry: boolean;
  handleDeleteEntry: () => Promise<void>;

  requisiteModalOpen: boolean;
  editingRequisite: AdminSupplierRequisite | null;
  openCreateRequisiteModal: () => void;
  openEditRequisiteModal: (requisite: AdminSupplierRequisite) => void;
  closeRequisiteModal: () => void;
  requisiteSubmitting: boolean;
  handleSaveRequisite: (params: SaveSupplierRequisiteParams) => Promise<void>;

  deleteRequisiteId: string | null;
  askDeleteRequisite: (requisiteId: string) => void;
  cancelDeleteRequisite: () => void;
  deletingRequisite: boolean;
  handleDeleteRequisite: () => Promise<void>;

  supplierModalOpen: boolean;
  openSupplierModal: () => void;
  closeSupplierModal: () => void;
  supplierSubmitting: boolean;
  handleSaveSupplier: (params: SaveSupplierParams) => Promise<void>;

  deleteSupplierConfirm: boolean;
  askDeleteSupplier: () => void;
  cancelDeleteSupplier: () => void;
  deletingSupplier: boolean;
  handleDeleteSupplier: () => Promise<void>;

  canEdit: boolean;
  /** Оплаты по счетам проводит только супер-админ (счета — ведущие специалисты). */
  canManagePayments: boolean;
};

/** Карточка поставщика: баланс, ведомость счетов/оплат и блоки банковских реквизитов. */
export function useSupplierDetailPage(): SupplierDetailPageModel {
  const router = useRouter();
  const routeParams = useParams();
  const supplierId = (routeParams.id as string) ?? '';
  const { canEdit } = useAdminSectionCanEdit();
  const { user } = useAuth();
  const canManagePayments = user?.role === 'SUPER_ADMIN';

  const [supplier, setSupplier] = useState<AdminSupplier | null>(null);
  const [requisites, setRequisites] = useState<AdminSupplierRequisite[]>([]);
  const [stats, setStats] = useState<AdminSupplierStats | null>(null);
  const [productsCount, setProductsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entries, setEntries] = useState<AdminSupplierLedgerEntry[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPageState] = useState(1);
  const [ledgerAmountSum, setLedgerAmountSum] = useState(0);
  const [ledgerPaymentSum, setLedgerPaymentSum] = useState(0);
  const [ledgerBalance, setLedgerBalance] = useState<number | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerSearch, setLedgerSearchState] = useState('');
  const [debouncedLedgerSearch, setDebouncedLedgerSearch] = useState('');
  const [tab, setTabState] = useState<SupplierDetailTab>('ledger');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedLedgerSearch(ledgerSearch.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [ledgerSearch]);

  // Активная вкладка сохраняется между визитами.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DETAIL_TAB_STORAGE_KEY);
      if (saved === 'ledger' || saved === 'requisites') setTabState(saved);
    } catch {
      /* localStorage недоступен — вкладка просто начнётся с ведомости */
    }
  }, []);

  const setTab = useCallback((value: SupplierDetailTab) => {
    setTabState(value);
    try {
      window.localStorage.setItem(DETAIL_TAB_STORAGE_KEY, value);
    } catch {
      /* не критично */
    }
  }, []);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSupplierDetail(supplierId);
      setSupplier(res.supplier);
      setRequisites(res.requisites);
      setStats(res.stats);
      setProductsCount(res.productsCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить поставщика');
      setSupplier(null);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    try {
      const res = await getSupplierLedger(supplierId, {
        search: debouncedLedgerSearch || undefined,
        page: ledgerPage,
        limit: LEDGER_LIMIT,
      });
      setEntries(res.data);
      setLedgerTotal(res.total);
      setLedgerAmountSum(res.amountSum);
      setLedgerPaymentSum(res.paymentSum);
      setLedgerBalance(res.balance);
      if (res.total === 0) {
        setLedgerPageState(1);
      } else if (ledgerPage > 1 && ledgerPage > res.totalPages) {
        setLedgerPageState(res.totalPages);
      }
    } catch {
      setEntries([]);
      setLedgerTotal(0);
    } finally {
      setLedgerLoading(false);
    }
  }, [supplierId, debouncedLedgerSearch, ledgerPage]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadDetail(), loadLedger()]);
  }, [loadDetail, loadLedger]);

  const setLedgerPage = useCallback((value: number) => setLedgerPageState(value), []);

  const setLedgerSearch = useCallback((value: string) => {
    setLedgerSearchState(value);
    setLedgerPageState(1);
  }, []);

  const resetLedgerFilters = useCallback(() => {
    setLedgerSearchState('');
    setDebouncedLedgerSearch('');
    setLedgerPageState(1);
  }, []);

  // --- Записи ведомости ---
  const [entryModalKind, setEntryModalKind] = useState<EntryModalKind>(null);
  const [editingEntry, setEditingEntry] = useState<AdminSupplierLedgerEntry | null>(null);
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  const openCreateInvoiceModal = useCallback(() => {
    if (!canEdit) return;
    setEditingEntry(null);
    setEntryModalKind('invoice');
  }, [canEdit]);

  const openCreatePaymentModal = useCallback(() => {
    if (!canManagePayments) return;
    setEditingEntry(null);
    setEntryModalKind('payment');
  }, [canManagePayments]);

  const openEditEntryModal = useCallback(
    (entry: AdminSupplierLedgerEntry) => {
      if (!canEdit) return;
      // Оплату может править только супер-админ; счёт — любой с правом редактирования.
      if (entry.amount == null && !canManagePayments) return;
      setEditingEntry(entry);
      setEntryModalKind(entry.amount != null ? 'invoice' : 'payment');
    },
    [canEdit, canManagePayments]
  );

  const closeEntryModal = useCallback(() => {
    setEntryModalKind(null);
    setEditingEntry(null);
  }, []);

  const handleSaveEntry = useCallback(
    async (params: SaveSupplierLedgerEntryParams) => {
      setEntrySubmitting(true);
      try {
        if (editingEntry) {
          await updateSupplierLedgerEntry(editingEntry.id, params);
        } else {
          await createSupplierLedgerEntry(supplierId, params);
        }
        setEntryModalKind(null);
        setEditingEntry(null);
        await loadAll();
      } finally {
        setEntrySubmitting(false);
      }
    },
    [editingEntry, supplierId, loadAll]
  );

  const askDeleteEntry = useCallback((entryId: string) => setDeleteEntryId(entryId), []);
  const cancelDeleteEntry = useCallback(() => setDeleteEntryId(null), []);

  const handleDeleteEntry = useCallback(async () => {
    if (!deleteEntryId) return;
    setDeletingEntry(true);
    try {
      await deleteSupplierLedgerEntry(deleteEntryId);
      setDeleteEntryId(null);
      await loadAll();
    } finally {
      setDeletingEntry(false);
    }
  }, [deleteEntryId, loadAll]);

  // --- Блоки реквизитов ---
  const [requisiteModalOpen, setRequisiteModalOpen] = useState(false);
  const [editingRequisite, setEditingRequisite] = useState<AdminSupplierRequisite | null>(null);
  const [requisiteSubmitting, setRequisiteSubmitting] = useState(false);
  const [deleteRequisiteId, setDeleteRequisiteId] = useState<string | null>(null);
  const [deletingRequisite, setDeletingRequisite] = useState(false);

  const openCreateRequisiteModal = useCallback(() => {
    if (!canEdit) return;
    setEditingRequisite(null);
    setRequisiteModalOpen(true);
  }, [canEdit]);

  const openEditRequisiteModal = useCallback(
    (requisite: AdminSupplierRequisite) => {
      if (!canEdit) return;
      setEditingRequisite(requisite);
      setRequisiteModalOpen(true);
    },
    [canEdit]
  );

  const closeRequisiteModal = useCallback(() => setRequisiteModalOpen(false), []);

  const handleSaveRequisite = useCallback(
    async (params: SaveSupplierRequisiteParams) => {
      setRequisiteSubmitting(true);
      try {
        if (editingRequisite) {
          await updateSupplierRequisite(editingRequisite.id, params);
        } else {
          await createSupplierRequisite(supplierId, params);
        }
        setRequisiteModalOpen(false);
        await loadDetail();
      } finally {
        setRequisiteSubmitting(false);
      }
    },
    [editingRequisite, supplierId, loadDetail]
  );

  const askDeleteRequisite = useCallback(
    (requisiteId: string) => setDeleteRequisiteId(requisiteId),
    []
  );
  const cancelDeleteRequisite = useCallback(() => setDeleteRequisiteId(null), []);

  const handleDeleteRequisite = useCallback(async () => {
    if (!deleteRequisiteId) return;
    setDeletingRequisite(true);
    try {
      await deleteSupplierRequisite(deleteRequisiteId);
      setDeleteRequisiteId(null);
      await Promise.all([loadDetail(), loadLedger()]);
    } finally {
      setDeletingRequisite(false);
    }
  }, [deleteRequisiteId, loadDetail, loadLedger]);

  // --- Карточка поставщика ---
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);
  const [deleteSupplierConfirm, setDeleteSupplierConfirm] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState(false);

  const openSupplierModal = useCallback(() => {
    if (!canEdit) return;
    setSupplierModalOpen(true);
  }, [canEdit]);

  const closeSupplierModal = useCallback(() => setSupplierModalOpen(false), []);

  const handleSaveSupplier = useCallback(
    async (params: SaveSupplierParams) => {
      setSupplierSubmitting(true);
      try {
        await updateSupplier(supplierId, params);
        setSupplierModalOpen(false);
        await loadAll();
      } finally {
        setSupplierSubmitting(false);
      }
    },
    [supplierId, loadAll]
  );

  const askDeleteSupplier = useCallback(() => setDeleteSupplierConfirm(true), []);
  const cancelDeleteSupplier = useCallback(() => setDeleteSupplierConfirm(false), []);

  const handleDeleteSupplier = useCallback(async () => {
    setDeletingSupplier(true);
    try {
      await deleteSupplier(supplierId);
      setDeleteSupplierConfirm(false);
      router.push('/admin/suppliers');
    } finally {
      setDeletingSupplier(false);
    }
  }, [supplierId, router]);

  return {
    supplier,
    requisites,
    stats,
    productsCount,
    loading,
    error,
    setError,
    load: loadDetail,
    loadAll,
    entries,
    ledgerTotal,
    ledgerPage,
    setLedgerPage,
    ledgerAmountSum,
    ledgerPaymentSum,
    ledgerBalance,
    ledgerLoading,
    ledgerSearch,
    setLedgerSearch,
    resetLedgerFilters,
    tab,
    setTab,
    entryModalKind,
    editingEntry,
    openCreateInvoiceModal,
    openCreatePaymentModal,
    openEditEntryModal,
    closeEntryModal,
    entrySubmitting,
    handleSaveEntry,
    deleteEntryId,
    askDeleteEntry,
    cancelDeleteEntry,
    deletingEntry,
    handleDeleteEntry,
    requisiteModalOpen,
    editingRequisite,
    openCreateRequisiteModal,
    openEditRequisiteModal,
    closeRequisiteModal,
    requisiteSubmitting,
    handleSaveRequisite,
    deleteRequisiteId,
    askDeleteRequisite,
    cancelDeleteRequisite,
    deletingRequisite,
    handleDeleteRequisite,
    supplierModalOpen,
    openSupplierModal,
    closeSupplierModal,
    supplierSubmitting,
    handleSaveSupplier,
    deleteSupplierConfirm,
    askDeleteSupplier,
    cancelDeleteSupplier,
    deletingSupplier,
    handleDeleteSupplier,
    canEdit,
    canManagePayments,
  };
}
