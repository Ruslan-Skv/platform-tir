'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import {
  type AdminSupplier,
  type AdminSupplierSummaryRow,
  type AdminSupplierSummaryTotals,
  type SaveSupplierParams,
  createSupplier,
  getSupplierDetail,
  getSuppliersSummary,
  updateSupplier,
} from '@/shared/api/admin-suppliers';

import {
  DEFAULT_SUPPLIERS_PAGE_LIMIT,
  SUPPLIERS_PAGE_FILTERS_STORAGE_KEY,
  SUPPLIERS_PAGE_LIMIT_OPTIONS,
  type SupplierSortField,
  type SupplierStatusFilter,
  type SuppliersPageLimit,
} from '../suppliers-page.constants';

export type SuppliersPageModel = {
  rows: AdminSupplierSummaryRow[];
  totals: AdminSupplierSummaryTotals | null;
  total: number;
  page: number;
  setPage: (value: number) => void;
  limit: SuppliersPageLimit;
  setLimit: (value: SuppliersPageLimit) => void;
  loading: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  load: () => Promise<void>;
  search: string;
  setSearch: (value: string) => void;
  status: SupplierStatusFilter;
  setStatus: (value: SupplierStatusFilter) => void;
  sort: SupplierSortField;
  order: 'asc' | 'desc';
  setSort: (value: SupplierSortField) => void;
  setOrder: (value: 'asc' | 'desc') => void;
  resetFilters: () => void;
  filtersCollapsed: boolean;
  toggleFiltersCollapsed: () => void;
  /** Модалка карточки поставщика: null — создание. */
  editSupplier: AdminSupplier | null | undefined;
  openCreateModal: () => void;
  openEditModal: (supplierId: string) => void;
  closeModal: () => void;
  saving: boolean;
  handleSave: (params: SaveSupplierParams) => Promise<void>;
  canEdit: boolean;
};

type PersistedFilters = {
  search: string;
  status: SupplierStatusFilter;
  sort: SupplierSortField;
  order: 'asc' | 'desc';
  limit: SuppliersPageLimit;
  filtersCollapsed: boolean;
};

function readPersistedFilters(): Partial<PersistedFilters> | null {
  try {
    const raw = window.localStorage.getItem(SUPPLIERS_PAGE_FILTERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedFilters>;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function writePersistedFilters(filters: PersistedFilters): void {
  try {
    window.localStorage.setItem(SUPPLIERS_PAGE_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* localStorage недоступен — настройки просто не сохранятся */
  }
}

function isLimit(value: unknown): value is SuppliersPageLimit {
  return (
    typeof value === 'number' && (SUPPLIERS_PAGE_LIMIT_OPTIONS as readonly number[]).includes(value)
  );
}

/** Сводный список поставщиков — итоговая вкладка раздела (аналог «Итого» таблицы). */
export function useSuppliersPage(): SuppliersPageModel {
  const { canEdit } = useAdminSectionCanEdit();

  const [rows, setRows] = useState<AdminSupplierSummaryRow[]>([]);
  const [totals, setTotals] = useState<AdminSupplierSummaryTotals | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [limit, setLimitState] = useState<SuppliersPageLimit>(DEFAULT_SUPPLIERS_PAGE_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatusState] = useState<SupplierStatusFilter>('ALL');
  const [sort, setSortState] = useState<SupplierSortField>('name');
  const [order, setOrderState] = useState<'asc' | 'desc'>('asc');
  const [filtersRestored, setFiltersRestored] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const toggleFiltersCollapsed = useCallback(() => setFiltersCollapsed((v) => !v), []);

  // Восстановление сохранённых фильтров после монтирования (SSR-безопасно).
  useEffect(() => {
    const persisted = readPersistedFilters();
    if (persisted) {
      if (typeof persisted.search === 'string') {
        setSearch(persisted.search);
        setDebouncedSearch(persisted.search.trim());
      }
      if (typeof persisted.status === 'string') setStatusState(persisted.status);
      if (typeof persisted.sort === 'string') setSortState(persisted.sort);
      if (persisted.order === 'asc' || persisted.order === 'desc') setOrderState(persisted.order);
      if (isLimit(persisted.limit)) setLimitState(persisted.limit);
      if (typeof persisted.filtersCollapsed === 'boolean')
        setFiltersCollapsed(persisted.filtersCollapsed);
    }
    setFiltersRestored(true);
  }, []);

  useEffect(() => {
    if (!filtersRestored) return;
    writePersistedFilters({ search, status, sort, order, limit, filtersCollapsed });
  }, [filtersRestored, search, status, sort, order, limit, filtersCollapsed]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSuppliersSummary({
        search: debouncedSearch || undefined,
        status,
        sort,
        order,
        page,
        limit,
      });
      setRows(res.data);
      setTotals(res.totals);
      setTotal(res.total);
      if (res.total === 0) {
        setPageState(1);
      } else if (page > 1 && page > res.totalPages) {
        setPageState(res.totalPages);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить поставщиков');
      setRows([]);
      setTotals(null);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, sort, order, page, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPage = useCallback((value: number) => setPageState(value), []);

  const setLimit = useCallback((value: SuppliersPageLimit) => {
    setLimitState(value);
    setPageState(1);
  }, []);

  const setStatus = useCallback((value: SupplierStatusFilter) => {
    setStatusState(value);
    setPageState(1);
  }, []);

  const setSort = useCallback((value: SupplierSortField) => {
    setSortState(value);
    setPageState(1);
  }, []);

  const setOrder = useCallback((value: 'asc' | 'desc') => {
    setOrderState(value);
    setPageState(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
    setStatusState('ALL');
    setSortState('name');
    setOrderState('asc');
    setPageState(1);
  }, []);

  // Модалка карточки: undefined — закрыта, null — создание, объект — редактирование.
  const [editSupplier, setEditSupplier] = useState<AdminSupplier | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const openCreateModal = useCallback(() => {
    if (!canEdit) return;
    setEditSupplier(null);
  }, [canEdit]);

  const openEditModal = useCallback(
    (supplierId: string) => {
      if (!canEdit) return;
      // В сводной строке нет части полей карточки — подтягиваем полную.
      void (async () => {
        try {
          const detail = await getSupplierDetail(supplierId);
          setEditSupplier(detail.supplier);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Не удалось загрузить поставщика');
        }
      })();
    },
    [canEdit]
  );

  const closeModal = useCallback(() => setEditSupplier(undefined), []);

  const handleSave = useCallback(
    async (params: SaveSupplierParams) => {
      setSaving(true);
      try {
        if (editSupplier) {
          await updateSupplier(editSupplier.id, params);
        } else {
          await createSupplier(params);
        }
        setEditSupplier(undefined);
        await load();
      } finally {
        setSaving(false);
      }
    },
    [editSupplier, load]
  );

  return {
    rows,
    totals,
    total,
    page,
    setPage,
    limit,
    setLimit,
    loading,
    error,
    setError,
    load,
    search,
    setSearch,
    status,
    setStatus,
    sort,
    order,
    setSort,
    setOrder,
    resetFilters,
    filtersCollapsed,
    toggleFiltersCollapsed,
    editSupplier,
    openCreateModal,
    openEditModal,
    closeModal,
    saving,
    handleSave,
    canEdit,
  };
}
