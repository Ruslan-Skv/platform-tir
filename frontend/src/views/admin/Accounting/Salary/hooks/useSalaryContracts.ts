'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  SalaryContract,
  SalaryContractPayload,
  SalaryContractsList,
  SalaryContractsSyncReport,
  SalarySettings,
} from '@/shared/api/admin-salary';
import {
  createSalaryContract,
  deleteSalaryContract,
  getSalaryContracts,
  syncSalaryContracts,
  updateSalaryContract,
} from '@/shared/api/admin-salary';

import { SALARY_PAGE_LIMIT_OPTIONS, type SalaryPageLimit } from '../salary-page.constants';

const DEFAULT_LIMIT: SalaryPageLimit = 50;

/** Ключ localStorage для сохранения фильтров списка договоров. */
const SALARY_CONTRACTS_FILTERS_STORAGE_KEY = 'admin_salary_contracts_filters_v1';

/** Payload создания/обновления договора (форма модалки). */
export type SalaryContractInput = SalaryContractPayload;

/** Тип записи договора з/п: '' — все, 'auto' — из синхронизации, 'manual' — вручную. */
export type SalaryEntryKind = '' | 'auto' | 'manual';

type PersistedFilters = {
  filterOfficeId: string;
  filterCategoryId: string;
  filterEntryKind: SalaryEntryKind;
  filterFrom: string;
  filterTo: string;
  search: string;
  limit: SalaryPageLimit;
  filtersCollapsed: boolean;
};

function isSalaryEntryKind(value: unknown): value is SalaryEntryKind {
  return value === '' || value === 'auto' || value === 'manual';
}

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

/** Причины пропуска договоров при синхронизации, сгруппированные: «нет № договора — 3; …». */
function formatSyncSkipReasons(skipped: SalaryContractsSyncReport['skipped']): string {
  const counts = new Map<string, number>();
  for (const item of skipped) counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
  return [...counts.entries()].map(([reason, count]) => `${reason} — ${count}`).join('; ');
}

/** Логика вкладки «Договоры»: реестр договоров для расчёта з/п. */
export function useSalaryContracts(settings: SalarySettings | null) {
  const [list, setList] = useState<SalaryContractsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterOfficeId, setFilterOfficeId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterEntryKind, setFilterEntryKindState] = useState<SalaryEntryKind>('');
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
      if (isSalaryEntryKind(persisted.filterEntryKind))
        setFilterEntryKindState(persisted.filterEntryKind);
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
      filterEntryKind,
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
    filterEntryKind,
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

  // Сохранённое направление может исчезнуть из настроек — не держим невалидный фильтр.
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
        entryKind: filterEntryKind || undefined,
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
  }, [
    filterOfficeId,
    filterCategoryId,
    filterEntryKind,
    filterFrom,
    filterTo,
    debouncedSearch,
    page,
    limit,
  ]);

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

  const setEntryKindFilter = useCallback((value: SalaryEntryKind) => {
    setFilterEntryKindState(value);
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
    setFilterEntryKindState('');
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

  // ===== Синхронизация с договорами (contract-documents) =====

  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const syncSeqRef = useRef(0);

  const showNotice = useCallback((text: string, holdMs = 6000) => {
    setNotice(text);
    window.setTimeout(() => setNotice((current) => (current === text ? null : current)), holdMs);
  }, []);

  /** Подтянуть подписанные договоры раздела «Договоры»; silent — без плашки об ошибке. */
  const sync = useCallback(
    async (silent = false) => {
      const seq = ++syncSeqRef.current;
      setSyncing(true);
      try {
        const report = await syncSalaryContracts();
        if (seq !== syncSeqRef.current) return;
        const parts = [`+${report.created} новых`, `${report.updated} обновлено`];
        if (report.adopted > 0) parts.push(`${report.adopted} привязано к договорам`);
        const skippedNote =
          report.skipped.length > 0
            ? `, пропущено: ${report.skipped.length} (${formatSyncSkipReasons(report.skipped)})`
            : '';
        showNotice(
          `Синхронизация с договорами: ${parts.join(', ')}${skippedNote}`,
          report.skipped.length > 0 ? 12000 : undefined
        );
        await load();
      } catch (err) {
        if (!silent) setError(err instanceof Error ? err.message : 'Не удалось синхронизировать');
      } finally {
        if (seq === syncSeqRef.current) setSyncing(false);
      }
    },
    [load, setError, showNotice]
  );

  const items = list?.items ?? [];

  return {
    items,
    total: list?.total ?? 0,
    loading,
    error,
    setError,
    load,
    notice,
    syncing,
    sync,
    filterOfficeId,
    setOfficeFilter,
    filterCategoryId,
    setCategoryFilter,
    filterEntryKind,
    setEntryKindFilter,
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
