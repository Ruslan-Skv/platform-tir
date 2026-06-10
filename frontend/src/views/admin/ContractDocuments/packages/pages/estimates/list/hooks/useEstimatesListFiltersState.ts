import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type EstimatesListViewMode,
  type EstimatesPageLimit,
  loadEstimatesListFilters,
  persistEstimatesListFilters,
  reloadEstimatesListFiltersFromStorage,
} from '../estimatesListFilters';
import { type EstimatesListSortBy, type EstimatesListSortOrder } from '../estimatesListSort';
import { normalizeEstimatesListSearch } from '../estimatesListUtils';

export function useEstimatesListFiltersState(archiveView: boolean) {
  const initialListFiltersRef = useRef(loadEstimatesListFilters());
  const listFiltersHydratedRef = useRef(false);
  const skipListFiltersPersistRef = useRef(true);

  const [search, setSearch] = useState(initialListFiltersRef.current.search);
  const [managerFilter, setManagerFilter] = useState(initialListFiltersRef.current.managerFilter);
  const [listViewMode, setListViewMode] = useState<EstimatesListViewMode>(
    initialListFiltersRef.current.listViewMode
  );
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
  const hasActiveListFilters = Boolean(searchNorm || managerFilter || dateFrom || dateTo);

  useEffect(() => {
    const saved = reloadEstimatesListFiltersFromStorage();
    setSearch(saved.search);
    setManagerFilter(saved.managerFilter);
    setListViewMode(saved.listViewMode);
    setDateFrom(saved.dateFrom);
    setDateTo(saved.dateTo);
    setListSortBy(saved.sortBy);
    setListSortOrder(saved.sortOrder);
    setLimit(saved.pageLimit);
    setExpandedAddressKey(saved.expandedAddressKey);
    listFiltersHydratedRef.current = true;
  }, []);

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
