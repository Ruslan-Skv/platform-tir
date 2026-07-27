import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type EstimatesListScope,
  type EstimatesListViewMode,
  type EstimatesPageLimit,
  loadEstimatesListFilters,
  persistEstimatesListFilters,
  reloadEstimatesListFiltersFromStorage,
} from '../estimatesListFilters';
import { getEstimatesListRoleDefaults } from '../estimatesListScope';
import { type EstimatesListSortBy, type EstimatesListSortOrder } from '../estimatesListSort';
import { normalizeEstimatesListSearch } from '../estimatesListUtils';

export function useEstimatesListFiltersState(
  archiveView: boolean,
  currentUserRole: string | null | undefined
) {
  const initialListFiltersRef = useRef(loadEstimatesListFilters());
  const listFiltersHydratedRef = useRef(false);
  const skipListFiltersPersistRef = useRef(true);
  const roleDefaultsAppliedRef = useRef(false);

  const [search, setSearch] = useState(initialListFiltersRef.current.search);
  const [managerFilter, setManagerFilter] = useState(initialListFiltersRef.current.managerFilter);
  const [listViewMode, setListViewMode] = useState<EstimatesListViewMode>(
    initialListFiltersRef.current.listViewMode
  );
  const [listScope, setListScopeState] = useState<EstimatesListScope>(
    initialListFiltersRef.current.listScope
  );
  const [scopeTouched, setScopeTouched] = useState(initialListFiltersRef.current.scopeTouched);
  const [dateFrom, setDateFrom] = useState(initialListFiltersRef.current.dateFrom);
  const [dateTo, setDateTo] = useState(initialListFiltersRef.current.dateTo);
  const [listSortBy, setListSortBy] = useState<EstimatesListSortBy>(
    initialListFiltersRef.current.sortBy
  );
  const [listSortOrder, setListSortOrder] = useState<EstimatesListSortOrder>(
    initialListFiltersRef.current.sortOrder
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<EstimatesPageLimit>(initialListFiltersRef.current.pageLimit);
  const [expandedAddressKey, setExpandedAddressKey] = useState<string | null>(
    initialListFiltersRef.current.expandedAddressKey
  );

  const searchNorm = normalizeEstimatesListSearch(search);
  const effectiveExpandedAddressKey = listViewMode === 'by_object' ? expandedAddressKey : null;
  const hasActiveListFilters = Boolean(
    searchNorm || managerFilter || dateFrom || dateTo || listScope !== 'all'
  );

  const setListScope = useCallback((scope: EstimatesListScope) => {
    setListScopeState(scope);
    setScopeTouched(true);
  }, []);

  useEffect(() => {
    const saved = reloadEstimatesListFiltersFromStorage();
    setSearch(saved.search);
    setManagerFilter(saved.managerFilter);
    setListViewMode(saved.listViewMode);
    setListScopeState(saved.listScope);
    setScopeTouched(saved.scopeTouched);
    setDateFrom(saved.dateFrom);
    setDateTo(saved.dateTo);
    setListSortBy(saved.sortBy);
    setListSortOrder(saved.sortOrder);
    setLimit(saved.pageLimit);
    setExpandedAddressKey(saved.expandedAddressKey);
    listFiltersHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (scopeTouched || roleDefaultsAppliedRef.current) return;
    if (!currentUserRole) return;
    const defaults = getEstimatesListRoleDefaults(currentUserRole);
    setListScopeState(defaults.listScope);
    roleDefaultsAppliedRef.current = true;
  }, [currentUserRole, scopeTouched]);

  const handleListSortChange = useCallback(
    (column: EstimatesListSortBy) => {
      if (listSortBy === column) {
        setListSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setListSortBy(column);
        setListSortOrder('asc');
      }
    },
    [listSortBy]
  );

  useEffect(() => {
    if (!listFiltersHydratedRef.current) return;
    if (skipListFiltersPersistRef.current) {
      skipListFiltersPersistRef.current = false;
      return;
    }
    persistEstimatesListFilters({
      search,
      managerFilter,
      dateFrom,
      dateTo,
      sortBy: listSortBy,
      sortOrder: listSortOrder,
      pageLimit: limit,
      listViewMode,
      listScope,
      scopeTouched,
      expandedAddressKey,
    });
  }, [
    search,
    managerFilter,
    dateFrom,
    dateTo,
    listSortBy,
    listSortOrder,
    limit,
    listViewMode,
    listScope,
    scopeTouched,
    expandedAddressKey,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    searchNorm,
    managerFilter,
    dateFrom,
    dateTo,
    listViewMode,
    listScope,
    listSortBy,
    listSortOrder,
    archiveView,
  ]);

  return {
    search,
    setSearch,
    managerFilter,
    setManagerFilter,
    listViewMode,
    setListViewMode,
    listScope,
    setListScope,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    listSortBy,
    listSortOrder,
    page,
    setPage,
    limit,
    setLimit,
    expandedAddressKey,
    setExpandedAddressKey,
    effectiveExpandedAddressKey,
    searchNorm,
    hasActiveListFilters,
    handleListSortChange,
  };
}
