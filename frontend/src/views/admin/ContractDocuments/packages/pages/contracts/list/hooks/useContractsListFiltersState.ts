import { useCallback, useEffect, useRef, useState } from 'react';

import { ADMIN_MOBILE_PAGE_LIMIT, useAdminNarrowViewport } from '@/shared/lib/hooks';

import {
  type ContractsListScope,
  type ContractsListViewMode,
  type ContractsPageLimit,
  loadContractsListFilters,
  persistContractsListFilters,
  reloadContractsListFiltersFromStorage,
} from '../contractsListFilters';
import {
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
  const [expandedObjectIds, setExpandedObjectIds] = useState<string[]>(
    initialListFiltersRef.current.expandedObjectIds
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
    setExpandedObjectIds(saved.expandedObjectIds);
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
      expandedObjectIds,
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
    expandedObjectIds,
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

  /** Раскрытие объектов независимо друг от друга (режим by_object). */
  const toggleExpandedObjectId = useCallback((objectId: string) => {
    setExpandedObjectIds((current) =>
      current.includes(objectId) ? current.filter((id) => id !== objectId) : [...current, objectId]
    );
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
    expandedObjectIds,
    setExpandedObjectIds,
    toggleExpandedObjectId,
    searchNorm,
    hasActiveFilters,
    handleListSortChange,
  };
}
