'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type OdpzhScheduleDirection,
  type OdpzhScheduleRow,
  type OdpzhScheduleStatus,
  getOdpzhSchedules,
} from '@/shared/api/crm/admin-odpzh-schedules';
import { useAdminListPagination } from '@/views/admin/CRM/shared/list-pagination';

const FILTERS_STORAGE_KEY = 'admin_odpzh_schedules_filters';
const VIEW_MODE_STORAGE_KEY = 'admin_odpzh_schedules_view_mode';
const PAGINATION_STORAGE_KEY = 'admin_odpzh_schedules_pagination';

export type OdpzhSchedulesViewMode = 'list' | 'timeline';

export type OdpzhScheduleStatusFilter = OdpzhScheduleStatus | 'ALL';

function readStoredViewMode(): OdpzhSchedulesViewMode {
  if (typeof window === 'undefined') return 'list';
  try {
    return localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'timeline' ? 'timeline' : 'list';
  } catch {
    return 'list';
  }
}

type StoredFilters = {
  statusFilter: OdpzhScheduleStatusFilter;
  directionFilter: OdpzhScheduleDirection | 'ALL';
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

export function useOdpzhSchedulesPage() {
  const [stored] = useState(readStoredFilters);
  const [statusFilter, setStatusFilterState] = useState<OdpzhScheduleStatusFilter>(
    stored.statusFilter ?? 'ALL'
  );
  const [directionFilter, setDirectionFilterState] = useState<OdpzhScheduleDirection | 'ALL'>(
    stored.directionFilter ?? 'ALL'
  );
  const [search, setSearchState] = useState(stored.search ?? '');
  const [viewMode, setViewModeState] = useState<OdpzhSchedulesViewMode>(() => readStoredViewMode());
  const [items, setItems] = useState<OdpzhScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getOdpzhSchedules({ search: search.trim() || undefined }));
    } catch (err) {
      setItems([]);
      setMessage(err instanceof Error ? err.message : 'Не удалось загрузить план-график ОДПЖ');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ statusFilter, directionFilter, search })
      );
    } catch {
      /* ignore */
    }
  }, [statusFilter, directionFilter, search]);

  const statusCounts = useMemo(() => {
    let NEW = 0;
    let IN_PROGRESS = 0;
    let INSTALLATIONS_DONE = 0;
    let CLOSED = 0;
    for (const i of items) {
      if (i.status === 'NEW') NEW++;
      else if (i.status === 'IN_PROGRESS') IN_PROGRESS++;
      else if (i.status === 'INSTALLATIONS_DONE') INSTALLATIONS_DONE++;
      else CLOSED++;
    }
    return { ALL: items.length, NEW, IN_PROGRESS, INSTALLATIONS_DONE, CLOSED };
  }, [items]);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (i) =>
          (statusFilter === 'ALL' || i.status === statusFilter) &&
          (directionFilter === 'ALL' || i.kind === directionFilter)
      ),
    [items, statusFilter, directionFilter]
  );

  const { page, setPage, limit, setLimit, pagedItems } = useAdminListPagination(visibleItems, {
    loading,
    storageKey: PAGINATION_STORAGE_KEY,
  });

  /** Таймлайн доступен для «Новых договоров» и «В работе»; закрытые — только списком. */
  const setViewMode = (mode: OdpzhSchedulesViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    if (mode === 'timeline' && statusFilter === 'CLOSED') {
      setStatusFilter('IN_PROGRESS');
    }
  };

  /** Смена фильтра возвращает список на первую страницу. */
  const setStatusFilter = useCallback(
    (value: OdpzhScheduleStatusFilter) => {
      setStatusFilterState(value);
      setPage(1);
    },
    [setPage]
  );

  const setDirectionFilter = useCallback(
    (value: OdpzhScheduleDirection | 'ALL') => {
      setDirectionFilterState(value);
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

  return {
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    directionFilter,
    setDirectionFilter,
    search,
    setSearch,
    items: visibleItems,
    /** Записи текущей страницы списка (срез items под пагинацию). */
    pagedItems,
    page,
    setPage,
    /** Записей на странице списка (пагинация). */
    limit,
    setLimit,
    loading,
    message,
    setMessage,
    statusCounts,
    refresh,
  };
}

export type OdpzhSchedulesPageModel = ReturnType<typeof useOdpzhSchedulesPage>;
