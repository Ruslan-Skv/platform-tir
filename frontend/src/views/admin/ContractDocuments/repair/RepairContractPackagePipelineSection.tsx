'use client';

import { RepairContractPipelineTimeline } from './RepairContractPipelineTimeline';
import type { RepairContractPackageHubState } from './useRepairContractPackageHub';

type RepairContractPackagePipelineSectionProps = {
  hub: RepairContractPackageHubState;
  blockPipelineActions?: boolean;
  blockPipelineReason?: string;
  onOpenPaymentsJournal?: () => void;
  onScrollToConductPayment?: () => void;
};

export function RepairContractPackagePipelineSection({
  hub,
  blockPipelineActions = false,
  blockPipelineReason,
  onOpenPaymentsJournal,
  onScrollToConductPayment,
}: RepairContractPackagePipelineSectionProps) {
  return (
    <RepairContractPipelineTimeline
      hub={hub}
      pipeline={hub.pipeline}
      blockPipelineActions={blockPipelineActions}
      blockPipelineReason={blockPipelineReason}
      onOpenPaymentsJournal={onOpenPaymentsJournal}
      onScrollToConductPayment={onScrollToConductPayment}
    />
  );
}
