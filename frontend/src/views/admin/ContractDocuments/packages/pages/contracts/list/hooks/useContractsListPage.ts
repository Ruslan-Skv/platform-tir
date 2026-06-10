import { useCallback, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useContractsListDerivedData } from './useContractsListDerivedData';
import { useContractsListFiltersState } from './useContractsListFiltersState';
import { useContractsListLoad } from './useContractsListLoad';
import { useContractsListModalsState } from './useContractsListModalsState';
import { useContractsListMutations } from './useContractsListMutations';
import { useContractsListSyncEffects } from './useContractsListSyncEffects';

export function useContractsListPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleLoadError = useCallback((message: string) => {
    setError(message);
  }, []);

  const load = useContractsListLoad(handleLoadError);
  const filters = useContractsListFiltersState();
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
    searchNorm: filters.searchNorm,
    managerFilter: filters.managerFilter,
    statusFilter: filters.statusFilter,
    directionFilter: filters.directionFilter,
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
  });

  useContractsListSyncEffects({
    searchNorm: filters.searchNorm,
    managerFilter: filters.managerFilter,
    statusFilter: filters.statusFilter,
    directionFilter: filters.directionFilter,
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
    setDirectionFilter: filters.setDirectionFilter,
  });

  const mutations = useContractsListMutations({
    router,
    load: load.load,
    setError,
    modals,
  });

  return {
    router,
    error,
    load,
    filters,
    modals,
    derived,
    mutations,
    objectsById,
    presetById,
  };
}

export type ContractsListPageModel = ReturnType<typeof useContractsListPage>;
