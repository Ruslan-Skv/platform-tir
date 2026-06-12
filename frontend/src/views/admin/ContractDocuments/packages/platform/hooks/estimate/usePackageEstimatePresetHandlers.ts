'use client';

import { useCallback } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { applyEstimatePresetIdsToPackageForm } from '../../estimates/applyEstimatePresetIds';
import type { PackageFormData } from '../../form/packageForm';

export type UsePackageEstimatePresetHandlersOptions = {
  contractAndEstimateLocked: boolean;
  form: PackageFormData;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  setDirty: (dirty: boolean) => void;
  formRef: React.MutableRefObject<PackageFormData>;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  schedulePersistDebounced: () => void;
};

export function usePackageEstimatePresetHandlers({
  contractAndEstimateLocked,
  form,
  setForm,
  setDirty,
  formRef,
  estimatePresets,
  estimateGroups,
  schedulePersistDebounced,
}: UsePackageEstimatePresetHandlersOptions) {
  const applyEstimatePresetIdsToForm = useCallback(
    (presetIds: string[]) => {
      if (contractAndEstimateLocked) return;
      setForm((p) => {
        const uniqueIds = [...new Set(presetIds.filter(Boolean))];
        const nextForm = applyEstimatePresetIdsToPackageForm(
          p,
          uniqueIds,
          estimatePresets,
          estimateGroups
        );
        formRef.current = nextForm;
        schedulePersistDebounced();
        return nextForm;
      });
      setDirty(true);
    },
    [
      contractAndEstimateLocked,
      setForm,
      estimatePresets,
      estimateGroups,
      formRef,
      schedulePersistDebounced,
      setDirty,
    ]
  );

  const addEstimatePresetToForm = useCallback(
    (presetId: string) => {
      if (!presetId) return;
      applyEstimatePresetIdsToForm([...(form.estimate.selectedPresetIds ?? []), presetId]);
    },
    [applyEstimatePresetIdsToForm, form.estimate.selectedPresetIds]
  );

  const removeEstimatePresetFromForm = useCallback(
    (presetId: string) => {
      applyEstimatePresetIdsToForm(
        (form.estimate.selectedPresetIds ?? []).filter((id) => id !== presetId)
      );
    },
    [applyEstimatePresetIdsToForm, form.estimate.selectedPresetIds]
  );

  const moveEstimatePresetInForm = useCallback(
    (sourceId: string, targetId: string) => {
      if (!sourceId || !targetId || sourceId === targetId) return;
      const ids = [...(form.estimate.selectedPresetIds ?? [])];
      const from = ids.indexOf(sourceId);
      const to = ids.indexOf(targetId);
      if (from < 0 || to < 0) return;
      const [moved] = ids.splice(from, 1);
      ids.splice(to, 0, moved);
      applyEstimatePresetIdsToForm(ids);
    },
    [applyEstimatePresetIdsToForm, form.estimate.selectedPresetIds]
  );

  return {
    applyEstimatePresetIdsToForm,
    addEstimatePresetToForm,
    removeEstimatePresetFromForm,
    moveEstimatePresetInForm,
  };
}
