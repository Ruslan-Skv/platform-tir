import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimatePipelineTab } from '../../../platform/estimates/estimatePipelineStage';
import type { EstimatesListScope } from './estimatesListFilters';
import { getEstimateListPipelineTab } from './estimatesListPipelineTabs';
import type { EstimatePackageUsage } from './estimatesListUtils';
import {
  estimateBelongsToUser,
  estimateMatchesDateRange,
  estimateMatchesManagerFilter,
  estimateMatchesSearch,
} from './estimatesListUtils';

export type FilterVisibleEstimatesListItemsParams = {
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  pipelineTab: EstimatePipelineTab;
  searchNorm: string;
  dateFrom: string;
  dateTo: string;
  managerFilter: string;
  listScope: EstimatesListScope;
  currentUserId: string | null;
  managerIdsByPresetId: Map<string, Set<string>>;
  /** Выбранные направления чипами; пусто — все. Расчёты без направления ловит только «Все». */
  directionFilter: ContractDocumentPackageKind[];
  usageByEstimateId: Map<string, EstimatePackageUsage[]>;
};

function matchesBaseEstimatesFilters(
  it: ContractEstimatePreset,
  groups: ContractEstimateGroup[],
  pipelineTab: EstimatePipelineTab,
  items: ContractEstimatePreset[],
  usageByEstimateId: Map<string, EstimatePackageUsage[]>,
  searchNorm: string,
  dateFrom: string,
  dateTo: string
): boolean {
  if (getEstimateListPipelineTab(it, items, groups, usageByEstimateId) !== pipelineTab) {
    return false;
  }
  if (!estimateMatchesSearch(it, searchNorm)) return false;
  if (!estimateMatchesDateRange(it, dateFrom, dateTo)) return false;
  return true;
}

export function filterVisibleEstimatesListItems({
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
}: FilterVisibleEstimatesListItemsParams): ContractEstimatePreset[] {
  return items.filter((it) => {
    if (
      !matchesBaseEstimatesFilters(
        it,
        groups,
        pipelineTab,
        items,
        usageByEstimateId,
        searchNorm,
        dateFrom,
        dateTo
      )
    ) {
      return false;
    }
    if (directionFilter.length > 0 && (!it.direction || !directionFilter.includes(it.direction))) {
      return false;
    }

    if (listScope === 'mine') {
      if (!currentUserId) return false;
      return estimateBelongsToUser(it, currentUserId, managerIdsByPresetId);
    }

    return estimateMatchesManagerFilter(it, managerFilter, managerIdsByPresetId);
  });
}

export function countEstimatesListScopes(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[],
  pipelineTab: EstimatePipelineTab,
  searchNorm: string,
  dateFrom: string,
  dateTo: string,
  currentUserId: string | null,
  managerIdsByPresetId: Map<string, Set<string>>,
  usageByEstimateId: Map<string, EstimatePackageUsage[]>
): Record<EstimatesListScope, number> {
  const base = items.filter((it) =>
    matchesBaseEstimatesFilters(
      it,
      groups,
      pipelineTab,
      items,
      usageByEstimateId,
      searchNorm,
      dateFrom,
      dateTo
    )
  );

  return {
    mine: currentUserId
      ? base.filter((it) => estimateBelongsToUser(it, currentUserId, managerIdsByPresetId)).length
      : 0,
    all: base.length,
  };
}

/** Счётчики чипов «Направления»: по тем же базовым фильтрам (вкладка/поиск/даты).
 *  Расчёты без направления (старые) не относятся ни к одному чипу — видны только в «Все». */
export function countEstimatesDirections(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[],
  pipelineTab: EstimatePipelineTab,
  searchNorm: string,
  dateFrom: string,
  dateTo: string,
  usageByEstimateId: Map<string, EstimatePackageUsage[]>
): Record<ContractDocumentPackageKind, number> {
  const counts = {
    REPAIR: 0,
    WINDOWS: 0,
    DOORS: 0,
    CEILINGS: 0,
    BLINDS: 0,
    FURNITURE: 0,
  } as Record<ContractDocumentPackageKind, number>;
  for (const it of items) {
    if (!it.direction) continue;
    if (
      !matchesBaseEstimatesFilters(
        it,
        groups,
        pipelineTab,
        items,
        usageByEstimateId,
        searchNorm,
        dateFrom,
        dateTo
      )
    ) {
      continue;
    }
    counts[it.direction] += 1;
  }
  return counts;
}

export function countEstimatesPipelineTabs(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[],
  listScope: EstimatesListScope,
  currentUserId: string | null,
  managerIdsByPresetId: Map<string, Set<string>>,
  usageByEstimateId: Map<string, EstimatePackageUsage[]>
): Record<EstimatePipelineTab, number> {
  const counts: Record<EstimatePipelineTab, number> = {
    active: 0,
    attached: 0,
    signed: 0,
    deferred: 0,
  };
  for (const it of items) {
    if (listScope === 'mine') {
      if (!currentUserId || !estimateBelongsToUser(it, currentUserId, managerIdsByPresetId)) {
        continue;
      }
    }
    counts[getEstimateListPipelineTab(it, items, groups, usageByEstimateId)] += 1;
  }
  return counts;
}
