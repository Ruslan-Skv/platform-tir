import { useMemo } from 'react';

import type {
  ContractDocumentPackageKind,
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
  countEstimatesDirections,
  countEstimatesListScopes,
  countEstimatesPipelineTabs,
  filterVisibleEstimatesListItems,
} from '../estimatesListVisibleItems';

export type UseEstimatesListDerivedDataParams = {
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  workspacePackages: EstimatesListWorkspacePackage[];
  pipelineTab: EstimatePipelineTab;
  searchNorm: string;
  dateFrom: string;
  dateTo: string;
  managerFilter: string;
  listScope: EstimatesListScope;
  currentUserId: string | null;
  /** Выбранные направления чипами; пусто — все. */
  directionFilter: ContractDocumentPackageKind[];
  listViewMode: EstimatesListViewMode;
  listSortBy: EstimatesListSortBy;
  listSortOrder: EstimatesListSortOrder;
  effectiveExpandedAddressKeys: string[];
  page: number;
  limit: number;
};

export function useEstimatesListDerivedData({
  items,
  groups,
  workspacePackages,
  pipelineTab,
  searchNorm,
  dateFrom,
  dateTo,
  managerFilter,
  listScope,
  currentUserId,
  directionFilter,
  listViewMode,
  listSortBy,
  listSortOrder,
  effectiveExpandedAddressKeys,
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
        pipelineTab,
        searchNorm,
        dateFrom,
        dateTo,
        managerFilter,
        listScope,
        currentUserId,
        managerIdsByPresetId,
        directionFilter,
        usageByEstimateId,
      }),
    [
      items,
      groups,
      pipelineTab,
      searchNorm,
      dateFrom,
      dateTo,
      managerFilter,
      listScope,
      currentUserId,
      managerIdsByPresetId,
      directionFilter,
      usageByEstimateId,
    ]
  );

  const directionCounts = useMemo(
    () =>
      countEstimatesDirections(
        items,
        groups,
        pipelineTab,
        searchNorm,
        dateFrom,
        dateTo,
        usageByEstimateId
      ),
    [items, groups, pipelineTab, searchNorm, dateFrom, dateTo, usageByEstimateId]
  );

  const scopeCounts = useMemo(
    () =>
      countEstimatesListScopes(
        items,
        groups,
        pipelineTab,
        searchNorm,
        dateFrom,
        dateTo,
        currentUserId,
        managerIdsByPresetId,
        usageByEstimateId
      ),
    [
      items,
      groups,
      pipelineTab,
      searchNorm,
      dateFrom,
      dateTo,
      currentUserId,
      managerIdsByPresetId,
      usageByEstimateId,
    ]
  );

  const pipelineTabCounts = useMemo(
    () =>
      countEstimatesPipelineTabs(
        items,
        groups,
        listScope,
        currentUserId,
        managerIdsByPresetId,
        usageByEstimateId
      ),
    [items, groups, listScope, currentUserId, managerIdsByPresetId, usageByEstimateId]
  );

  const addressGroupCount = useMemo(
    () => countEstimatesAddressGroups(visibleItems, listViewMode),
    [visibleItems, listViewMode]
  );

  const estimateLayoutBlocks = useMemo(
    () =>
      buildEstimateLayoutBlocks({
        visibleItems,
        listViewMode,
        listSortBy,
        listSortOrder,
        usageByEstimateId,
      }),
    [visibleItems, listViewMode, listSortBy, listSortOrder, usageByEstimateId]
  );

  const tableDisplayItems = useMemo(
    () => buildEstimatesTableDisplayItems(estimateLayoutBlocks, effectiveExpandedAddressKeys),
    [estimateLayoutBlocks, effectiveExpandedAddressKeys]
  );

  /** Без служебных gap-строк: иначе «Всего» больше числа видимых объектов/расчётов. */
  const paginatableDisplayItems = useMemo(
    () => tableDisplayItems.filter((item) => item.type !== 'gap'),
    [tableDisplayItems]
  );

  const totalTableRows = paginatableDisplayItems.length;

  // Пагинатор сам сохраняет gap-разделители между карточками (лимит — по строкам без gap).
  const paginatedDisplayItems = useMemo(
    () => paginateEstimatesTableDisplayItems(tableDisplayItems, page, limit),
    [tableDisplayItems, page, limit]
  );

  return {
    usageByEstimateId,
    groupIdsWithLockedEstimate,
    visibleItems,
    scopeCounts,
    directionCounts,
    pipelineTabCounts,
    addressGroupCount,
    estimateLayoutBlocks,
    tableDisplayItems,
    totalTableRows,
    paginatedDisplayItems,
  };
}
