'use client';

import hubStyles from '../hubModal/PackageHubModal.module.css';
import type { PackageHubState } from '../hubModal/usePackageHub';
import type { PackageContractPipelineModel } from './packagePipeline';

type PackagePipelineRefusalPanelProps = {
  hub: PackageHubState;
  pipeline: PackageContractPipelineModel;
};

export function PackagePipelineRefusalPanel({ hub, pipeline }: PackagePipelineRefusalPanelProps) {
  return (
    <div className={hubStyles.pipelineTimeline}>
      <div className={`${hubStyles.pipelineRefusalPanel} ${hubStyles.pipelineStepCurrent}`}>
        <div className={hubStyles.pipelineStepHeader}>
          <span className={hubStyles.pipelineStepMarker} aria-hidden />
          <div>
            <strong className={hubStyles.pipelineStepTitle}>Отказ</strong>
            <p className={hubStyles.pipelineStepDetail}>
              {pipeline.refusalReason || 'Причина отказа не указана.'}
            </p>
          </div>
        </div>
        <div className={hubStyles.pipelineStepActions}>
          <button
            data-admin-mutation
            type="button"
            data-modal-btn="secondary"
            disabled={hub.savingPackageStatus}
            onClick={() => hub.setRevertRefusalConfirmOpen(true)}
          >
            {hub.savingPackageStatus ? 'Сохранение…' : 'Снять отказ'}
          </button>
        </div>
      </div>
    </div>
  );
}
