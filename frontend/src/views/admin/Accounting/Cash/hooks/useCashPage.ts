'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import {
  type CashBookEntry,
  type CashBookListResponse,
  type CashBookManagerTotals,
  createCashBookEntry,
  listCashBook,
} from '@/shared/api/accounting/admin-cash-book';
import { getContractDocumentExecutorProfiles } from '@/shared/api/admin-contract-document-packages';
import type { MoneyMovementManagerOption } from '@/shared/api/crm/admin-money-movements';

import { currentMonthStartIso, todayIso } from '../../Bank/bank-page.constants';
import {
  CASH_PAGE_FILTERS_STORAGE_KEY,
  CASH_PAGE_LIMIT_OPTIONS,
  type CashPageLimit,
} from '../cash-page.constants';

export { CASH_PAGE_LIMIT_OPTIONS, type CashPageLimit };

export type CashPageModel = {
  rows: CashBookEntry[];
  totalSum: number;
  byManager: CashBookManagerTotals[];
  managers: MoneyMovementManagerOption[];
  executors: string[];
  total: number;
  page: number;
  setPage: (value: number) => void;
  limit: CashPageLimit;
  setLimit: (value: CashPageLimit) => void;
  loading: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  load: () => Promise<void>;
  dateFrom: string;
  setDateFrom: (value: string) => void;
  dateTo: string;
  setDateTo: (value: string) => void;
  managerId: string;
  setManagerId: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  resetFilters: () => void;
  setPeriod: (kind: 'today' | 'week' | 'month') => void;
  filtersCollapsed: boolean;
  toggleFiltersCollapsed: () => void;
  modalOpen: boolean;
  saving: boolean;
  openCreateModal: () => void;
  closeModal: () => void;
  handleCreate: (input: {
    managerId?: string;
    amount: number;
    direction?: string;
    contractNumber?: string;
    customerName?: string;
    executorName?: string;
    basis: string;
    notes?: string;
  }) => Promise<void>;
  canEdit: boolean;
  /** Дефолтный менеджер записи — текущий пользователь. */
  defaultManager: { managerId: string; managerName: string | null } | null;
};

const DEFAULT_LIMIT: CashPageLimit = 50;

type CashPagePersistedFilters = {
  dateFrom: string;
  dateTo: string;
  managerId: string;
  search: string;
  limit: CashPageLimit;
  filtersCollapsed: boolean;
};

