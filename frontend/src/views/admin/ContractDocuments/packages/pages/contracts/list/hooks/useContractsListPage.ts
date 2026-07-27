import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/context/AuthContext';

import {
  type ContractsListColumnKey,
  loadContractsListVisibleColumns,
  persistContractsListVisibleColumns,
} from '../contractsListColumns';
import { useContractsListDerivedData } from './useContractsListDerivedData';
import { useContractsListFiltersState } from './useContractsListFiltersState';
import { useContractsListLoad } from './useContractsListLoad';
import { useContractsListModalsState } from './useContractsListModalsState';
import { useContractsListMutations } from './useContractsListMutations';
import { useContractsListSavedViews } from './useContractsListSavedViews';
import { useContractsListSyncEffects } from './useContractsListSyncEffects';

export function useContractsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumnsState] = useState<ContractsListColumnKey[]>(() =>
    loadContractsListVisibleColumns()
  );

  const setVisibleColumns = useCallback((next: ContractsListColumnKey[]) => {
    setVisibleColumnsState(next);
    persistContractsListVisibleColumns(next);
  }, []);

  useEffect(() => {
    setVisibleColumnsState(loadContractsListVisibleColumns());
  }, []);

  const handleLoadError = useCallback((message: string) => {
    setError(message);
  }, []);

  const filters = useContractsListFiltersState(user?.role);
  const load = useContractsListLoad(handleLoadError, {
    listScope: filters.listScope,
    currentUserId: user?.id ?? null,
    selectedDirectionIds: filters.directionFilters,
    statusFilters: filters.statusFilters,
    search: filters.search,
    managerFilter: filters.managerFilter,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    sortBy: filters.listSortBy,
    sortOrder: filters.listSortOrder,
    page: filters.page,
    limit: filters.limit,
  });
  const modals = useContractsListModalsState();

  const presetById = useMemo(
    () => new Map(load.estimatePresets.map((p) => [p.id, p])),
    [load.estimatePresets]
  );

  const objectsById = useMemo(
    () => new Map(load.documentObjects.map((o) => [o.id, o])),
    [load.documentObjects]
  );

  const derived = useContractsListDerivedData({
    rows: load.rows,
    serverTotal: load.total,
    serverCounts: load.counts,
    searchNorm: filters.searchNorm,
    managerFilter: filters.managerFilter,
    statusFilters: filters.statusFilters,
    directionFilters: filters.directionFilters,
    listScope: filters.listScope,
    currentUserId: user?.id ?? null,
    myDirectionIds: load.myDirectionIds,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    directions: load.directions,
    presetById,
    measurementsById: load.measurementsById,
    listSortBy: filters.listSortBy,
    listSortOrder: filters.listSortOrder,
    crmUsers: load.crmUsers,
    listViewMode: filters.listViewMode,
    documentObjects: load.documentObjects,
    objectsById,
    expandedObjectId: filters.expandedObjectId,
    page: filters.page,
    limit: filters.limit,
    visibleColumns,
  });

  useContractsListSyncEffects({
    searchNorm: filters.searchNorm,
    managerFilter: filters.managerFilter,
    statusFilters: filters.statusFilters,
    directionFilters: filters.directionFilters,
    listScope: filters.listScope,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    listViewMode: filters.listViewMode,
    setPage: filters.setPage,
    setExpandedObjectId: filters.setExpandedObjectId,
    totalVisible: derived.totalVisible,
    limit: filters.limit,
    page: filters.page,
    managerOptions: load.managerOptions,
    setManagerFilter: filters.setManagerFilter,
    directions: load.directions,
    setDirectionFilters: filters.setDirectionFilters,
  });

  const mutations = useContractsListMutations({
    router,
    load: load.load,
    setError,
    modals,
  });

  const savedViews = useContractsListSavedViews({
    currentFilters: filters.currentFiltersSnapshot,
    onApplyFilters: filters.applyFiltersSnapshot,
  });

  return {
    router,
    error,
    load,
    filters,
    modals,
    derived,
    mutations,
    savedViews,
    objectsById,
    presetById,
    visibleColumns,
    setVisibleColumns,
  };
}

export type ContractsListPageModel = ReturnType<typeof useContractsListPage>;
