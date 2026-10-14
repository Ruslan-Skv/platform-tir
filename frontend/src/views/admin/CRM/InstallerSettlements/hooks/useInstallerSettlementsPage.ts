'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import type { InstallerMaster } from '@/shared/api/admin-crm';
import { getInstallers } from '@/shared/api/admin-crm';
import {
  type CreateInstallerSettlementAdvanceParams,
  type InstallerSettlementAdvance,
  type InstallerSettlementOption,
  type InstallerSettlementsListResponse,
  createInstallerSettlementAdvance,
  getInstallerSettlements,
  searchInstallerSettlementPackages,
} from '@/shared/api/crm/admin-installer-settlements';

import {
  defaultIsFilters,
  loadIsFilters,
  persistIsFilters,
} from '../installer-settlements-filters';
import {
  IS_DEFAULT_PAGE_LIMIT,
  type IsPageLimit,
  monthBoundsIso,
  toLocalIsoDate,
  todayIsoDate,
} from '../installer-settlements-page.constants';

const SEARCH_DEBOUNCE_MS = 400;

export function useInstallerSettlementsPage() {
  const { user } = useAuth();
  /** Выдавать авансы может только супер-админ (роль проверяется и на бэкенде). */
  const canManageAdvances = user?.role === 'SUPER_ADMIN';

  // Страница рендерится с ssr: false — читаем сохранённые фильтры сразу при монтировании.
  const initialFiltersRef = useRef(loadIsFilters());
  const filtersPersistedRef = useRef(false);

  const [dateFrom, setDateFrom] = useState(initialFiltersRef.current.dateFrom);
  const [dateTo, setDateTo] = useState(initialFiltersRef.current.dateTo);
  const [installerId, setInstallerId] = useState(initialFiltersRef.current.installerId);
  const [direction, setDirection] = useState(initialFiltersRef.current.direction);
  const [searchInput, setSearchInput] = useState(initialFiltersRef.current.search);
  const [search, setSearch] = useState(initialFiltersRef.current.search);
  const [page, setPage] = useState(initialFiltersRef.current.page);
  /** Записей на странице — выбор пользователя, сохраняется между визитами. */
  const [limit, setLimitState] = useState<IsPageLimit>(initialFiltersRef.current.pageLimit);

  const [items, setItems] = useState<InstallerSettlementAdvance[]>([]);
  const [installers, setInstallers] = useState<InstallerSettlementOption[]>([]);
  const [masters, setMasters] = useState<InstallerSettlementsListResponse['masters']>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPaidInPeriod, setTotalPaidInPeriod] = useState(0);
  const [directionSums, setDirectionSums] = useState<
    InstallerSettlementsListResponse['directionSums']
  >([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Сохраняем выбранное состояние фильтров между визитами страницы.
  useEffect(() => {
    if (!filtersPersistedRef.current) {
      filtersPersistedRef.current = true;
      return;
    }
    persistIsFilters({
      installerId,
      direction,
      search,
      dateFrom,
      dateTo,
      page,
      pageLimit: limit,
    });
  }, [installerId, direction, search, dateFrom, dateTo, page, limit]);

  // Если сохранённый мастер исчез из журнала и справочника — сбрасываем выбор.
  useEffect(() => {
    if (!installerId || installers.length === 0) return;
    if (installers.some((i) => i.id === installerId)) return;
    setInstallerId('');
  }, [installers, installerId]);

  // Отдельный дебаунс для поиска: не дёргаем API на каждый символ.
  const searchTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, [searchInput]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getInstallerSettlements({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        installerId: installerId || undefined,
        direction: direction || undefined,
        search: search || undefined,
        page,
        limit,
      });
      setItems(response.data);
      setInstallers(response.installers);
      setMasters(response.masters);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setTotalPaidInPeriod(response.totalPaidInPeriod);
      setDirectionSums(response.directionSums);
    } catch (error) {
      setItems([]);
      setInstallers([]);
      setMasters([]);
      setTotal(0);
      setTotalPages(1);
      setTotalPaidInPeriod(0);
      setDirectionSums([]);
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить расчёт мастеров');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, installerId, direction, search, page, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // После смены фильтров/размера страницы текущая страница может стать лишней —
  // возвращаем на последнюю существующую.
  useEffect(() => {
    if (loading || totalPages === 0 || page <= totalPages) return;
    setPage(totalPages);
  }, [loading, totalPages, page]);

  const resetFilters = useCallback(() => {
    const fresh = defaultIsFilters();
    setDateFrom(fresh.dateFrom);
    setDateTo(fresh.dateTo);
    setInstallerId('');
    setDirection('');
    setSearchInput('');
    setLimitState(IS_DEFAULT_PAGE_LIMIT);
    setPage(1);
  }, []);

  const setPeriod = useCallback((kind: 'today' | 'week' | 'month') => {
    const today = todayIsoDate();
    if (kind === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (kind === 'week') {
      const base = new Date(`${today}T00:00:00`);
      const to = new Date(base);
      to.setDate(to.getDate() + 6);
      setDateFrom(today);
      setDateTo(toLocalIsoDate(to));
    } else {
      const now = new Date();
      const bounds = monthBoundsIso(now.getFullYear(), now.getMonth());
      setDateFrom(bounds.from);
      setDateTo(bounds.to);
    }
    setPage(1);
  }, []);

  // Выдача аванса из раздела (супер-админ): та же запись, что в модалке
  // «Заказ-наряды» договора — справочник мастеров и поиск договоров для формы.
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);
  const [installersRegistry, setInstallersRegistry] = useState<InstallerMaster[]>([]);

  const openAdvanceModal = useCallback(() => {
    setAdvanceModalOpen(true);
    void getInstallers()
      .then(setInstallersRegistry)
      .catch(() => {
        // справочник не критичен: модалка покажет подсказку при выборе договора
      });
  }, []);

  const closeAdvanceModal = useCallback(() => {
    if (!advanceSubmitting) setAdvanceModalOpen(false);
  }, [advanceSubmitting]);

  const loadAdvancePackages = useCallback(async (searchValue: string) => {
    return searchInstallerSettlementPackages({ search: searchValue || undefined, limit: 15 });
  }, []);

  const submitAdvance = useCallback(
    async (data: CreateInstallerSettlementAdvanceParams) => {
      setAdvanceSubmitting(true);
      try {
        await createInstallerSettlementAdvance(data);
        setAdvanceModalOpen(false);
        await refresh();
      } finally {
        setAdvanceSubmitting(false);
      }
    },
    [refresh]
  );

  return {
    dateFrom,
    setDateFrom: (value: string) => {
      setDateFrom(value);
      setPage(1);
    },
    dateTo,
    setDateTo: (value: string) => {
      setDateTo(value);
      setPage(1);
    },
    installerId,
    setInstallerId: (value: string) => {
      setInstallerId(value);
      setPage(1);
    },
    direction,
    setDirection: (value: string) => {
      setDirection(value);
      setPage(1);
    },
    searchInput,
    setSearchInput,
    page,
    setPage,
    /** Записей на странице (пагинация журнала выплат). */
    limit,
    /** Смена размера страницы возвращает на первую страницу. */
    setLimit: (value: IsPageLimit) => {
      setLimitState(value);
      setPage(1);
    },
    items,
    installers,
    /** Сводка по мастерам: начислено / выплачено / остаток (переплата-недоплата). */
    masters,
    total,
    totalPages,
    /** Выдано авансов за выбранный период (по фильтрам журнала). */
    totalPaidInPeriod,
    directionSums,
    loading,
    message,
    setMessage,
    refresh,
    resetFilters,
    setPeriod,
    /** true — текущий пользователь супер-админ: показывает кнопку «+ Выплата». */
    canManageAdvances,
    /** Модалка выдачи аванса (супер-админ). */
    advanceModalOpen,
    openAdvanceModal,
    closeAdvanceModal,
    advanceSubmitting,
    submitAdvance,
    /** Справочник мастеров для формы выдачи (загружается при открытии модалки). */
    installersRegistry,
    /** Поиск договоров для формы выдачи аванса. */
    loadAdvancePackages,
  };
}

export type InstallerSettlementsPageModel = ReturnType<typeof useInstallerSettlementsPage>;