function readPersistedFilters(): Partial<CashPagePersistedFilters> | null {
  try {
    const raw = window.localStorage.getItem(CASH_PAGE_FILTERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CashPagePersistedFilters>;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function writePersistedFilters(filters: CashPagePersistedFilters): void {
  try {
    window.localStorage.setItem(CASH_PAGE_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* localStorage недоступен — настройки просто не сохранятся */
  }
}

function isCashPageLimit(value: unknown): value is CashPageLimit {
  return (
    typeof value === 'number' && (CASH_PAGE_LIMIT_OPTIONS as readonly number[]).includes(value)
  );
}

/** Локальная дата в ISO (YYYY-MM-DD) без сдвига тайзоны. */
function toLocalIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function useCashPage(): CashPageModel {
  const { canEdit } = useAdminSectionCanEdit();
  const { user } = useAuth();

  const [rows, setRows] = useState<CashBookEntry[]>([]);
  const [listMeta, setListMeta] = useState<
    Pick<CashBookListResponse, 'totalSum' | 'byManager' | 'managers' | 'total'>
  >({ totalSum: 0, byManager: [], managers: [], total: 0 });
  const [executors, setExecutors] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [limit, setLimitState] = useState<CashPageLimit>(DEFAULT_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dateFrom, setDateFrom] = useState(currentMonthStartIso);
  const [dateTo, setDateTo] = useState('');
  const [managerId, setManagerIdState] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtersRestored, setFiltersRestored] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const toggleFiltersCollapsed = useCallback(() => setFiltersCollapsed((value) => !value), []);

  // Восстановление сохранённых фильтров после монтирования (SSR-безопасно).
  useEffect(() => {
    const persisted = readPersistedFilters();
    if (persisted) {
      if (typeof persisted.dateFrom === 'string') setDateFrom(persisted.dateFrom);
      if (typeof persisted.dateTo === 'string') setDateTo(persisted.dateTo);
      if (typeof persisted.managerId === 'string') setManagerIdState(persisted.managerId);
      if (typeof persisted.search === 'string') {
        setSearch(persisted.search);
        setDebouncedSearch(persisted.search.trim());
      }
      if (isCashPageLimit(persisted.limit)) setLimitState(persisted.limit);
      if (typeof persisted.filtersCollapsed === 'boolean')
        setFiltersCollapsed(persisted.filtersCollapsed);
    }
    setFiltersRestored(true);
  }, []);

  useEffect(() => {
    if (!filtersRestored) return;
    writePersistedFilters({ dateFrom, dateTo, managerId, search, limit, filtersCollapsed });
  }, [filtersRestored, dateFrom, dateTo, managerId, search, limit, filtersCollapsed]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCashBook({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        managerId: managerId || undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      setRows(res.data);
      setListMeta({
        totalSum: res.totalSum,
        byManager: res.byManager,
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
      setError(e instanceof Error ? e.message : 'Не удалось загрузить кассу');
      setRows([]);
      setListMeta({ totalSum: 0, byManager: [], managers: [], total: 0 });
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, managerId, debouncedSearch, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  // Исполнители направления «Мебель» — тот же справочник, что в «+ Запись» журнала ДП.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await getContractDocumentExecutorProfiles('REPAIR');
        if (!cancelled)
          setExecutors(
            Array.from(
              new Set((res.items ?? []).map((item) => item.title?.trim() || '').filter(Boolean))
            )
          );
      } catch {
        /* справочник исполнителей не критичен для записи */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPage = useCallback((value: number) => setPageState(value), []);

  const setLimit = useCallback((value: CashPageLimit) => {
    setLimitState(value);
    setPageState(1);
  }, []);

  const setManagerId = useCallback((value: string) => {
    setManagerIdState(value);
    setPageState(1);
  }, []);

  // Если сохранённый менеджер исчез из справочника карточек — сбрасываем выбор.
  useEffect(() => {
    if (!managerId || listMeta.managers.length === 0) return;
    if (listMeta.managers.some((m) => m.id === managerId)) return;
    setManagerId('');
  }, [listMeta.managers, managerId, setManagerId]);

  /** Быстрый период как в Банке и ДП: сегодня / неделя / текущий месяц. */
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

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    if (!canEdit) return;
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const handleCreate = useCallback(
    async (input: {
      managerId?: string;
      amount: number;
      direction?: string;
      contractNumber?: string;
      customerName?: string;
      executorName?: string;
      basis: string;
      notes?: string;
    }) => {
      setSaving(true);
      try {
        await createCashBookEntry(input);
        setModalOpen(false);
        await load();
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const resetFilters = useCallback(() => {
    setDateFrom(currentMonthStartIso());
    setDateTo('');
    setManagerIdState('');
    setSearch('');
    setDebouncedSearch('');
    setPageState(1);
  }, []);

  /** Дефолтный менеджер записи — текущий пользователь. */
  const defaultManager = useMemo(
    () =>
      user?.id
        ? {
            managerId: user.id,
            managerName:
              [user.lastName, user.firstName].filter(Boolean).join(' ').trim() || user.email,
          }
        : null,
    [user]
  );

  return {
    rows,
    totalSum: listMeta.totalSum,
    byManager: listMeta.byManager,
    managers: listMeta.managers,
    executors,
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
    managerId,
    setManagerId,
    search,
    setSearch,
    resetFilters,
    setPeriod,
    filtersCollapsed,
    toggleFiltersCollapsed,
    modalOpen,
    saving,
    openCreateModal,
    closeModal,
    handleCreate,
    canEdit,
    defaultManager,
  };
}
