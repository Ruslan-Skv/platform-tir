import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

export type EstimatePipelineTab = 'active' | 'prospect';

export const ESTIMATE_PIPELINE_TAB_LABELS: Record<EstimatePipelineTab, string> = {
  active: 'В работе',
  prospect: 'В перспективе',
};

export function parseEstimatePipelineTab(raw: string | null): EstimatePipelineTab {
  return raw === 'prospect' ? 'prospect' : 'active';
}

export function getGroupPipelineTab(group: ContractEstimateGroup | undefined): EstimatePipelineTab {
  return group?.pipelineStage === 'prospect' ? 'prospect' : 'active';
}

export function getPresetPipelineTab(preset: ContractEstimatePreset): EstimatePipelineTab {
  return preset.pipelineStage === 'prospect' ? 'prospect' : 'active';
}

/** Эффективная вкладка расчёта с учётом группы объекта. */
export function getEffectivePresetPipelineTab(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): EstimatePipelineTab {
  if (getPresetPipelineTab(preset) === 'prospect') return 'prospect';
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
  if (tab === 'prospect') {
    return { ...preset, pipelineStage: 'prospect', updatedAt: ts };
  }
  const { pipelineStage: _drop, ...rest } = preset;
  return { ...rest, updatedAt: ts };
}

export function applyGroupPipelineTab(
  group: ContractEstimateGroup,
  tab: EstimatePipelineTab,
  ts: string
): ContractEstimateGroup {
  if (tab === 'prospect') {
    return { ...group, pipelineStage: 'prospect', updatedAt: ts };
  }
  const { pipelineStage: _drop, ...rest } = group;
  return { ...rest, updatedAt: ts };
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
