import { useCallback, useState } from 'react';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@/features/auth/context/AuthContext';

import { parseEstimatePipelineTab } from '../../../../platform/estimates/estimatePipelineStage';
import { useEstimatesListDerivedData } from './useEstimatesListDerivedData';
import { useEstimatesListFiltersState } from './useEstimatesListFiltersState';
import { useEstimatesListGenerateFromMeasurement } from './useEstimatesListGenerateFromMeasurement';
import { useEstimatesListLoad } from './useEstimatesListLoad';
import { useEstimatesListModalsState } from './useEstimatesListModalsState';
import { useEstimatesListMutations } from './useEstimatesListMutations';
import { useEstimatesListNavigation } from './useEstimatesListNavigation';
import { useEstimatesListOkMessage } from './useEstimatesListOkMessage';
import { useEstimatesListSyncEffects } from './useEstimatesListSyncEffects';

export function useEstimatesListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const archiveView = searchParams.get('archive') === '1';
  const pipelineTab = archiveView
    ? 'active'
    : parseEstimatePipelineTab(searchParams.get('pipeline'));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ok, showOkMessage, showAutosaveOk, clearOkMessage } = useEstimatesListOkMessage();

  const handleLoadError = useCallback((message: string) => {
    setError(message);
  }, []);

  const load = useEstimatesListLoad(handleLoadError);
  const filters = useEstimatesListFiltersState(archiveView, user?.role);
  const navigation = useEstimatesListNavigation(pathname, router, searchParams, filters.setPage);
  const modals = useEstimatesListModalsState(load.items, filters.listScope);
  const generateFromMeasurement = useEstimatesListGenerateFromMeasurement(setError);

  const derived = useEstimatesListDerivedData({
    items: load.items,
    groups: load.groups,
    workspacePackages: load.workspacePackages,
    archiveView,
    pipelineTab,
    searchNorm: filters.searchNorm,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    managerFilter: filters.managerFilter,
    listScope: filters.listScope,
    currentUserId: user?.id ?? null,
    listViewMode: filters.listViewMode,
    listSortBy: filters.listSortBy,
    listSortOrder: filters.listSortOrder,
    effectiveExpandedAddressKey: filters.effectiveExpandedAddressKey,
    page: filters.page,
    limit: filters.limit,
  });

  useEstimatesListSyncEffects({
    loading: load.loading,
    listViewMode: filters.listViewMode,
    expandedAddressKey: filters.expandedAddressKey,
    setExpandedAddressKey: filters.setExpandedAddressKey,
    estimateLayoutBlocks: derived.estimateLayoutBlocks,
    managerFilter: filters.managerFilter,
    setManagerFilter: filters.setManagerFilter,
    managerOptions: load.managerOptions,
    workScopeModalPresetId: modals.workScopeModalPresetId,
    setWorkScopeModalPresetId: modals.setWorkScopeModalPresetId,
    copyChoicePresetId: modals.copyChoicePresetId,
    setCopyChoicePresetId: modals.setCopyChoicePresetId,
    items: load.items,
    totalTableRows: derived.totalTableRows,
    limit: filters.limit,
    page: filters.page,
    setPage: filters.setPage,
  });

  const mutations = useEstimatesListMutations({
    items: load.items,
    groups: load.groups,
    setItems: load.setItems,
    setGroups: load.setGroups,
    setWorkspacePackages: load.setWorkspacePackages,
    usageByEstimateId: derived.usageByEstimateId,
    groupIdsWithLockedEstimate: derived.groupIdsWithLockedEstimate,
    detachEditModal: modals.detachEditModal,
    setDetachEditModal: modals.setDetachEditModal,
    trashConfirmModal: modals.trashConfirmModal,
    setTrashConfirmModal: modals.setTrashConfirmModal,
    archiveConfirmModal: modals.archiveConfirmModal,
    setArchiveConfirmModal: modals.setArchiveConfirmModal,
    setWorkScopeModalPresetId: modals.setWorkScopeModalPresetId,
    router,
    refreshTrashCount: modals.refreshTrashCount,
    showAutosaveOk,
    showOkMessage,
    clearOkMessage,
    setError,
    setSaving,
    refreshing: load.refreshing,
    saving,
    setRefreshing: load.setRefreshing,
    fetchEstimatesFromServer: load.fetchEstimatesFromServer,
  });

  return {
    router,
    archiveView,
    pipelineTab,
    saving,
    error,
    ok,
    load,
    filters,
    navigation,
    modals,
    generateFromMeasurement,
    derived,
    mutations,
  };
}

export type EstimatesListPageModel = ReturnType<typeof useEstimatesListPage>;
