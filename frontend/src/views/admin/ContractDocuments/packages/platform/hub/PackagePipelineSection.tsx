'use client';

import { PackagePipelineTimeline } from './PackagePipelineTimeline';
import type { PackageHubState } from './usePackageHub';

type PackagePipelineSectionProps = {
  hub: PackageHubState;
  blockPipelineActions?: boolean;
  blockPipelineReason?: string;
  onOpenPaymentsJournal?: () => void;
  onScrollToConductPayment?: () => void;
};

export function PackagePipelineSection({
  hub,
  blockPipelineActions = false,
  blockPipelineReason,
  onOpenPaymentsJournal,
  onScrollToConductPayment,
}: PackagePipelineSectionProps) {
  return (
    <PackagePipelineTimeline
      hub={hub}
      pipeline={hub.pipeline}
      blockPipelineActions={blockPipelineActions}
      blockPipelineReason={blockPipelineReason}
      onOpenPaymentsJournal={onOpenPaymentsJournal}
      onScrollToConductPayment={onScrollToConductPayment}
    />
  );
}
