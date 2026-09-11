import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimatePipelineTab } from '../../../platform/estimates/estimatePipelineStage';
import { presetMatchesPipelineTab } from '../../../platform/estimates/estimatePipelineStage';
import type { EstimatesListScope } from './estimatesListFilters';
import {
  estimateBelongsToUser,
  estimateMatchesDateRange,
  estimateMatchesManagerFilter,
  estimateMatchesSearch,
} from './estimatesListUtils';

export type FilterVisibleEstimatesListItemsParams = {
  items: ContractEstimatePreset[];
  groups: ContractEstimateGroup[];
  archiveView: boolean;
  pipelineTab: EstimatePipelineTab;
  searchNorm: string;
  dateFrom: string;
  dateTo: string;
  managerFilter: string;
  listScope: EstimatesListScope;
  currentUserId: string | null;
  managerIdsByPresetId: Map<string, Set<string>>;
};

export function filterVisibleEstimatesListItems({
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
}: FilterVisibleEstimatesListItemsParams): ContractEstimatePreset[] {
  return items.filter((it) => {
    const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
    const groupArchived = Boolean(g?.archived);
    const rowArchived = Boolean(it.archived);
    const inArchiveCombined = groupArchived || rowArchived;
    const archiveOk = archiveView ? inArchiveCombined : !inArchiveCombined;
    if (!archiveOk) return false;
    if (!archiveView && !presetMatchesPipelineTab(it, groups, pipelineTab)) return false;
    if (!estimateMatchesSearch(it, searchNorm)) return false;
    if (!estimateMatchesDateRange(it, dateFrom, dateTo)) return false;

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
  archiveView: boolean,
  pipelineTab: EstimatePipelineTab,
  searchNorm: string,
  dateFrom: string,
  dateTo: string,
  currentUserId: string | null,
  managerIdsByPresetId: Map<string, Set<string>>
): Record<EstimatesListScope, number> {
  const base = items.filter((it) => {
    const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
    const groupArchived = Boolean(g?.archived);
    const rowArchived = Boolean(it.archived);
    const inArchiveCombined = groupArchived || rowArchived;
    const archiveOk = archiveView ? inArchiveCombined : !inArchiveCombined;
    if (!archiveOk) return false;
    if (!archiveView && !presetMatchesPipelineTab(it, groups, pipelineTab)) return false;
    if (!estimateMatchesSearch(it, searchNorm)) return false;
    if (!estimateMatchesDateRange(it, dateFrom, dateTo)) return false;
    return true;
  });

  return {
    mine: currentUserId
      ? base.filter((it) => estimateBelongsToUser(it, currentUserId, managerIdsByPresetId)).length
      : 0,
    all: base.length,
  };
}

export function countEstimatesPipelineTabs(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[],
  listScope: EstimatesListScope,
  currentUserId: string | null,
  managerIdsByPresetId: Map<string, Set<string>>
): { active: number; prospect: number } {
  let active = 0;
  let prospect = 0;
  for (const it of items) {
    const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
    if (Boolean(it.archived) || Boolean(g?.archived)) continue;
    if (listScope === 'mine') {
      if (!currentUserId || !estimateBelongsToUser(it, currentUserId, managerIdsByPresetId)) {
        continue;
      }
    }
    if (presetMatchesPipelineTab(it, groups, 'prospect')) prospect += 1;
    else active += 1;
  }
  return { active, prospect };
}

export function countArchivedEstimates(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[],
  listScope: EstimatesListScope,
  currentUserId: string | null,
  managerIdsByPresetId: Map<string, Set<string>>
): number {
  return items.filter((it) => {
    const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
    if (!(Boolean(it.archived) || Boolean(g?.archived))) return false;
    if (listScope === 'mine') {
      if (!currentUserId) return false;
      return estimateBelongsToUser(it, currentUserId, managerIdsByPresetId);
    }
    return true;
  }).length;
}
