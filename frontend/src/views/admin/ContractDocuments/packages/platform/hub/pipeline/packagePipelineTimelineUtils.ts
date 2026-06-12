import hubStyles from '../hubModal/PackageHubModal.module.css';
import type { PackageContractPipelineStepVisualState } from './packagePipeline';
import { PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT } from './packagePipeline';

export function stepStateClass(state: PackageContractPipelineStepVisualState): string {
  switch (state) {
    case 'completed':
      return hubStyles.pipelineStepCompleted;
    case 'current':
      return hubStyles.pipelineStepCurrent;
    default:
      return hubStyles.pipelineStepUpcoming;
  }
}

export function payPctToneClass(pct: number | null): string {
  if (pct == null) return hubStyles.pipelinePayBadgeMuted;
  if (pct >= 100) return hubStyles.pipelinePayBadgeGreen;
  if (pct >= PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT) return hubStyles.pipelinePayBadgeLime;
  return hubStyles.pipelinePayBadgeYellow;
}
