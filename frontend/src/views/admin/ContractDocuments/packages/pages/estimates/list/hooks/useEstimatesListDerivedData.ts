import { useMemo } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimatePipelineTab } from '../../../../platform/estimates/estimatePipelineStage';
import type { EstimatesListViewMode } from '../estimatesListFilters';
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
      managerIdsByPresetId,
    ]
  );

  const pipelineTabCounts = useMemo(
    () => countEstimatesPipelineTabs(items, groups),
    [items, groups]
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

  const totalTableRows = tableDisplayItems.length;

  const paginatedDisplayItems = useMemo(
    () => paginateEstimatesTableDisplayItems(tableDisplayItems, page, limit),
    [tableDisplayItems, page, limit]
  );

  return {
    usageByEstimateId,
    groupIdsWithLockedEstimate,
    visibleItems,
    pipelineTabCounts,
    archiveCount,
    addressGroupCount,
    estimateLayoutBlocks,
    tableDisplayItems,
    totalTableRows,
    paginatedDisplayItems,
  };
}
