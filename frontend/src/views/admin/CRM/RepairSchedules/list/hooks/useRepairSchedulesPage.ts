'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { type InstallerMaster, getInstallers } from '@/shared/api/admin-crm';
import {
  type RepairScheduleProject,
  type RepairScheduleProjectStatus,
  autoSyncRepairSchedules,
  createRepairScheduleProject,
  deleteRepairScheduleProject,
  getRepairScheduleProjects,
  getRepairScheduleTrashCount,
  setRepairScheduleProjectStatus,
} from '@/shared/api/crm/admin-repair-schedules';
import { useAdminListPagination } from '@/views/admin/CRM/shared/list-pagination';

import {
  REPAIR_STATUS_SECTION_ORDER,
  type RepairProjectFormValues,
  emptyRepairProjectForm,
  matchesDeadlineFilter,
} from '../../shared/repair-schedules';
import {
  buildRepairObjectGroups,
  compareRepairProjectsByAge,
  compareRepairProjectsByClosedAt,
  repairObjectGroupStatus,
} from '../../shared/repairObjectGroups';

export type RepairDeadlineFilter = 'ALL' | 'LE20' | 'LE10' | 'LE3' | 'OVERDUE';

export type RepairSchedulesViewMode = 'list' | 'timeline';

/** Роли, которым разрешено перемещать договоры в корзину (зеркало PLANNER_ROLES backend). */
const TRASH_PLANNER_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'MODERATOR',
  'SUPPORT',
  'MANAGER',
  'TECHNOLOGIST',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
]);

const VIEW_MODE_STORAGE_KEY = 'admin_repair_schedules_view_mode';
const FILTERS_STORAGE_KEY = 'admin_repair_schedules_filters';
const PAGINATION_STORAGE_KEY = 'admin_repair_schedules_pagination';

