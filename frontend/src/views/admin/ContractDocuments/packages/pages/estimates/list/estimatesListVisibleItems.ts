import type {
  ContractDocumentPackageKind,
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { EstimatePipelineTab } from '../../../platform/estimates/estimatePipelineStage';
import {
  getEffectivePresetPipelineTab,
  presetMatchesPipelineTab,
} from '../../../platform/estimates/estimatePipelineStage';
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
  /** Выбранные направления чипами; пусто — все. Расчёты без направления ловит только «Все». */
  directionFilter: ContractDocumentPackageKind[];
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
  directionFilter,
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

/** Счётчики чипов «Направления»: по тем же базовым фильтрам (архив/вкладка/поиск/даты).
 *  Расчёты без направления (старые) не относятся ни к одному чипу — видны только в «Все». */
export function countEstimatesDirections(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[],
  archiveView: boolean,
  pipelineTab: EstimatePipelineTab,
  searchNorm: string,
  dateFrom: string,
  dateTo: string
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
    const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
    const groupArchived = Boolean(g?.archived);
    const rowArchived = Boolean(it.archived);
    const inArchiveCombined = groupArchived || rowArchived;
    const archiveOk = archiveView ? inArchiveCombined : !inArchiveCombined;
    if (!archiveOk) continue;
    if (!archiveView && !presetMatchesPipelineTab(it, groups, pipelineTab)) continue;
    if (!estimateMatchesSearch(it, searchNorm)) continue;
    if (!estimateMatchesDateRange(it, dateFrom, dateTo)) continue;
    counts[it.direction] += 1;
  }
  return counts;
}

export function countEstimatesPipelineTabs(
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[],
  listScope: EstimatesListScope,
  currentUserId: string | null,
  managerIdsByPresetId: Map<string, Set<string>>
): { active: number; prospect: number; contract: number } {
  let active = 0;
  let prospect = 0;
  let contract = 0;
  for (const it of items) {
    const g = it.groupId ? groups.find((x) => x.id === it.groupId) : undefined;
    if (Boolean(it.archived) || Boolean(g?.archived)) continue;
    if (listScope === 'mine') {
      if (!currentUserId || !estimateBelongsToUser(it, currentUserId, managerIdsByPresetId)) {
        continue;
      }
    }
    const tab = getEffectivePresetPipelineTab(it, groups);
    if (tab === 'prospect') prospect += 1;
    else if (tab === 'contract') contract += 1;
    else active += 1;
  }
  return { active, prospect, contract };
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
