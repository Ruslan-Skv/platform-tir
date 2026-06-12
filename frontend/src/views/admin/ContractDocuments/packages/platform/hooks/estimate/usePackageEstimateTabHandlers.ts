import { useCallback } from 'react';

import type { PackageFormData } from '../../form/packageForm';

export type UsePackageEstimateTabHandlersOptions = {
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
  setEstimatePresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  addEstimatePresetToForm: (presetId: string) => void;
  moveEstimatePresetInForm: (sourceId: string, targetId: string) => void;
  removeEstimatePresetFromForm: (presetId: string) => void;
};

export function usePackageEstimateTabHandlers({
  setForm,
  touchPackageData,
  setEstimatePresetToAttach,
  addEstimatePresetToForm,
  moveEstimatePresetInForm,
  removeEstimatePresetFromForm,
}: UsePackageEstimateTabHandlersOptions) {
  const onEstimateObjectChange = useCallback(
    (groupKey: string) => {
      setForm((prev) => ({ ...prev, estimateObjectGroupKey: groupKey }));
      touchPackageData();
    },
    [setForm, touchPackageData]
  );

  const onAttachPreset = useCallback(
    (presetId: string) => {
      addEstimatePresetToForm(presetId);
      setEstimatePresetToAttach('');
    },
    [addEstimatePresetToForm, setEstimatePresetToAttach]
  );

  return {
    onEstimateObjectChange,
    onAttachPreset,
    onMovePreset: moveEstimatePresetInForm,
    onRemovePreset: removeEstimatePresetFromForm,
  };
}
