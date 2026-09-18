import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ADMIN_MOBILE_PAGE_LIMIT, useAdminNarrowViewport } from '@/shared/lib/hooks';

import {
  type ContractsListFiltersPersisted,
  type ContractsListScope,
  type ContractsListViewMode,
  type ContractsPageLimit,
  loadContractsListFilters,
  persistContractsListFilters,
  reloadContractsListFiltersFromStorage,
} from '../contractsListFilters';
import {
  CONTRACTS_LIST_QUEUE_PRESETS,
  type ContractsListQueuePreset,
  getContractsListRoleDefaults,
  resolveContractsListQueuePreset,
} from '../contractsListScope';
import type { ContractsListSortBy, ContractsListSortOrder } from '../contractsListSort';
import { normalizeContractsListSearch } from '../contractsListUtils';

export function useContractsListFiltersState(currentUserRole: string | null | undefined) {
  const initialListFiltersRef = useRef(loadContractsListFilters());
  const listFiltersHydratedRef = useRef(false);
  const skipListFiltersPersistRef = useRef(true);
  const roleDefaultsAppliedRef = useRef(false);
  const isNarrowViewport = useAdminNarrowViewport();

  const [search, setSearchState] = useState(initialListFiltersRef.current.search);
  const [managerFilter, setManagerFilterState] = useState(
    initialListFiltersRef.current.managerFilter
  );
  const [statusFilters, setStatusFiltersState] = useState<string[]>(
    initialListFiltersRef.current.statusFilters
  );
  const [directionFilters, setDirectionFiltersState] = useState<string[]>(
    initialListFiltersRef.current.directionFilters
  );
  const [listScope, setListScopeState] = useState<ContractsListScope>(
    initialListFiltersRef.current.listScope
  );
  const [scopeTouched, setScopeTouched] = useState(initialListFiltersRef.current.scopeTouched);
  const [dateFrom, setDateFromState] = useState(initialListFiltersRef.current.dateFrom);
  const [dateTo, setDateToState] = useState(initialListFiltersRef.current.dateTo);
  const [listSortBy, setListSortBy] = useState<ContractsListSortBy>(
    initialListFiltersRef.current.sortBy
  );
  const [listSortOrder, setListSortOrder] = useState<ContractsListSortOrder>(
    initialListFiltersRef.current.sortOrder
  );
  const [page, setPage] = useState(initialListFiltersRef.current.page);
  const [limit, setLimit] = useState<ContractsPageLimit>(initialListFiltersRef.current.pageLimit);
  const effectiveLimit = (isNarrowViewport ? ADMIN_MOBILE_PAGE_LIMIT : limit) as ContractsPageLimit;
  const [listViewMode, setListViewMode] = useState<ContractsListViewMode>(
    initialListFiltersRef.current.listViewMode
  );
  const [expandedObjectId, setExpandedObjectId] = useState<string | null>(
    initialListFiltersRef.current.expandedObjectId
  );

  const searchNorm = normalizeContractsListSearch(search);
  const queuePreset = resolveContractsListQueuePreset(statusFilters);
  const hasActiveFilters = Boolean(
    searchNorm ||
    managerFilter ||
    statusFilters.length > 0 ||
    directionFilters.length > 0 ||
    dateFrom ||
    dateTo ||
    listScope !== 'all'
  );

  const setListScope = useCallback((scope: ContractsListScope) => {
    setListScopeState(scope);
    setScopeTouched(true);
  }, []);

  const applyQueuePreset = useCallback((preset: ContractsListQueuePreset) => {
    const row = CONTRACTS_LIST_QUEUE_PRESETS.find((p) => p.id === preset);
    setStatusFiltersState(row?.statusFilters ?? []);
    setScopeTouched(true);
  }, []);

  const applyFiltersSnapshot = useCallback((next: ContractsListFiltersPersisted) => {
    setSearchState(next.search);
    setManagerFilterState(next.managerFilter);
    setStatusFiltersState([...next.statusFilters]);
    setDirectionFiltersState([...next.directionFilters]);
    setListScopeState(next.listScope);
    setScopeTouched(true);
    setDateFromState(next.dateFrom);
    setDateToState(next.dateTo);
    setListSortBy(next.sortBy);
    setListSortOrder(next.sortOrder);
    setLimit(next.pageLimit);
    setListViewMode(next.listViewMode);
    setPage(1);
    setExpandedObjectId(null);
    roleDefaultsAppliedRef.current = true;
  }, []);

  const currentFiltersSnapshot = useMemo(
    (): ContractsListFiltersPersisted => ({
      search,
      managerFilter,
      statusFilters,
      directionFilters,
      listScope,
      scopeTouched: true,
      dateFrom,
      dateTo,
      sortBy: listSortBy,
      sortOrder: listSortOrder,
      pageLimit: limit,
      listViewMode,
      expandedObjectId,
      page,
    }),
    [
      search,
      managerFilter,
      statusFilters,
      directionFilters,
      listScope,
      dateFrom,
      dateTo,
      listSortBy,
      listSortOrder,
      limit,
      listViewMode,
      expandedObjectId,
      page,
    ]
  );

  useEffect(() => {
    const saved = reloadContractsListFiltersFromStorage();
    setSearchState(saved.search);
    setManagerFilterState(saved.managerFilter);
    setStatusFiltersState(saved.statusFilters);
    setDirectionFiltersState(saved.directionFilters);
    setListScopeState(saved.listScope);
    setScopeTouched(saved.scopeTouched);
    setDateFromState(saved.dateFrom);
    setDateToState(saved.dateTo);
    setListSortBy(saved.sortBy);
    setListSortOrder(saved.sortOrder);
    setLimit(saved.pageLimit);
    setListViewMode(saved.listViewMode);
    setPage(saved.page);
    setExpandedObjectId(saved.expandedObjectId);
    listFiltersHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!listFiltersHydratedRef.current) return;
    if (scopeTouched || roleDefaultsAppliedRef.current) return;
    if (!currentUserRole) return;
    const defaults = getContractsListRoleDefaults(currentUserRole);
    setListScopeState(defaults.listScope);
    setStatusFiltersState(defaults.statusFilters);
    setScopeTouched(true);
    roleDefaultsAppliedRef.current = true;
  }, [currentUserRole, scopeTouched]);

  useEffect(() => {
    if (!listFiltersHydratedRef.current) return;
    if (skipListFiltersPersistRef.current) {
      skipListFiltersPersistRef.current = false;
      return;
    }
    persistContractsListFilters({
      search,
      managerFilter,
      statusFilters,
      directionFilters,
      listScope,
      scopeTouched,
      dateFrom,
      dateTo,
      sortBy: listSortBy,
      sortOrder: listSortOrder,
      pageLimit: limit,
      listViewMode,
      expandedObjectId,
      page,
    });
  }, [
    search,
    managerFilter,
    statusFilters,
    directionFilters,
    listScope,
    scopeTouched,
    dateFrom,
    dateTo,
    listSortBy,
    listSortOrder,
    limit,
    listViewMode,
    expandedObjectId,
    page,
  ]);

  const handleListSortChange = useCallback(
    (column: ContractsListSortBy) => {
      if (listSortBy === column) {
        setListSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setListSortBy(column);
        setListSortOrder('asc');
      }
    },
    [listSortBy]
  );

  // Любое изменение фильтра пользователем фиксирует его выбор: иначе при возврате
  // на страницу ролевые дефолты снова применятся и перезапишут сохранённые чипы.
  const setSearch = useCallback((next: string) => {
    setSearchState(next);
    setScopeTouched(true);
  }, []);

  const setManagerFilter = useCallback((next: string) => {
    setManagerFilterState(next);
    setScopeTouched(true);
  }, []);

  const setStatusFilters = useCallback((next: string[]) => {
    setStatusFiltersState(next);
    setScopeTouched(true);
  }, []);

  const setDirectionFilters = useCallback((next: string[] | ((prev: string[]) => string[])) => {
    setDirectionFiltersState(next);
    setScopeTouched(true);
  }, []);

  const setDateFrom = useCallback((next: string) => {
    setDateFromState(next);
    setScopeTouched(true);
  }, []);

  const setDateTo = useCallback((next: string) => {
    setDateToState(next);
    setScopeTouched(true);
  }, []);

  return {
    search,
    setSearch,
    managerFilter,
    setManagerFilter,
    statusFilters,
    setStatusFilters,
    directionFilters,
    setDirectionFilters,
    listScope,
    setListScope,
    queuePreset,
    applyQueuePreset,
    applyFiltersSnapshot,
    currentFiltersSnapshot,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    listSortBy,
    listSortOrder,
    page,
    setPage,
    limit: effectiveLimit,
    setLimit,
    listViewMode,
    setListViewMode,
    expandedObjectId,
    setExpandedObjectId,
    searchNorm,
    hasActiveFilters,
    handleListSortChange,
  };
}
