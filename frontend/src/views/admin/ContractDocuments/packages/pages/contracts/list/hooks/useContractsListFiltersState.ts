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

  const [search, setSearch] = useState(initialListFiltersRef.current.search);
  const [managerFilter, setManagerFilter] = useState(initialListFiltersRef.current.managerFilter);
  const [statusFilters, setStatusFilters] = useState<string[]>(
    initialListFiltersRef.current.statusFilters
  );
  const [directionFilters, setDirectionFilters] = useState<string[]>(
    initialListFiltersRef.current.directionFilters
  );
  const [listScope, setListScopeState] = useState<ContractsListScope>(
    initialListFiltersRef.current.listScope
  );
  const [scopeTouched, setScopeTouched] = useState(initialListFiltersRef.current.scopeTouched);
  const [dateFrom, setDateFrom] = useState(initialListFiltersRef.current.dateFrom);
  const [dateTo, setDateTo] = useState(initialListFiltersRef.current.dateTo);
  const [listSortBy, setListSortBy] = useState<ContractsListSortBy>(
    initialListFiltersRef.current.sortBy
  );
  const [listSortOrder, setListSortOrder] = useState<ContractsListSortOrder>(
    initialListFiltersRef.current.sortOrder
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<ContractsPageLimit>(initialListFiltersRef.current.pageLimit);
  const effectiveLimit = (isNarrowViewport ? ADMIN_MOBILE_PAGE_LIMIT : limit) as ContractsPageLimit;
  const [listViewMode, setListViewMode] = useState<ContractsListViewMode>(
    initialListFiltersRef.current.listViewMode
  );
  const [expandedObjectId, setExpandedObjectId] = useState<string | null>(null);

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
    setStatusFilters(row?.statusFilters ?? []);
    setScopeTouched(true);
  }, []);

  const applyFiltersSnapshot = useCallback((next: ContractsListFiltersPersisted) => {
    setSearch(next.search);
    setManagerFilter(next.managerFilter);
    setStatusFilters([...next.statusFilters]);
    setDirectionFilters([...next.directionFilters]);
    setListScopeState(next.listScope);
    setScopeTouched(true);
    setDateFrom(next.dateFrom);
    setDateTo(next.dateTo);
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
    ]
  );

  useEffect(() => {
    const saved = reloadContractsListFiltersFromStorage();
    setSearch(saved.search);
    setManagerFilter(saved.managerFilter);
    setStatusFilters(saved.statusFilters);
    setDirectionFilters(saved.directionFilters);
    setListScopeState(saved.listScope);
    setScopeTouched(saved.scopeTouched);
    setDateFrom(saved.dateFrom);
    setDateTo(saved.dateTo);
    setListSortBy(saved.sortBy);
    setListSortOrder(saved.sortOrder);
    setLimit(saved.pageLimit);
    setListViewMode(saved.listViewMode);
    listFiltersHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!listFiltersHydratedRef.current) return;
    if (scopeTouched || roleDefaultsAppliedRef.current) return;
    if (!currentUserRole) return;
    const defaults = getContractsListRoleDefaults(currentUserRole);
    setListScopeState(defaults.listScope);
    setStatusFilters(defaults.statusFilters);
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
