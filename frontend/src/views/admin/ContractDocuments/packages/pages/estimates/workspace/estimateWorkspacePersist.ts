import {
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  putContractDocumentEstimatePresets,
} from '@/shared/api/admin-contract-document-packages';

import { clampEstimateAdditionalMarkupPercent } from '../../../platform/estimates/applyEstimatePresetIds';
import { ensureEstimateObjectGroups } from '../../../platform/estimates/estimateObjectGroupSync';
import { clampWithEllipsis, sanitizeEstimatePresetForApi } from './estimateWorkspaceUtils';

export async function persistEstimateWorkspacePresets(
  next: ContractEstimatePreset[],
  estimateGroups: ContractEstimateGroup[]
): Promise<{ items: ContractEstimatePreset[]; groups: ContractEstimateGroup[] }> {
  const synced = ensureEstimateObjectGroups(next, estimateGroups);
  const payloadItems = synced.items.map((it) => {
    const {
      calculatorDraftByCategory: _draftByCategory,
      multiCategorySlugs: _multiCategorySlugs,
      ...rest
    } = it as ContractEstimatePreset & {
      calculatorDraftByCategory?: Record<string, string>;
      multiCategorySlugs?: string[];
    };
    return sanitizeEstimatePresetForApi(rest as ContractEstimatePreset);
  });
  const payloadGroups = synced.groups.map((g) => {
    const id = clampWithEllipsis(g.id || `grp_${Date.now()}`, 48);
    const title = clampWithEllipsis(g.title || 'Объект', 200);
    if (
      typeof g.additionalMarkupPercent === 'number' &&
      Number.isFinite(g.additionalMarkupPercent)
    ) {
      return {
        ...g,
        id,
        title,
        additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(g.additionalMarkupPercent),
      };
    }
    const { additionalMarkupPercent: _m, ...rest } = g;
    return { ...rest, id, title } as ContractEstimateGroup;
  });
  await putContractDocumentEstimatePresets({
    kind: 'REPAIR',
    items: payloadItems,
    groups: payloadGroups,
  });
  return synced;
}
