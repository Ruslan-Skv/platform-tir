'use client';

import { useCallback } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { applyEstimatePresetIdsToPackageForm } from '../../estimates/applyEstimatePresetIds';
import type { PackageFormData } from '../../form/packageForm';

export type UsePackageEstimatePresetHandlersOptions = {
  signedDocsLocked: boolean;
  form: PackageFormData;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  setDirty: (dirty: boolean) => void;
  formRef: React.MutableRefObject<PackageFormData>;
  estimatePresets: ContractEstimatePreset[];
  estimateGroups: ContractEstimateGroup[];
  schedulePersistDebounced: () => void;
  /** Продуктовые направления: пересчёт сметы сохраняет в итоге договора стоимость изделий. */
  productDirection?: boolean;
};

export function usePackageEstimatePresetHandlers({
  signedDocsLocked,
  form,
  setForm,
  setDirty,
  formRef,
  estimatePresets,
  estimateGroups,
  schedulePersistDebounced,
  productDirection,
}: UsePackageEstimatePresetHandlersOptions) {
  /**
   * `override` — свежие списки пресетов/объектов для прикрепления только что созданного
   * расчёта: state контроллера обновлён в том же тике, замыкание ещё его не видит.
   */
  const applyEstimatePresetIdsToForm = useCallback(
    (
      presetIds: string[],
      override?: {
        presets: ContractEstimatePreset[];
        groups: ContractEstimateGroup[];
      }
    ) => {
      if (signedDocsLocked) return;
      const presets = override?.presets ?? estimatePresets;
      const groups = override?.groups ?? estimateGroups;
      setForm((p) => {
        const uniqueIds = [...new Set(presetIds.filter(Boolean))];
        const nextForm = applyEstimatePresetIdsToPackageForm(p, uniqueIds, presets, groups, {
          productDirection,
        });
        formRef.current = nextForm;
        schedulePersistDebounced();
        return nextForm;
      });
      setDirty(true);
    },
    [
      signedDocsLocked,
      setForm,
      estimatePresets,
      estimateGroups,
      formRef,
      schedulePersistDebounced,
      setDirty,
      productDirection,
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
