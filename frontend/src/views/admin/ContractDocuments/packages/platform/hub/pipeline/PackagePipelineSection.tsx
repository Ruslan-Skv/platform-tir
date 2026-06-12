'use client';

import type { PackageHubState } from '../hubModal/usePackageHub';
import { PackagePipelineTimeline } from './PackagePipelineTimeline';

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
