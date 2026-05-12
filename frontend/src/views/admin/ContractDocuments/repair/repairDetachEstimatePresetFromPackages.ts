import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import {
  getContractDocumentPackage,
  updateContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';

import { buildPersistedFormData, mergeFormDataFromStorage } from './formDataTemplateStorage';
import {
  applyEstimatePresetIdsToAddendumSlot,
  applyEstimatePresetIdsToRepairForm,
} from './repairApplyEstimatePresetIds';

function normalizedEstimateIdsFromForm(form: {
  estimate: { selectedPresetIds?: string[]; selectedPresetId?: string };
}): string[] {
  return [
    ...new Set([
      ...(Array.isArray(form.estimate.selectedPresetIds)
        ? form.estimate.selectedPresetIds.filter(
            (x): x is string => typeof x === 'string' && x.trim().length > 0
          )
        : []),
      ...(form.estimate.selectedPresetId?.trim() ? [form.estimate.selectedPresetId.trim()] : []),
    ]),
  ];
}

/** Убирает пресет из сметы пакета и сохраняет пакет на сервер. */
export async function persistRepairPackageAfterRemovingEstimatePreset(
  packageId: string,
  presetIdToRemove: string,
  presets: ContractEstimatePreset[],
  estimateGroups: ContractEstimateGroup[] = []
): Promise<void> {
  const row = await getContractDocumentPackage(packageId);
  const { form, templateOverrides, templatePresetIds } = mergeFormDataFromStorage(row.formData);
  const nextIds = normalizedEstimateIdsFromForm(form).filter((id) => id !== presetIdToRemove);
  let nextForm = applyEstimatePresetIdsToRepairForm(form, nextIds, presets, estimateGroups);
  for (let i = 0; i < 5; i++) {
    const slot = nextForm.addendumSlots[i];
    const add = [...(slot.selectedPresetIds ?? [])].filter((id) => id !== presetIdToRemove);
    const exc = [...(slot.excludedSelectedPresetIds ?? [])].filter((id) => id !== presetIdToRemove);
    if (
      add.length === (slot.selectedPresetIds?.length ?? 0) &&
      exc.length === (slot.excludedSelectedPresetIds?.length ?? 0)
    ) {
      continue;
    }
    nextForm = applyEstimatePresetIdsToAddendumSlot(
      nextForm,
      i,
      add,
      presets,
      estimateGroups,
      'additional',
      true
    );
    nextForm = applyEstimatePresetIdsToAddendumSlot(
      nextForm,
      i,
      exc,
      presets,
      estimateGroups,
      'excluded',
      true
    );
  }
  const formData = buildPersistedFormData(nextForm, templateOverrides, templatePresetIds);
  await updateContractDocumentPackage(packageId, {
    title: row.title?.trim() || null,
    formData,
    crmContractId: row.crmContractId ?? null,
    recordVersion: true,
  });
}
