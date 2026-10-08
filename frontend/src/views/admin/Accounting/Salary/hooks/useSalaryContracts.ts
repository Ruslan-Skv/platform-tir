'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  SalaryContract,
  SalaryContractPayload,
  SalaryContractsList,
  SalarySettings,
} from '@/shared/api/admin-salary';
import {
  createSalaryContract,
  deleteSalaryContract,
  getSalaryContracts,
  updateSalaryContract,
} from '@/shared/api/admin-salary';

import { SALARY_PAGE_LIMIT_OPTIONS, type SalaryPageLimit } from '../salary-page.constants';

const DEFAULT_LIMIT: SalaryPageLimit = 50;

/** Ключ localStorage для сохранения фильтров списка договоров. */
const SALARY_CONTRACTS_FILTERS_STORAGE_KEY = 'admin_salary_contracts_filters_v1';

/** Payload создания/обновления договора (форма модалки). */
export type SalaryContractInput = SalaryContractPayload;

type PersistedFilters = {
  filterOfficeId: string;
  filterCategoryId: string;
  filterFrom: string;
  filterTo: string;
  search: string;
  limit: SalaryPageLimit;
  filtersCollapsed: boolean;
};

function readPersistedFilters(): Partial<PersistedFilters> | null {
  try {
    const raw = window.localStorage.getItem(SALARY_CONTRACTS_FILTERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedFilters>;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

function writePersistedFilters(filters: PersistedFilters): void {
  try {
    window.localStorage.setItem(SALARY_CONTRACTS_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {
    /* localStorage недоступен — настройки просто не сохранятся */
  }
}

function isSalaryPageLimit(value: unknown): value is SalaryPageLimit {
  return (
    typeof value === 'number' && (SALARY_PAGE_LIMIT_OPTIONS as readonly number[]).includes(value)
  );
}

/** Логика вкладки «Договоры»: реестр договоров для расчёта з/п. */
export function useSalaryContracts(settings: SalarySettings | null) {
  const [list, setList] = useState<SalaryContractsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterOfficeId, setFilterOfficeId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState<SalaryPageLimit>(DEFAULT_LIMIT);
  /** Фильтры восстановлены из localStorage (false до монтирования). */
  const [filtersRestored, setFiltersRestored] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const toggleFiltersCollapsed = useCallback(() => setFiltersCollapsed((v) => !v), []);

  // Восстановление сохранённых фильтров после монтирования (SSR-безопасно).
  useEffect(() => {
    const persisted = readPersistedFilters();
    if (persisted) {
      if (typeof persisted.filterOfficeId === 'string') setFilterOfficeId(persisted.filterOfficeId);
      if (typeof persisted.filterCategoryId === 'string')
        setFilterCategoryId(persisted.filterCategoryId);
      if (typeof persisted.filterFrom === 'string') setFilterFrom(persisted.filterFrom);
      if (typeof persisted.filterTo === 'string') setFilterTo(persisted.filterTo);
      if (typeof persisted.search === 'string') {
        setSearch(persisted.search);
        setDebouncedSearch(persisted.search.trim());
      }
      if (isSalaryPageLimit(persisted.limit)) setLimitState(persisted.limit);
      if (typeof persisted.filtersCollapsed === 'boolean')
        setFiltersCollapsed(persisted.filtersCollapsed);
    }
    setFiltersRestored(true);
  }, []);

  useEffect(() => {
    if (!filtersRestored) return;
    writePersistedFilters({
      filterOfficeId,
      filterCategoryId,
      filterFrom,
      filterTo,
      search,
      limit,
      filtersCollapsed,
    });
  }, [
    filtersRestored,
    filterOfficeId,
    filterCategoryId,
    filterFrom,
    filterTo,
    search,
    limit,
    filtersCollapsed,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Сохранённая категория может исчезнуть из настроек — не держим невалидный фильтр.
  useEffect(() => {
    if (
      settings &&
      filterCategoryId &&
      !settings.categories.some((c) => c.id === filterCategoryId)
    ) {
      setFilterCategoryId('');
    }
  }, [settings, filterCategoryId]);

  /** Счётчик запросов: побеждает последний — поздний ответ устаревшего запроса не затирает свежий. */
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getSalaryContracts({
        officeId: filterOfficeId || undefined,
        categoryId: filterCategoryId || undefined,
        dateFrom: filterFrom || undefined,
        dateTo: filterTo || undefined,
        search: debouncedSearch || undefined,
        page,
        limit,
      });
      if (seq !== loadSeqRef.current) return;
      setList(data);
      if (data.total === 0) {
        setPage(1);
      } else if (page > 1 && page > Math.ceil(data.total / data.limit)) {
        setPage(Math.ceil(data.total / data.limit));
      }
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      setError(err instanceof Error ? err.message : 'Не удалось загрузить договоры');
      setList(null);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [filterOfficeId, filterCategoryId, filterFrom, filterTo, debouncedSearch, page, limit]);

  // Первый запрос — только после восстановления сохранённых фильтров, иначе стартовый
  // запрос с пустыми фильтрами гоняется с восстановленным и затирает его результат.
  useEffect(() => {
    if (!filtersRestored) return;
    void load();
  }, [filtersRestored, load]);

  const setLimit = useCallback((value: SalaryPageLimit) => {
    setLimitState(value);
    setPage(1);
  }, []);

  const setOfficeFilter = useCallback((value: string) => {
    setFilterOfficeId(value);
    setPage(1);
  }, []);

  const setCategoryFilter = useCallback((value: string) => {
    setFilterCategoryId(value);
    setPage(1);
  }, []);

  const setFromFilter = useCallback((value: string) => {
    setFilterFrom(value);
    setPage(1);
  }, []);

  const setToFilter = useCallback((value: string) => {
    setFilterTo(value);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilterOfficeId('');
    setFilterCategoryId('');
    setFilterFrom('');
    setFilterTo('');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryContract | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalaryContract | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreateModal = useCallback(() => {
    setEditing(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((contract: SalaryContract) => {
    setEditing(contract);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
  }, []);

  const handleSubmit = useCallback(
    async (input: SalaryContractInput) => {
      setSaving(true);
      try {
        if (editing) {
          await updateSalaryContract(editing.id, input);
        } else {
          await createSalaryContract(input);
        }
        closeModal();
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось сохранить договор');
      } finally {
        setSaving(false);
      }
    },
    [editing, closeModal, load]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSalaryContract(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить договор');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, load]);

  const items = list?.items ?? [];

  return {
    items,
    total: list?.total ?? 0,
    loading,
    error,
    setError,
    load,
    filterOfficeId,
    setOfficeFilter,
    filterCategoryId,
    setCategoryFilter,
    filterFrom,
    setFromFilter,
    filterTo,
    setToFilter,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    resetFilters,
    filtersCollapsed,
    toggleFiltersCollapsed,
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
  };
}

export type SalaryContractsModel = ReturnType<typeof useSalaryContracts>;
