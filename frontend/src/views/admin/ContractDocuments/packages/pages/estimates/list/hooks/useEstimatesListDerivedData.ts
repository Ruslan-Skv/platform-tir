import { useMemo } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimatePipelineTab } from '../../../../platform/estimates/estimatePipelineStage';
import type { EstimatesListScope, EstimatesListViewMode } from '../estimatesListFilters';
import {
  buildEstimateLayoutBlocks,
  buildEstimatesTableDisplayItems,
  countEstimatesAddressGroups,
  paginateEstimatesTableDisplayItems,
} from '../estimatesListLayout';
import {
  buildGroupIdsWithLockedEstimate,
  buildManagerIdsByPresetId,
  buildPackageManagerById,
  buildUsageByEstimateId,
} from '../estimatesListPackageUsage';
import type { EstimatesListWorkspacePackage } from '../estimatesListPackageUsage';
import type { EstimatesListSortBy, EstimatesListSortOrder } from '../estimatesListSort';
import {
  countArchivedEstimates,
  countEstimatesListScopes,
  countEstimatesPipelineTabs,
  filterVisibleEstimatesListItems,
} from '../estimatesListVisibleItems';

export type UseEstimatesListDerivedDataParams = {
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  workspacePackages: EstimatesListWorkspacePackage[];
  archiveView: boolean;
  pipelineTab: EstimatePipelineTab;
  searchNorm: string;
  dateFrom: string;
  dateTo: string;
  managerFilter: string;
  listScope: EstimatesListScope;
  currentUserId: string | null;
  listViewMode: EstimatesListViewMode;
  listSortBy: EstimatesListSortBy;
  listSortOrder: EstimatesListSortOrder;
  effectiveExpandedAddressKey: string | null;
  page: number;
  limit: number;
};

export function useEstimatesListDerivedData({
  items,
  groups,
  workspacePackages,
  archiveView,
  pipelineTab,
  searchNorm,
  dateFrom,
  dateTo,
  managerFilter,
  listScope,
  currentUserId,
  listViewMode,
  listSortBy,
  listSortOrder,
  effectiveExpandedAddressKey,
  page,
  limit,
}: UseEstimatesListDerivedDataParams) {
  const usageByEstimateId = useMemo(
    () => buildUsageByEstimateId(workspacePackages),
    [workspacePackages]
  );

  const packageManagerById = useMemo(
    () => buildPackageManagerById(workspacePackages),
    [workspacePackages]
  );

  const managerIdsByPresetId = useMemo(
    () => buildManagerIdsByPresetId(usageByEstimateId, packageManagerById),
    [usageByEstimateId, packageManagerById]
  );

  const groupIdsWithLockedEstimate = useMemo(
    () => buildGroupIdsWithLockedEstimate(items, usageByEstimateId),
    [items, usageByEstimateId]
  );

  const visibleItems = useMemo(
    () =>
      filterVisibleEstimatesListItems({
        items,
        groups,
        archiveView,
        pipelineTab,
        searchNorm,
        dateFrom,
        dateTo,
        managerFilter,
        listScope,
        currentUserId,
        managerIdsByPresetId,
      }),
    [
      items,
      groups,
      archiveView,
      pipelineTab,
      searchNorm,
      dateFrom,
      dateTo,
      managerFilter,
      listScope,
      currentUserId,
      managerIdsByPresetId,
    ]
  );

  const scopeCounts = useMemo(
    () =>
      countEstimatesListScopes(
        items,
        groups,
        archiveView,
        pipelineTab,
        searchNorm,
        dateFrom,
        dateTo,
        currentUserId,
        managerIdsByPresetId
      ),
    [
      items,
      groups,
      archiveView,
      pipelineTab,
      searchNorm,
      dateFrom,
      dateTo,
      currentUserId,
      managerIdsByPresetId,
    ]
  );

  const pipelineTabCounts = useMemo(
    () => countEstimatesPipelineTabs(items, groups, listScope, currentUserId, managerIdsByPresetId),
    [items, groups, listScope, currentUserId, managerIdsByPresetId]
  );

  const archiveCount = useMemo(() => countArchivedEstimates(items, groups), [items, groups]);

  const addressGroupCount = useMemo(
    () => countEstimatesAddressGroups(visibleItems, listViewMode),
    [visibleItems, listViewMode]
  );

  const estimateLayoutBlocks = useMemo(
    () =>
      buildEstimateLayoutBlocks({
        visibleItems,
        groups,
        archiveView,
        listViewMode,
        listSortBy,
        listSortOrder,
      }),
    [visibleItems, archiveView, groups, listViewMode, listSortBy, listSortOrder]
  );

  const tableDisplayItems = useMemo(
    () => buildEstimatesTableDisplayItems(estimateLayoutBlocks, effectiveExpandedAddressKey),
    [estimateLayoutBlocks, effectiveExpandedAddressKey]
  );

  /** Без служебных gap-строк: иначе «Всего» больше числа видимых объектов/расчётов. */
  const paginatableDisplayItems = useMemo(
    () => tableDisplayItems.filter((item) => item.type !== 'gap'),
    [tableDisplayItems]
  );

  const totalTableRows = paginatableDisplayItems.length;

  const paginatedDisplayItems = useMemo(
    () => paginateEstimatesTableDisplayItems(paginatableDisplayItems, page, limit),
    [paginatableDisplayItems, page, limit]
  );

  return {
    usageByEstimateId,
    groupIdsWithLockedEstimate,
    visibleItems,
    scopeCounts,
    pipelineTabCounts,
    archiveCount,
    addressGroupCount,
    estimateLayoutBlocks,
    tableDisplayItems,
    totalTableRows,
    paginatedDisplayItems,
  };
}
