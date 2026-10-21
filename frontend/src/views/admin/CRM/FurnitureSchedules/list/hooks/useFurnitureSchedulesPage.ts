'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { type InstallerMaster, getInstallers } from '@/shared/api/admin-crm';
import {
  type FurnitureScheduleProject,
  type FurnitureScheduleProjectStatus,
  createFurnitureScheduleProject,
  deleteFurnitureScheduleProject,
  getFurnitureScheduleProjects,
  setFurnitureScheduleProjectStatus,
} from '@/shared/api/crm/admin-furniture-schedules';
import { useAdminListPagination } from '@/views/admin/CRM/shared/list-pagination';

import {
  FURNITURE_STATUS_SECTION_ORDER,
  type FurnitureProjectFormValues,
  emptyFurnitureProjectForm,
  matchesDeadlineFilter,
  normalizeFurnitureKzInfo,
  resolveFurnitureTermStartDate,
} from '../../shared/furniture-schedules';
import {
  compareFurnitureProjectsByAge,
  compareFurnitureProjectsByClosedAt,
  compareFurnitureProjectsByContractDate,
} from '../../shared/furnitureObjectGroups';

export type FurnitureDeadlineFilter = 'ALL' | 'LE20' | 'LE10' | 'LE3' | 'OVERDUE';

export type FurnitureSchedulesViewMode = 'list' | 'timeline';

const VIEW_MODE_STORAGE_KEY = 'admin_furniture_schedules_view_mode';
const FILTERS_STORAGE_KEY = 'admin_furniture_schedules_filters';
const PAGINATION_STORAGE_KEY = 'admin_furniture_schedules_pagination';

type StoredFilters = {
  statusFilter: FurnitureScheduleProjectStatus | 'ALL';
  deadlineFilter: FurnitureDeadlineFilter;
  staleOnly: boolean;
  search: string;
};

function readStoredFilters(): Partial<StoredFilters> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredFilters>) : {};
  } catch {
    return {};
  }
}

function readStoredViewMode(): FurnitureSchedulesViewMode {
  if (typeof window === 'undefined') return 'list';
  try {
    return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'timeline' ? 'timeline' : 'list';
  } catch {
    return 'list';
  }
}

