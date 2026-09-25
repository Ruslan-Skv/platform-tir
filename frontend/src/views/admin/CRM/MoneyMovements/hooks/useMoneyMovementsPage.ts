'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/features/auth/context/AuthContext';
import {
  type IncassationCashBalance,
  type ManagerIncassation,
  type MoneyMovement,
  type MoneyMovementListResponse,
  type MoneyMovementManagerOption,
  createManagerIncassation,
  createManualMoneyMovement,
  getIncassationCashBalance,
  getManagerIncassations,
  getMoneyMovements,
  updateManualMoneyMovement,
} from '@/shared/api/crm/admin-money-movements';

import {
  type DpEntryKind,
  type DpListScope,
  type DpTotalsMode,
  defaultDpFilters,
  loadDpFilters,
  persistDpFilters,
} from '../money-movements-filters';
import {
  DP_DEFAULT_PAGE_LIMIT,
  type DpPageLimit,
  monthBoundsIso,
  toLocalIsoDate,
  todayIsoDate,
} from '../money-movements-page.constants';

const SEARCH_DEBOUNCE_MS = 400;

export function useMoneyMovementsPage() {
  const { user } = useAuth();
  /** Правка ручных записей — только супер-админ (роль проверяется и на бэкенде). */
  const canEditManualEntries = user?.role === 'SUPER_ADMIN';

  // Страница рендерится с ssr: false — читаем сохранённые фильтры сразу при монтировании.
  const initialFiltersRef = useRef(loadDpFilters());
  const filtersPersistedRef = useRef(false);

  const [dateFrom, setDateFrom] = useState(initialFiltersRef.current.dateFrom);
  const [dateTo, setDateTo] = useState(initialFiltersRef.current.dateTo);
  const [managerId, setManagerId] = useState(initialFiltersRef.current.managerId);
  const [scope, setScopeState] = useState<DpListScope>(initialFiltersRef.current.scope);
  const [direction, setDirection] = useState(initialFiltersRef.current.direction);
  const [paymentForm, setPaymentForm] = useState(initialFiltersRef.current.paymentForm);
  const [entryKind, setEntryKindState] = useState<DpEntryKind>(initialFiltersRef.current.entryKind);
  /** Режим панели итогов за период: по направлениям или по менеджерам. */
  const [totalsMode, setTotalsModeState] = useState<DpTotalsMode>(
    initialFiltersRef.current.totalsMode
  );
  const [searchInput, setSearchInput] = useState(initialFiltersRef.current.search);
  const [search, setSearch] = useState(initialFiltersRef.current.search);
  const [page, setPage] = useState(initialFiltersRef.current.page);
  /** Записей на странице — выбор пользователя, сохраняется между визитами. */
  const [limit, setLimitState] = useState<DpPageLimit>(initialFiltersRef.current.pageLimit);
  const [items, setItems] = useState<MoneyMovement[]>([]);
  const [managers, setManagers] = useState<MoneyMovementManagerOption[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSum, setTotalSum] = useState(0);
  /** Итоги по направлениям за выбранный период — блок итогов над фильтрами. */
  const [directionSums, setDirectionSums] = useState<MoneyMovementListResponse['directionSums']>(
    []
  );
  /** Итоги по менеджерам за выбранный период — графики детальной статистики. */
  const [managerSums, setManagerSums] = useState<MoneyMovementListResponse['managerSums']>([]);
  /** Итоги «направление × менеджер» — лидеры внутри каждого направления. */
  const [directionManagerSums, setDirectionManagerSums] = useState<
    MoneyMovementListResponse['directionManagerSums']
  >([]);
  /** Наличные менеджеров к инкассации на текущий момент — плитки менеджеров в итогах. */
  const [managerCashBalances, setManagerCashBalances] = useState<
    MoneyMovementListResponse['managerCashBalances']
  >([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Инкассации: история, модалки и остаток наличных текущего менеджера.
  const [incassations, setIncassations] = useState<ManagerIncassation[]>([]);
  const [incassationModalOpen, setIncassationModalOpen] = useState(false);
  const [incassationHistoryOpen, setIncassationHistoryOpen] = useState(false);
  const [cashBalance, setCashBalance] = useState<IncassationCashBalance | null>(null);
  const [cashBalanceLoading, setCashBalanceLoading] = useState(false);
  const [incassationSubmitting, setIncassationSubmitting] = useState(false);

  // Ручная запись (проводка): изъятие/внесение в кассу; для супер-админа — и правка существующих.
  const [manualEntryModalOpen, setManualEntryModalOpen] = useState(false);
  const [manualEntrySubmitting, setManualEntrySubmitting] = useState(false);
  /** Запись в режиме правки; null — модалка открыта для создания новой проводки. */
  const [editingEntry, setEditingEntry] = useState<MoneyMovement | null>(null);

  // Сохраняем выбранное состояние фильтров между визитами страницы.
  useEffect(() => {
    if (!filtersPersistedRef.current) {
      filtersPersistedRef.current = true;
      return;
    }
    persistDpFilters({
      scope,
      managerId,
      direction,
      paymentForm,
      entryKind,
      totalsMode,
      search,
      dateFrom,
      dateTo,
      page,
      pageLimit: limit,
    });
  }, [
    scope,
    managerId,
    direction,
    paymentForm,
    entryKind,
    totalsMode,
    search,
    dateFrom,
    dateTo,
    page,
    limit,
  ]);

  // Если сохранённый менеджер исчез из справочника карточек — сбрасываем выбор.
  useEffect(() => {
    if (scope === 'mine' || !managerId || managers.length === 0) return;
    if (managers.some((m) => m.id === managerId)) return;
    setManagerId('');
  }, [managers, managerId, scope]);

  // Отдельный дебаунс для поиска: не дёргаем API на каждый символ
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
      const response = await getMoneyMovements({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        scope,
        managerId: scope === 'mine' ? undefined : managerId || undefined,
        direction: direction || undefined,
        paymentForm: paymentForm || undefined,
        entryKind: entryKind || undefined,
        search: search || undefined,
        page,
        limit,
      });
      setItems(response.data);
      setManagers(response.managers);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setTotalSum(response.totalSum);
      setDirectionSums(response.directionSums);
      setManagerSums(response.managerSums);
      setDirectionManagerSums(response.directionManagerSums);
      setManagerCashBalances(response.managerCashBalances);
    } catch (error) {
      setItems([]);
      setManagers([]);
      setTotal(0);
      setTotalPages(1);
      setTotalSum(0);
      setDirectionSums([]);
      setManagerSums([]);
      setDirectionManagerSums([]);
      setManagerCashBalances([]);
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить журнал ДП');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, managerId, scope, direction, paymentForm, entryKind, search, page, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // После смены фильтров/размера страницы текущая страница может стать лишней — возвращаем на последнюю существующую.
  useEffect(() => {
    if (loading || totalPages === 0 || page <= totalPages) return;
    setPage(totalPages);
  }, [loading, totalPages, page]);

  const loadIncassations = useCallback(async () => {
    try {
      setIncassations(await getManagerIncassations());
    } catch {
      // история инкассаций не критична для журнала — не мешаем работе страницы
    }
  }, []);

  useEffect(() => {
    void loadIncassations();
  }, [loadIncassations]);

  /** Остаток наличных менеджера; без id — текущий пользователь (он же дефолт в селекте). */
  const loadCashBalance = useCallback(async (managerId?: string) => {
    setCashBalance(null);
    setCashBalanceLoading(true);
    try {
      setCashBalance(await getIncassationCashBalance(managerId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить остаток наличных');
    } finally {
      setCashBalanceLoading(false);
    }
  }, []);

  const openIncassationModal = useCallback(async () => {
    setIncassationModalOpen(true);
    await loadCashBalance();
  }, [loadCashBalance]);

  const closeIncassationModal = useCallback(() => setIncassationModalOpen(false), []);

  const openIncassationHistory = useCallback(() => {
    setIncassationHistoryOpen(true);
    void loadIncassations();
  }, [loadIncassations]);

  const closeIncassationHistory = useCallback(() => setIncassationHistoryOpen(false), []);

  const openManualEntryModal = useCallback(async () => {
    setEditingEntry(null);
    setManualEntryModalOpen(true);
    // Дефолтный менеджер в селекте — текущий пользователь (managerId из ответа баланса).
    await loadCashBalance();
  }, [loadCashBalance]);

  /** Правка ручной записи — только супер-админ (кнопка-карандаш в строке журнала). */
  const openManualEntryEditModal = useCallback(
    async (entry: MoneyMovement) => {
      setEditingEntry(entry);
      setManualEntryModalOpen(true);
      await loadCashBalance();
    },
    [loadCashBalance]
  );

  const closeManualEntryModal = useCallback(() => {
    setManualEntryModalOpen(false);
    setEditingEntry(null);
  }, []);

  const submitManualEntry = useCallback(
    async (data: Parameters<typeof createManualMoneyMovement>[0]) => {
      setManualEntrySubmitting(true);
      try {
        if (editingEntry) {
          await updateManualMoneyMovement(editingEntry.id, data);
        } else {
          await createManualMoneyMovement(data);
        }
        setManualEntryModalOpen(false);
        setEditingEntry(null);
        await refresh();
      } finally {
        setManualEntrySubmitting(false);
      }
    },
    [editingEntry, refresh]
  );

  const submitIncassation = useCallback(
    async (data: {
      managerId?: string;
      onBehalfOfId?: string;
      amount: number;
      incassator: string;
      performedAt: string;
      notes?: string;
    }) => {
      setIncassationSubmitting(true);
      try {
        await createManagerIncassation(data);
        setIncassationModalOpen(false);
        await Promise.all([refresh(), loadIncassations()]);
      } finally {
        setIncassationSubmitting(false);
      }
    },
    [refresh, loadIncassations]
  );

  const resetFilters = useCallback(() => {
    const fresh = defaultDpFilters();
    setDateFrom(fresh.dateFrom);
    setDateTo(fresh.dateTo);
    setManagerId('');
    setScopeState('all');
    setDirection('');
    setPaymentForm('');
    setEntryKindState('');
    setTotalsModeState('direction');
    setSearchInput('');
    setLimitState(DP_DEFAULT_PAGE_LIMIT);
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
    managerId,
    setManagerId: (value: string) => {
      setManagerId(value);
      setPage(1);
    },
    scope,
    setScope: (value: DpListScope) => {
      setScopeState(value);
      setPage(1);
    },
    direction,
    setDirection: (value: string) => {
      setDirection(value);
      setPage(1);
    },
    paymentForm,
    setPaymentForm: (value: string) => {
      setPaymentForm(value);
      setPage(1);
    },
    entryKind,
    setEntryKind: (value: DpEntryKind) => {
      setEntryKindState(value);
      setPage(1);
    },
    totalsMode,
    /** Меняет только отображение панели итогов — перезапроса и сброса страницы не требует. */
    setTotalsMode: (value: DpTotalsMode) => {
      setTotalsModeState(value);
    },
    searchInput,
    setSearchInput,
    page,
    setPage,
    /** Записей на странице (пагинация журнала). */
    limit,
    /** Смена размера страницы возвращает на первую страницу. */
    setLimit: (value: DpPageLimit) => {
      setLimitState(value);
      setPage(1);
    },
    items,
    managers,
    total,
    totalPages,
    totalSum,
    directionSums,
    managerSums,
    directionManagerSums,
    managerCashBalances,
    loading,
    message,
    setMessage,
    refresh,
    resetFilters,
    setPeriod,
    incassations,
    loadIncassations,
    incassationModalOpen,
    openIncassationModal,
    closeIncassationModal,
    incassationHistoryOpen,
    openIncassationHistory,
    closeIncassationHistory,
    cashBalance,
    cashBalanceLoading,
    loadCashBalance,
    incassationSubmitting,
    submitIncassation,
    manualEntryModalOpen,
    openManualEntryModal,
    closeManualEntryModal,
    manualEntrySubmitting,
    submitManualEntry,
    /** true — текущий пользователь супер-админ: показывает кнопки правки ручных записей. */
    canEditManualEntries,
    editingEntry,
    openManualEntryEditModal,
  };
}

export type MoneyMovementsPageModel = ReturnType<typeof useMoneyMovementsPage>;
