'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import {
  type BankEntriesTotals,
  type BankEntry,
  type BankEntryInput,
  createBankEntry,
  deleteBankEntry,
  listBankEntries,
  updateBankEntry,
} from '@/shared/api/admin-bank-entries';

import { currentMonthStartIso, todayIso } from '../bank-page.constants';

export const BANK_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type BankPageLimit = (typeof BANK_PAGE_LIMIT_OPTIONS)[number];
const DEFAULT_LIMIT: BankPageLimit = 50;

/** Локальная дата в ISO (YYYY-MM-DD) без сдвига таймзоны. */
function toLocalIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function useBankPage() {
  const { canEdit } = useAdminSectionCanEdit();
  const { user } = useAuth();
  /** Удаление записи банка — только супер-админ (как в инкассациях ДП). */
  const canDelete = user?.role === 'SUPER_ADMIN';

  const [rows, setRows] = useState<BankEntry[]>([]);
  const [totals, setTotals] = useState<BankEntriesTotals | null>(null);
  const [byBank, setByBank] = useState<Record<string, BankEntriesTotals>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState<BankPageLimit>(DEFAULT_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(currentMonthStartIso);
  const [dateTo, setDateTo] = useState('');
  const [bank, setBank] = useState('');
  const [entryType, setEntryType] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listBankEntries({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        bank: bank || undefined,
        entryType: entryType || undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setRows(res.data);
      setTotals(res.totals);
      setByBank(res.byBank);
      setTotal(res.total);
      if (res.total === 0) {
        setPage(1);
      } else if (page > 1 && page > Math.ceil(res.total / res.limit)) {
        setPage(Math.ceil(res.total / res.limit));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить поступления банка');
      setRows([]);
      setTotals(null);
      setByBank({});
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, bank, entryType, debouncedSearch, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const setLimit = useCallback((value: BankPageLimit) => {
    setLimitState(value);
    setPage(1);
  }, []);

  /** Быстрый период как в ДП: сегодня / неделя / текущий месяц. */
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

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BankEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BankEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateModal = () => {
    if (!canEdit) return;
    setEditing(null);
    setModalOpen(true);
  };

  const openEditModal = (entry: BankEntry) => {
    if (!canEdit) return;
    setEditing(entry);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (input: BankEntryInput) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      if (editing) {
        await updateBankEntry(editing.id, input);
      } else {
        await createBankEntry(input);
      }
      closeModal();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить запись банка');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBankEntry(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить запись банка');
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setDateFrom(currentMonthStartIso());
    setDateTo('');
    setBank('');
    setEntryType('');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const filtersActive = useMemo(
    () =>
      Boolean(
        dateFrom !== currentMonthStartIso() ||
        dateTo ||
        bank ||
        entryType ||
        search.trim() ||
        limit !== DEFAULT_LIMIT
      ),
    [dateFrom, dateTo, bank, entryType, search, limit]
  );

  return {
    rows,
    totals,
    byBank,
    total,
    page,
    setPage,
    limit,
    setLimit,
    loading,
    error,
    setError,
    load,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    bank,
    setBank,
    entryType,
    setEntryType,
    search,
    setSearch,
    filtersActive,
    resetFilters,
    setPeriod,
    modalOpen,
    editing,
    saving,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    canEdit,
    canDelete,
  };
}

export type BankPageModel = ReturnType<typeof useBankPage>;
