'use client';

import hubStyles from '../hubModal/PackageHubModal.module.css';
import type { PackageHubState } from '../hubModal/usePackageHub';
import { PackagePipelineRefusalPanel } from './PackagePipelineRefusalPanel';
import { PackagePipelineStepCard } from './PackagePipelineStepCard';
import type { PackageContractPipelineModel } from './packagePipeline';

export type PackagePipelineTimelineProps = {
  hub: PackageHubState;
  pipeline: PackageContractPipelineModel;
  blockPipelineActions?: boolean;
  blockPipelineReason?: string;
  onOpenPaymentsJournal?: () => void;
  onScrollToConductPayment?: () => void;
};

export function PackagePipelineTimeline({
  hub,
  pipeline,
  blockPipelineActions = false,
  blockPipelineReason,
  onOpenPaymentsJournal,
  onScrollToConductPayment,
}: PackagePipelineTimelineProps) {
  const actionsDisabled =
    blockPipelineActions ||
    hub.loading ||
    hub.savingPackageStatus ||
    hub.workStartModalBusy ||
    hub.contractCloseModalBusy ||
    hub.refusalModalBusy;

  const actionsTitle = blockPipelineReason ?? (hub.loading ? 'Загрузка…' : undefined);

  if (pipeline.isRefused) {
    return <PackagePipelineRefusalPanel hub={hub} pipeline={pipeline} />;
  }

  return (
    <div className={hubStyles.pipelineTimeline}>
      <ol className={hubStyles.pipelineStepsList}>
        {pipeline.steps.map((step, index) => (
          <PackagePipelineStepCard
            key={step.id}
            step={step}
            isLast={index === pipeline.steps.length - 1}
            hub={hub}
            pipeline={pipeline}
            actionsDisabled={actionsDisabled}
            actionsTitle={actionsTitle}
            onOpenPaymentsJournal={onOpenPaymentsJournal}
            onScrollToConductPayment={onScrollToConductPayment}
          />
        ))}
      </ol>
    </div>
  );
}
