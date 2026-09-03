'use client';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { EstimateArchiveConfirmModal } from '../modals/EstimateArchiveConfirmModal';
import type { EstimateArchiveConfirmState } from '../modals/EstimateArchiveConfirmModal';
import { EstimateCopyChoiceModal } from '../modals/EstimateCopyChoiceModal';
import { EstimateDetachEditModal } from '../modals/EstimateDetachEditModal';
import {
  type CompletedMeasurementOption,
  EstimateGenerateFromMeasurementModal,
} from '../modals/EstimateGenerateFromMeasurementModal';
import {
  EstimateTrashConfirmModal,
  type EstimateTrashConfirmState,
} from '../modals/EstimateTrashConfirmModal';
import { EstimateTrashModal } from '../modals/EstimateTrashModal';
import { EstimateWorkScopeSplitModal } from '../modals/EstimateWorkScopeSplitModal';

export type EstimatesListModalsProps = {
  saving: boolean;
  archiveView: boolean;
  groups: ContractEstimateGroup[];
  items: ContractEstimatePreset[];
  workScopePreset: ContractEstimatePreset | null;
  onCloseWorkScope: () => void;
  onWorkScopeSave: (
    presetId: string,
    payload: { splitBundleId: string; estimateWorkScopeKeys: string[] }
  ) => void | Promise<void>;
  copyChoicePreset: ContractEstimatePreset | null;
  copyChoiceHasLockedUsage: boolean;
  onCloseCopyChoice: () => void;
  onCopyChoose: Parameters<typeof EstimateCopyChoiceModal>[0]['onChoose'];
  detachEditOpen: boolean;
  onCancelDetachEdit: () => void;
  onConfirmDetachEdit: () => void;
  trashConfirmModal: EstimateTrashConfirmState | null;
  onCloseTrashConfirm: () => void;
  onConfirmTrashMove: () => void;
  archiveConfirmModal: EstimateArchiveConfirmState | null;
  onCloseArchiveConfirm: () => void;
  onConfirmArchive: () => void;
  trashOpen: boolean;
  onCloseTrash: () => void;
  onTrashRestored: () => void;
  isGenerateFromMeasurementOpen: boolean;
  completedMeasurements: CompletedMeasurementOption[];
  completedMeasurementsBusy: boolean;
  selectedMeasurementId: string;
  onSelectedMeasurementIdChange: (id: string) => void;
  onCloseGenerateFromMeasurement: () => void;
  onCreateFromMeasurement: (measurementId: string) => void;
};

export function EstimatesListModals({
  saving,
  archiveView,
  groups,
  items,
  workScopePreset,
  onCloseWorkScope,
  onWorkScopeSave,
  copyChoicePreset,
  copyChoiceHasLockedUsage,
  onCloseCopyChoice,
  onCopyChoose,
  detachEditOpen,
  onCancelDetachEdit,
  onConfirmDetachEdit,
  trashConfirmModal,
  onCloseTrashConfirm,
  onConfirmTrashMove,
  archiveConfirmModal,
  onCloseArchiveConfirm,
  onConfirmArchive,
  trashOpen,
  onCloseTrash,
  onTrashRestored,
  isGenerateFromMeasurementOpen,
  completedMeasurements,
  completedMeasurementsBusy,
  selectedMeasurementId,
  onSelectedMeasurementIdChange,
  onCloseGenerateFromMeasurement,
  onCreateFromMeasurement,
}: EstimatesListModalsProps) {
  return (
    <>
      <EstimateWorkScopeSplitModal
        isOpen={workScopePreset != null}
        preset={workScopePreset}
        groups={groups}
        allPresets={items}
        saving={saving}
        onClose={onCloseWorkScope}
        onSave={onWorkScopeSave}
      />

      <EstimateCopyChoiceModal
        isOpen={copyChoicePreset != null}
        preset={copyChoicePreset}
        allPresets={items}
        archiveView={archiveView}
        hasLockedUsage={copyChoiceHasLockedUsage}
        saving={saving}
        onClose={onCloseCopyChoice}
        onChoose={onCopyChoose}
      />

      <EstimateDetachEditModal
        isOpen={detachEditOpen}
        saving={saving}
        onCancel={onCancelDetachEdit}
        onConfirm={onConfirmDetachEdit}
      />

      <EstimateTrashConfirmModal
        state={trashConfirmModal}
        saving={saving}
        onClose={onCloseTrashConfirm}
        onConfirm={onConfirmTrashMove}
      />

      <EstimateArchiveConfirmModal
        state={archiveConfirmModal}
        saving={saving}
        onClose={onCloseArchiveConfirm}
        onConfirm={onConfirmArchive}
      />

      <EstimateTrashModal isOpen={trashOpen} onClose={onCloseTrash} onRestored={onTrashRestored} />

      <EstimateGenerateFromMeasurementModal
        isOpen={isGenerateFromMeasurementOpen}
        measurements={completedMeasurements}
        loading={completedMeasurementsBusy}
        selectedMeasurementId={selectedMeasurementId}
        onSelectedMeasurementIdChange={onSelectedMeasurementIdChange}
        onClose={onCloseGenerateFromMeasurement}
        onCreate={onCreateFromMeasurement}
      />
    </>
  );
}