export function useFurnitureSchedulesPage() {
  const router = useRouter();
  const [stored] = useState(readStoredFilters);
  const [statusFilter, setStatusFilterState] = useState<FurnitureScheduleProjectStatus | 'ALL'>(
    stored.statusFilter ?? 'IN_PROGRESS'
  );
  const [deadlineFilter, setDeadlineFilterState] = useState<FurnitureDeadlineFilter>(
    stored.deadlineFilter ?? 'ALL'
  );
  const [viewMode, setViewModeState] = useState<FurnitureSchedulesViewMode>(() =>
    readStoredViewMode()
  );
  const [staleOnly, setStaleOnlyState] = useState(stored.staleOnly ?? false);
  const [search, setSearchState] = useState(stored.search ?? '');
  const [items, setItems] = useState<FurnitureScheduleProject[]>([]);
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<FurnitureScheduleProject | null>(null);
  const [formValues, setFormValues] =
    useState<FurnitureProjectFormValues>(emptyFurnitureProjectForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const repairInstallers = useMemo(
    () => installers.filter((i) => i.directions?.includes('FURNITURE')),
    [installers]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await getFurnitureScheduleProjects({
          search: search.trim() || undefined,
          staleOnly: staleOnly || undefined,
        })
      );
    } catch (err) {
      setItems([]);
      setMessage(err instanceof Error ? err.message : 'Не удалось загрузить план-график');
    } finally {
      setLoading(false);
    }
  }, [search, staleOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void getInstallers()
      .then(setInstallers)
      .catch(() => setInstallers([]));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ statusFilter, deadlineFilter, staleOnly, search })
      );
    } catch {
      /* ignore */
    }
  }, [statusFilter, deadlineFilter, staleOnly, search]);

  const statusScopedItems = useMemo(() => {
    if (statusFilter === 'ALL') return items;
    return items.filter((i) => i.status === statusFilter);
  }, [items, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      ALL: items.length,
      NEW: items.filter((i) => i.status === 'NEW').length,
      IN_PROGRESS: items.filter((i) => i.status === 'IN_PROGRESS').length,
      CLAIMS: items.filter((i) => i.status === 'CLAIMS').length,
      CLOSED: items.filter((i) => i.status === 'CLOSED').length,
      STALE: items.filter((i) => i.stale).length,
    }),
    [items]
  );

  const deadlineCounts = useMemo(
    () => ({
      LE20: statusScopedItems.filter((i) => matchesDeadlineFilter(i, 'LE20')).length,
      LE10: statusScopedItems.filter((i) => matchesDeadlineFilter(i, 'LE10')).length,
      LE3: statusScopedItems.filter((i) => matchesDeadlineFilter(i, 'LE3')).length,
      OVERDUE: statusScopedItems.filter((i) => matchesDeadlineFilter(i, 'OVERDUE')).length,
    }),
    [statusScopedItems]
  );

  const visibleItems = useMemo(() => {
    let rows = statusScopedItems.filter((i) => matchesDeadlineFilter(i, deadlineFilter));
    if (statusFilter === 'ALL') {
      // «Все»: секции идут в фиксированном порядке (в работе → на очереди → рекламации →
      // закрытые), внутри секции — по дате договора, как их показывает список. Пагинация
      // нарезает страницы по этому порядку, поэтому статусы не перемешиваются между страницами.
      rows = [...rows].sort((a, b) => {
        const sa = FURNITURE_STATUS_SECTION_ORDER.indexOf(a.status);
        const sb = FURNITURE_STATUS_SECTION_ORDER.indexOf(b.status);
        return sa !== sb ? sa - sb : compareFurnitureProjectsByContractDate(a, b);
      });
    } else if (deadlineFilter !== 'ALL') {
      rows = [...rows].sort((a, b) => {
        const da = a.deadlineDaysLeft ?? Number.POSITIVE_INFINITY;
        const db = b.deadlineDaysLeft ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return statusFilter === 'CLOSED'
          ? compareFurnitureProjectsByClosedAt(a, b, true)
          : compareFurnitureProjectsByAge(a, b, false);
      });
    } else if (statusFilter === 'CLOSED') {
      // Закрытые: сверху новые (по дате закрытия).
      rows = [...rows].sort((a, b) => compareFurnitureProjectsByClosedAt(a, b, true));
    } else {
      // На очереди / В работе / Рекламации: сверху старые, снизу новые.
      rows = [...rows].sort((a, b) => compareFurnitureProjectsByAge(a, b, false));
    }
    return rows;
  }, [statusScopedItems, deadlineFilter, statusFilter]);

  const { page, setPage, limit, setLimit, pagedItems } = useAdminListPagination(visibleItems, {
    loading,
    storageKey: PAGINATION_STORAGE_KEY,
  });

  /** Счётчики секций «Все» по всей выборке (без разбивки на страницы) — для заголовков списка. */
  const statusTotals = useMemo(() => {
    let NEW = 0;
    let IN_PROGRESS = 0;
    let CLAIMS = 0;
    let CLOSED = 0;
    for (const i of visibleItems) {
      if (i.status === 'NEW') NEW++;
      else if (i.status === 'IN_PROGRESS') IN_PROGRESS++;
      else if (i.status === 'CLAIMS') CLAIMS++;
      else CLOSED++;
    }
    return { NEW, IN_PROGRESS, CLAIMS, CLOSED };
  }, [visibleItems]);

  /** Смена фильтра возвращает список на первую страницу. */
  const setStatusFilter = useCallback(
    (value: FurnitureScheduleProjectStatus | 'ALL') => {
      setStatusFilterState(value);
      setPage(1);
    },
    [setPage]
  );

  const setDeadlineFilter = useCallback(
    (value: FurnitureDeadlineFilter) => {
      setDeadlineFilterState(value);
      setPage(1);
    },
    [setPage]
  );

  const setStaleOnly = useCallback(
    (value: boolean) => {
      setStaleOnlyState(value);
      setPage(1);
    },
    [setPage]
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      setPage(1);
    },
    [setPage]
  );

  const openCreate = () => {
    setFormValues(emptyFurnitureProjectForm());
    setFormError(null);
    setCreateOpen(true);
  };

  const setViewMode = (mode: FurnitureSchedulesViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    if (mode === 'timeline') {
      if (
        statusFilter !== 'NEW' &&
        statusFilter !== 'IN_PROGRESS' &&
        statusFilter !== 'CLAIMS' &&
        statusFilter !== 'ALL'
      ) {
        setStatusFilter('ALL');
      }
    }
  };

  const saveCreate = async () => {
    if (!formValues.contractNumber.trim() && !formValues.packageId.trim()) {
      setFormError('Укажите номер договора или выберите пакет');
      return false;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await createFurnitureScheduleProject({
        status: formValues.status,
        contractNumber: formValues.contractNumber.trim() || null,
        installationContractNumber: formValues.installationContractNumber.trim() || null,
        appliancesContractNumber: formValues.appliancesContractNumber.trim() || null,
        repairInfo: formValues.repairInfo.trim() || null,
        reviewInfo: formValues.reviewInfo.trim() || null,
        workScope: formValues.workScope.trim() || null,
        installerId: formValues.manualInstaller ? null : formValues.installerId.trim() || null,
        installerName: formValues.manualInstaller ? formValues.installerName.trim() || null : null,
        packageId: formValues.packageId.trim() || null,
        customerName: formValues.customerName.trim() || null,
        customerAddress: formValues.customerAddress.trim() || null,
        customerPhone: formValues.customerPhone.trim() || null,
        contractSum: formValues.contractSum.trim() ? Number(formValues.contractSum) : null,
        payoutSum: formValues.payoutSum.trim() ? Number(formValues.payoutSum) : null,
        contractDate: formValues.contractDate.trim() || null,
        kzInfo: normalizeFurnitureKzInfo(formValues.kzInfo) || null,
        pauseStartDate: formValues.pauseStartDate.trim() || null,
        pauseResumeDate: formValues.pauseResumeDate.trim() || null,
        workPeriodDays: formValues.workPeriodDays.trim() ? Number(formValues.workPeriodDays) : null,
        workStartActDate:
          resolveFurnitureTermStartDate(
            formValues.contractDate,
            formValues.kzInfo,
            formValues.workStartActDate
          ) || null,
        workCloseActDate: formValues.workCloseActDate.trim() || null,
        plannedStartDate:
          resolveFurnitureTermStartDate(
            formValues.contractDate,
            formValues.kzInfo,
            formValues.workStartActDate
          ) || null,
        note: formValues.note.trim() || null,
      });
      setCreateOpen(false);
      await refresh();
      router.push(`/admin/crm/furniture-schedules/${created.id}`);
      return true;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось создать');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const moveStatus = async (
    item: FurnitureScheduleProject,
    status: FurnitureScheduleProjectStatus
  ) => {
    setSubmitting(true);
    try {
      await setFurnitureScheduleProjectStatus(item.id, status);
      await refresh();
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось сменить статус');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!deleteItem) return false;
    setSubmitting(true);
    try {
      await deleteFurnitureScheduleProject(deleteItem.id);
      setDeleteItem(null);
      await refresh();
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось удалить');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    statusFilter,
    setStatusFilter,
    deadlineFilter,
    setDeadlineFilter,
    viewMode,
    setViewMode,
    staleOnly,
    setStaleOnly,
    search,
    setSearch,
    items: visibleItems,
    /** Записи текущей страницы списка (срез items под пагинацию). */
    pagedItems,
    /** Номер страницы списка (пагинация). */
    page,
    setPage,
    /** Записей на странице списка (пагинация). */
    limit,
    setLimit,
    /** Счётчики секций «Все» по всей выборке — заголовки секций при пагинации. */
    statusTotals,
    repairInstallers,
    loading,
    message,
    setMessage,
    createOpen,
    setCreateOpen,
    importOpen,
    setImportOpen,
    deleteItem,
    setDeleteItem,
    formValues,
    setFormValues,
    formError,
    submitting,
    statusCounts,
    deadlineCounts,
    refresh,
    openCreate,
    saveCreate,
    moveStatus,
    remove,
    openProject: (id: string) => router.push(`/admin/crm/furniture-schedules/${id}`),
  };
}

export type FurnitureSchedulesPageModel = ReturnType<typeof useFurnitureSchedulesPage>;
