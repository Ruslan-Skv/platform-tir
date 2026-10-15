'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import {
  type SalaryPayoutInput,
  type SalaryPayoutItem,
  type SalaryPayoutPatch,
  type SalaryPayoutsListResponse,
  createSalaryPayout,
  deleteSalaryPayout,
  listSalaryPayouts,
  updateSalaryPayout,
} from '@/shared/api/accounting/admin-salary-payouts';

import { currentMonthStartIso, todayIso } from '../../Bank/bank-page.constants';
import { PAYOUTS_PAGE_FILTERS_STORAGE_KEY } from '../payouts-page.constants';

export const PAYOUTS_PAGE_LIMIT_OPTIONS = [20, 50, 100, 200] as const;
export type PayoutsPageLimit = (typeof PAYOUTS_PAGE_LIMIT_OPTIONS)[number];
const DEFAULT_LIMIT: PayoutsPageLimit = 50;

type PayoutsPagePersistedFilters = {
  dateFrom: string;
  dateTo: string;
  method: string;
  search: string;
  limit: PayoutsPageLimit;
  filtersCollapsed: boolean;
};

function readPersistedFilters(): Partial<PayoutsPagePersistedFilters> | null {
  try {
    const raw = window.localStorage.getItem(PAYOUTS_PAGE_FILTERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PayoutsPagePersistedFilters>;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function writePersistedFilters(filters: PayoutsPagePersistedFilters): void {
  try {
    window.localStorage.setItem(PAYOUTS_PAGE_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* localStorage недоступен — настройки просто не сохранятся */
  }
}

function isPayoutsPageLimit(value: unknown): value is PayoutsPageLimit {
  return (
    typeof value === 'number' && (PAYOUTS_PAGE_LIMIT_OPTIONS as readonly number[]).includes(value)
  );
}

/** Локальная дата в ISO (YYYY-MM-DD) без сдвига таймзоны. */
function toLocalIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function usePayoutsPage() {
  const { canEdit } = useAdminSectionCanEdit();
  const { user } = useAuth();
  /** Правка и удаление выплат — только супер-админ (как у ручных записей ДП). */
  const canManage = user?.role === 'SUPER_ADMIN';

  const [rows, setRows] = useState<SalaryPayoutItem[]>([]);
  const [listMeta, setListMeta] = useState<
    Pick<
      SalaryPayoutsListResponse,
      'totalSum' | 'cashSum' | 'bankSum' | 'byRecipient' | 'managers' | 'total'
    >
  >({ totalSum: 0, cashSum: 0, bankSum: 0, byRecipient: [], managers: [], total: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [limit, setLimitState] = useState<PayoutsPageLimit>(DEFAULT_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(currentMonthStartIso);
  const [dateTo, setDateTo] = useState('');
  const [method, setMethodState] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtersRestored, setFiltersRestored] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const toggleFiltersCollapsed = useCallback(() => setFiltersCollapsed((v) => !v), []);

  // Восстановление сохранённых фильтров после монтирования (SSR-безопасно).
  useEffect(() => {
    const persisted = readPersistedFilters();
    if (persisted) {
      if (typeof persisted.dateFrom === 'string') setDateFrom(persisted.dateFrom);
      if (typeof persisted.dateTo === 'string') setDateTo(persisted.dateTo);
      if (typeof persisted.method === 'string') setMethodState(persisted.method);
      if (typeof persisted.search === 'string') {
        setSearch(persisted.search);
        setDebouncedSearch(persisted.search.trim());
      }
      if (isPayoutsPageLimit(persisted.limit)) setLimitState(persisted.limit);
      if (typeof persisted.filtersCollapsed === 'boolean')
        setFiltersCollapsed(persisted.filtersCollapsed);
    }
    setFiltersRestored(true);
  }, []);

  useEffect(() => {
    if (!filtersRestored) return;
    writePersistedFilters({ dateFrom, dateTo, method, search, limit, filtersCollapsed });
  }, [filtersRestored, dateFrom, dateTo, method, search, limit, filtersCollapsed]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listSalaryPayouts({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        method: method === 'CASH' || method === 'BANK' ? method : undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setRows(res.data);
      setListMeta({
        totalSum: res.totalSum,
        cashSum: res.cashSum,
        bankSum: res.bankSum,
        byRecipient: res.byRecipient,
        managers: res.managers,
        total: res.total,
      });
      setTotal(res.total);
      if (res.total === 0) {
        setPageState(1);
      } else if (page > 1 && page > Math.ceil(res.total / res.limit)) {
        setPageState(Math.ceil(res.total / res.limit));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить выплаты з/п');
      setRows([]);
      setListMeta({ totalSum: 0, cashSum: 0, bankSum: 0, byRecipient: [], managers: [], total: 0 });
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, method, debouncedSearch, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPage = useCallback((value: number) => setPageState(value), []);

  const setLimit = useCallback((value: PayoutsPageLimit) => {
    setLimitState(value);
    setPageState(1);
  }, []);

  const setMethod = useCallback((value: string) => {
    setMethodState(value);
    setPageState(1);
  }, []);

  /** Быстрый период как в Банке и Кассе: сегодня / неделя / текущий месяц. */
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
    setPageState(1);
  }, []);

  const resetFilters = useCallback(() => {
    setDateFrom(currentMonthStartIso());
    setDateTo('');
    setMethodState('');
    setSearch('');
    setDebouncedSearch('');
    setPageState(1);
  }, []);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryPayoutItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaryPayoutItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateModal = () => {
    if (!canEdit) return;
    setEditing(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (item: SalaryPayoutItem) => {
    if (!canManage || item.source !== 'PAYOUT') return;
    setEditing(item);
    setCreateModalOpen(true);
  };

  const closeModal = () => {
    setCreateModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = useCallback(
    async (input: SalaryPayoutInput | SalaryPayoutPatch) => {
      setSaving(true);
      try {
        if (editing) {
          await updateSalaryPayout(editing.id, input as SalaryPayoutPatch);
        } else {
          await createSalaryPayout(input as SalaryPayoutInput);
        }
        setCreateModalOpen(false);
        setEditing(null);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить выплату');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [editing, load]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSalaryPayout(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить выплату');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, load]);

  /** Дефолтный менеджер кассы — текущий пользователь. */
  const defaultManager = user?.id
    ? {
        managerId: user.id,
        managerName: [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email,
      }
    : null;

  return {
    rows,
    totalSum: listMeta.totalSum,
    cashSum: listMeta.cashSum,
    bankSum: listMeta.bankSum,
    byRecipient: listMeta.byRecipient,
    managers: listMeta.managers,
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
    method,
    setMethod,
    search,
    setSearch,
    resetFilters,
    setPeriod,
    filtersCollapsed,
    toggleFiltersCollapsed,
    createModalOpen,
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
    canManage,
    defaultManager,
  };
}

export type PayoutsPageModel = ReturnType<typeof usePayoutsPage>;
