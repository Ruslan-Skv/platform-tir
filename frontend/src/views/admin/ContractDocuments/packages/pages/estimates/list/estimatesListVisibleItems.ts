import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimatePipelineTab } from '../../../platform/estimates/estimatePipelineStage';
import { presetMatchesPipelineTab } from '../../../platform/estimates/estimatePipelineStage';
import {
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
    return estimateMatchesManagerFilter(it.id, managerFilter, managerIdsByPresetId);
  });
}

export function countEstimatesPipelineTabs(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[]
): { active: number; prospect: number } {
  let active = 0;
  let prospect = 0;
  for (const it of items) {
    const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
    if (Boolean(it.archived) || Boolean(g?.archived)) continue;
    if (presetMatchesPipelineTab(it, groups, 'prospect')) prospect += 1;
    else active += 1;
  }
  return { active, prospect };
}

export function countArchivedEstimates(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[]
): number {
  return items.filter((it) => {
    const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
    return Boolean(it.archived) || Boolean(g?.archived);
  }).length;
}