type StoredFilters = {
  statusFilter: RepairScheduleProjectStatus | 'ALL';
  deadlineFilter: RepairDeadlineFilter;
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

function readStoredViewMode(): RepairSchedulesViewMode {
  if (typeof window === 'undefined') return 'list';
  try {
    return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'timeline' ? 'timeline' : 'list';
  } catch {
    return 'list';
  }
}

export function useRepairSchedulesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stored] = useState(readStoredFilters);
  const [statusFilter, setStatusFilterState] = useState<RepairScheduleProjectStatus | 'ALL'>(
    stored.statusFilter ?? 'IN_PROGRESS'
  );
  const [deadlineFilter, setDeadlineFilterState] = useState<RepairDeadlineFilter>(
    stored.deadlineFilter ?? 'ALL'
  );
  const [viewMode, setViewModeState] = useState<RepairSchedulesViewMode>(() =>
    readStoredViewMode()
  );
  const [staleOnly, setStaleOnlyState] = useState(stored.staleOnly ?? false);
  const [search, setSearchState] = useState(stored.search ?? '');
  const [items, setItems] = useState<RepairScheduleProject[]>([]);
  /** В корзину — только планировщики; проект пакета — только если это дубль (основной остаётся). */
  const canDeleteProject = useCallback(
    (item: RepairScheduleProject) =>
      TRASH_PLANNER_ROLES.has(user?.role ?? '') &&
      (!item.packageId || items.filter((p) => p.packageId === item.packageId).length > 1),
    [user?.role, items]
  );
  const [installers, setInstallers] = useState<InstallerMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<RepairScheduleProject | null>(null);
  const [formValues, setFormValues] = useState<RepairProjectFormValues>(emptyRepairProjectForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  const refreshTrashCount = useCallback(async () => {
    try {
      setTrashCount(await getRepairScheduleTrashCount());
    } catch {
      setTrashCount(0);
    }
  }, []);

  useEffect(() => {
    void refreshTrashCount();
  }, [refreshTrashCount]);

  const repairInstallers = useMemo(
    () => installers.filter((i) => i.directions?.includes('REPAIR')),
    [installers]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      try {
        await autoSyncRepairSchedules();
      } catch {
        /* автозагрузка договоров не должна блокировать список */
      }
      setItems(
        await getRepairScheduleProjects({
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

  /** Блоки объектов: договоры одного объекта с датами подписания в пределах 2 месяцев. */
  const objectGroups = useMemo(() => buildRepairObjectGroups(items), [items]);
  /** Раздел блока для каждого договора — вкладка показывает блок целиком. */
  const blockStatusById = useMemo(() => {
    const map = new Map<string, RepairScheduleProjectStatus>();
    for (const group of objectGroups) {
      const status = repairObjectGroupStatus(group.projects);
      for (const p of group.projects) map.set(p.id, status);
    }
    return map;
  }, [objectGroups]);

  const statusScopedItems = useMemo(() => {
    if (statusFilter === 'ALL') return items;
    return items.filter((i) => blockStatusById.get(i.id) === statusFilter);
  }, [items, statusFilter, blockStatusById]);

  const statusCounts = useMemo(() => {
    let NEW = 0;
    let IN_PROGRESS = 0;
    let CLOSED = 0;
    for (const i of items) {
      const blockStatus = blockStatusById.get(i.id);
      if (blockStatus === 'NEW') NEW++;
      else if (blockStatus === 'IN_PROGRESS') IN_PROGRESS++;
      else CLOSED++;
    }
    return {
      ALL: items.length,
      NEW,
      IN_PROGRESS,
      CLOSED,
      STALE: items.filter((i) => i.stale).length,
    };
  }, [items, blockStatusById]);

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
      // «Все»: блоки объектов раскладываем по секциям агрегатным статусом блока
      // (в работе → новые → закрытые), внутри секции блоки — старые сверху, как в списке.
      // Пагинация нарезает страницы по этому порядку, поэтому секции и блоки объектов
      // не перемешиваются между страницами.
      const blocks = buildRepairObjectGroups(
        [...rows].sort((a, b) => compareRepairProjectsByAge(a, b, false))
      );
      const bySection = new Map<RepairScheduleProjectStatus, RepairScheduleProject[]>();
      for (const status of REPAIR_STATUS_SECTION_ORDER) bySection.set(status, []);
      for (const block of blocks) {
        bySection.get(repairObjectGroupStatus(block.projects))?.push(...block.projects);
      }
      rows = REPAIR_STATUS_SECTION_ORDER.flatMap((status) => bySection.get(status) ?? []);
    } else if (deadlineFilter !== 'ALL') {
      rows = [...rows].sort((a, b) => {
        const da = a.deadlineDaysLeft ?? Number.POSITIVE_INFINITY;
        const db = b.deadlineDaysLeft ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return statusFilter === 'CLOSED'
          ? compareRepairProjectsByClosedAt(a, b, true)
          : compareRepairProjectsByAge(a, b, false);
      });
    } else if (statusFilter === 'CLOSED') {
      // Закрытые: сверху закрытые позднее всего.
      rows = [...rows].sort((a, b) => compareRepairProjectsByClosedAt(a, b, true));
    } else {
      // Новые / В работе — старые сверху.
      // Группировка по объекту потом держит договоры вместе по первому появлению.
      rows = [...rows].sort((a, b) => compareRepairProjectsByAge(a, b, false));
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
    let CLOSED = 0;
    for (const i of visibleItems) {
      const blockStatus = blockStatusById.get(i.id);
      if (blockStatus === 'NEW') NEW++;
      else if (blockStatus === 'IN_PROGRESS') IN_PROGRESS++;
      else CLOSED++;
    }
    return { NEW, IN_PROGRESS, CLOSED };
  }, [visibleItems, blockStatusById]);

  /** Смена фильтра возвращает список на первую страницу. */
  const setStatusFilter = useCallback(
    (value: RepairScheduleProjectStatus | 'ALL') => {
      setStatusFilterState(value);
      setPage(1);
    },
    [setPage]
  );

  const setDeadlineFilter = useCallback(
    (value: RepairDeadlineFilter) => {
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
    setFormValues(emptyRepairProjectForm());
    setFormError(null);
    setCreateOpen(true);
  };

  const setViewMode = (mode: RepairSchedulesViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    if (mode === 'timeline' && statusFilter !== 'IN_PROGRESS') {
      setStatusFilter('IN_PROGRESS');
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
      const created = await createRepairScheduleProject({
        status: formValues.status,
        contractNumber: formValues.contractNumber.trim() || null,
        workScope: formValues.workScope.trim() || null,
        installerId: formValues.manualInstaller ? null : formValues.installerId.trim() || null,
        installerName: formValues.manualInstaller ? formValues.installerName.trim() || null : null,
        packageId: formValues.packageId.trim() || null,
        customerName: formValues.customerName.trim() || null,
        customerAddress: formValues.customerAddress.trim() || null,
        customerPhone: formValues.customerPhone.trim() || null,
        contractSum: formValues.contractSum.trim() ? Number(formValues.contractSum) : null,
        payoutSum: formValues.payoutSum.trim() ? Number(formValues.payoutSum) : null,
        workPeriodDays: formValues.workPeriodDays.trim() ? Number(formValues.workPeriodDays) : null,
        workStartActDate: formValues.workStartActDate.trim() || null,
        workCloseActDate: formValues.workCloseActDate.trim() || null,
        plannedStartDate: formValues.plannedStartDate.trim() || null,
        note: formValues.note.trim() || null,
      });
      setCreateOpen(false);
      await refresh();
      router.push(`/admin/crm/repair-schedules/${created.id}`);
      return true;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось создать');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const moveStatus = async (item: RepairScheduleProject, status: RepairScheduleProjectStatus) => {
    setSubmitting(true);
    try {
      await setRepairScheduleProjectStatus(item.id, status);
      await refresh();
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось сменить статус');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  /** Удаление договора — только через корзину (мягкое удаление на backend). */
  const remove = async () => {
    if (!deleteItem) return false;
    setSubmitting(true);
    try {
      await deleteRepairScheduleProject(deleteItem.id);
      setDeleteItem(null);
      await Promise.all([refresh(), refreshTrashCount()]);
      return true;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Не удалось переместить в корзину');
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
    canDeleteProject,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    openProject: (id: string) => router.push(`/admin/crm/repair-schedules/${id}`),
  };
}

export type RepairSchedulesPageModel = ReturnType<typeof useRepairSchedulesPage>;
