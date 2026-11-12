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

  /**
   * Расчёты «только в договоре» (созданы из модалки договора, `embeddedInPackage`)
   * в разделе не показываются: ни в списке, ни в счётчиках вкладок/направлений/областей.
   * Полный `items` остаётся выше по цепочке — мутации раздела сохраняют весь каталог,
   * включая скрытые расчёты, чтобы не затереть их для договоров.
   */
  const catalogItems = useMemo(() => items.filter((it) => !it.embeddedInPackage), [items]);

  const packageManagerById = useMemo(
    () => buildPackageManagerById(workspacePackages),
    [workspacePackages]
  );

  const managerIdsByPresetId = useMemo(
    () => buildManagerIdsByPresetId(usageByEstimateId, packageManagerById),
    [usageByEstimateId, packageManagerById]
  );

  const groupIdsWithLockedEstimate = useMemo(
    () => buildGroupIdsWithLockedEstimate(catalogItems, usageByEstimateId),
    [catalogItems, usageByEstimateId]
  );

  const visibleItems = useMemo(
    () =>
      filterVisibleEstimatesListItems({
        items: catalogItems,
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
      catalogItems,
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
        catalogItems,
        groups,
        pipelineTab,
        searchNorm,
        dateFrom,
        dateTo,
        usageByEstimateId
      ),
    [catalogItems, groups, pipelineTab, searchNorm, dateFrom, dateTo, usageByEstimateId]
  );

  const scopeCounts = useMemo(
    () =>
      countEstimatesListScopes(
        catalogItems,
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
      catalogItems,
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
        catalogItems,
        groups,
        listScope,
        currentUserId,
        managerIdsByPresetId,
        usageByEstimateId
      ),
    [catalogItems, groups, listScope, currentUserId, managerIdsByPresetId, usageByEstimateId]
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
