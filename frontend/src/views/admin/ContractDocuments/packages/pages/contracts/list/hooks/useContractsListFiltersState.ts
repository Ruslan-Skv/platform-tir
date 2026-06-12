import { useCallback, useEffect, useRef, useState } from 'react';

import type { PackageListPipelineStatus } from '../../../../platform/hub/pipeline/packagePipeline';
import {
  type ContractsListViewMode,
  type ContractsPageLimit,
  loadContractsListFilters,
  persistContractsListFilters,
  reloadContractsListFiltersFromStorage,
} from '../contractsListFilters';
import type { ContractsListSortBy, ContractsListSortOrder } from '../contractsListSort';
import { normalizeContractsListSearch } from '../contractsListUtils';

export function useContractsListFiltersState() {
  const initialListFiltersRef = useRef(loadContractsListFilters());
  const listFiltersHydratedRef = useRef(false);
  const skipListFiltersPersistRef = useRef(true);

  const [search, setSearch] = useState(initialListFiltersRef.current.search);
  const [managerFilter, setManagerFilter] = useState(initialListFiltersRef.current.managerFilter);
  const [statusFilter, setStatusFilter] = useState<'' | PackageListPipelineStatus>(
    initialListFiltersRef.current.statusFilter as '' | PackageListPipelineStatus
  );
  const [directionFilter, setDirectionFilter] = useState(
    initialListFiltersRef.current.directionFilter
  );
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
  const [listViewMode, setListViewMode] = useState<ContractsListViewMode>(
    initialListFiltersRef.current.listViewMode
  );
  const [expandedObjectId, setExpandedObjectId] = useState<string | null>(null);

  const searchNorm = normalizeContractsListSearch(search);
  const hasActiveFilters = Boolean(
    searchNorm || managerFilter || statusFilter || directionFilter || dateFrom || dateTo
  );

  useEffect(() => {
    const saved = reloadContractsListFiltersFromStorage();
    setSearch(saved.search);
    setManagerFilter(saved.managerFilter);
    setStatusFilter(saved.statusFilter as '' | PackageListPipelineStatus);
    setDirectionFilter(saved.directionFilter);
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
    if (skipListFiltersPersistRef.current) {
      skipListFiltersPersistRef.current = false;
      return;
    }
    persistContractsListFilters({
      search,
      managerFilter,
      statusFilter,
      directionFilter,
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
    statusFilter,
    directionFilter,
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
    statusFilter,
    setStatusFilter,
    directionFilter,
    setDirectionFilter,
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
    listViewMode,
    setListViewMode,
    expandedObjectId,
    setExpandedObjectId,
    searchNorm,
    hasActiveFilters,
    handleListSortChange,
  };
}
