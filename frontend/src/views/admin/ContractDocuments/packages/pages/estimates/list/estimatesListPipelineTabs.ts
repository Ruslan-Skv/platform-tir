import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import {
  type EstimatePipelineTab,
  getEstimateManualPipelineTab,
} from '../../../platform/estimates/estimatePipelineStage';
import { listPresetsInSplitBundle } from '../../../platform/estimates/estimateWorkScopeTree';
import { type EstimatePackageUsage, isUsageLocked } from './estimatesListUtils';

export type EstimateAttachmentStatus = 'signed' | 'attached' | null;

/** Привязка одного расчёта: подписан (договор или Д/с), просто прикреплён или свободен. */
export function getEstimateAttachmentStatus(
  preset: ContractEstimatePreset,
  usageByEstimateId: Map<string, EstimatePackageUsage[]>
): EstimateAttachmentStatus {
  const usages = usageByEstimateId.get(preset.id) ?? [];
  if (usages.some((u) => isUsageLocked(u))) return 'signed';
  if (usages.length > 0) return 'attached';
  return null;
}

/**
 * Эффективная вкладка расчёта в списке. Приоритет: подписание > ручная пауза >
 * прикрепление > работа. Связка живёт на одной вкладке: «Подписаны» — когда подписан
 * последний её расчёт, «Прикреплённые» — когда прикреплён последний. Ручная пауза
 * («Отложенные») снимается подписанием, но не прикреплением.
 */
export function getEstimateListPipelineTab(
  preset: ContractEstimatePreset,
  items: ContractEstimatePreset[],
  groups: ContractEstimateGroup[],
  usageByEstimateId: Map<string, EstimatePackageUsage[]>
): EstimatePipelineTab {
  const members = listPresetsInSplitBundle(preset, items);
  const pool = members.length > 0 ? members : [preset];
  const statuses = pool.map((m) => getEstimateAttachmentStatus(m, usageByEstimateId));
  if (statuses.every((s) => s === 'signed')) return 'signed';
  if (pool.some((m) => getEstimateManualPipelineTab(m, groups) === 'deferred')) {
    return 'deferred';
  }
  if (statuses.every((s) => s === 'signed' || s === 'attached')) return 'attached';
  return 'active';
}

/** У связки есть подписанный участник: ручная пауза для всей связки недоступна. */
export function estimateBundleHasSignedMember(
  preset: ContractEstimatePreset,
  items: ContractEstimatePreset[],
  usageByEstimateId: Map<string, EstimatePackageUsage[]>
): boolean {
  const members = listPresetsInSplitBundle(preset, items);
  const pool = members.length > 0 ? members : [preset];
  return pool.some((m) => getEstimateAttachmentStatus(m, usageByEstimateId) === 'signed');
}
