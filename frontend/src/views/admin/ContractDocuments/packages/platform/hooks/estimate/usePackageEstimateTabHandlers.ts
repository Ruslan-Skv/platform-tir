import { useCallback } from 'react';

import type { PackageContractDiscountType, PackageFormData } from '../../form/types';
import type { PackageContractBlock } from '../../form/types';

export type UsePackageEstimateTabHandlersOptions = {
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
  setEstimatePresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  addEstimatePresetToForm: (presetId: string) => void;
  moveEstimatePresetInForm: (sourceId: string, targetId: string) => void;
  removeEstimatePresetFromForm: (presetId: string) => void;
  /** Обновление полей договора (вкладка «Данные») — для поля скидки на вкладке «Смета». */
  updateContract: <K extends keyof PackageContractBlock>(key: K, value: string) => void;
};

export function usePackageEstimateTabHandlers({
  setForm,
  touchPackageData,
  setEstimatePresetToAttach,
  addEstimatePresetToForm,
  moveEstimatePresetInForm,
  removeEstimatePresetFromForm,
  updateContract,
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
    onContractDiscountTypeChange: useCallback(
      (value: string) => updateContract('discountType', value as PackageContractDiscountType),
      [updateContract]
    ),
    onContractDiscountPercentChange: useCallback(
      (value: string) => updateContract('discountPercent', value),
      [updateContract]
    ),
    onContractDiscountAmountChange: useCallback(
      (value: string) => updateContract('discountAmount', value),
      [updateContract]
    ),
  };
}
