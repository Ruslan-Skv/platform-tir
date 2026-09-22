import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

export type EstimatePipelineTab = 'active' | 'prospect' | 'contract';

export const ESTIMATE_PIPELINE_TAB_LABELS: Record<EstimatePipelineTab, string> = {
  active: 'В работе',
  prospect: 'В перспективе',
  contract: 'В договорах',
};

export function parseEstimatePipelineTab(raw: string | null): EstimatePipelineTab {
  if (raw === 'prospect') return 'prospect';
  if (raw === 'contract') return 'contract';
  return 'active';
}

export function getGroupPipelineTab(group: ContractEstimateGroup | undefined): EstimatePipelineTab {
  return group?.pipelineStage === 'prospect' || group?.pipelineStage === 'contract'
    ? group.pipelineStage
    : 'active';
}

export function getPresetPipelineTab(preset: ContractEstimatePreset): EstimatePipelineTab {
  return preset.pipelineStage === 'prospect' || preset.pipelineStage === 'contract'
    ? preset.pipelineStage
    : 'active';
}

/** Эффективная вкладка расчёта с учётом группы объекта. */
export function getEffectivePresetPipelineTab(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): EstimatePipelineTab {
  const ownTab = getPresetPipelineTab(preset);
  if (ownTab !== 'active') return ownTab;
  if (!preset.groupId) return 'active';
  const g = groups.find((x) => x.id === preset.groupId);
  return getGroupPipelineTab(g);
}

export function presetMatchesPipelineTab(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[],
  tab: EstimatePipelineTab
): boolean {
  return getEffectivePresetPipelineTab(preset, groups) === tab;
}

export function applyPresetPipelineTab(
  preset: ContractEstimatePreset,
  tab: EstimatePipelineTab,
  ts: string
): ContractEstimatePreset {
  if (tab === 'active') {
    const { pipelineStage: _drop, ...rest } = preset;
    return { ...rest, updatedAt: ts };
  }
  return { ...preset, pipelineStage: tab, updatedAt: ts };
}

export function applyGroupPipelineTab(
  group: ContractEstimateGroup,
  tab: EstimatePipelineTab,
  ts: string
): ContractEstimateGroup {
  if (tab === 'active') {
    const { pipelineStage: _drop, ...rest } = group;
    return { ...rest, updatedAt: ts };
  }
  return { ...group, pipelineStage: tab, updatedAt: ts };
}

/** Доступен для прикрепления к договору (только «В работе», не архив). */
export function isEstimatePresetAttachableToContract(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): boolean {
  if (preset.archived) return false;
  if (getEffectivePresetPipelineTab(preset, groups) !== 'active') return false;
  if (!preset.groupId) return true;
  const g = groups.find((x) => x.id === preset.groupId);
  return !g?.archived;
}
