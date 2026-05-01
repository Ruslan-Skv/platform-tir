import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import {
  getContractDocumentPackage,
  updateContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';

import { buildPersistedFormData, mergeFormDataFromStorage } from './formDataTemplateStorage';
import { applyEstimatePresetIdsToRepairForm } from './repairApplyEstimatePresetIds';

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
  presets: ContractEstimatePreset[]
): Promise<void> {
  const row = await getContractDocumentPackage(packageId);
  const { form, templateOverrides, templatePresetIds } = mergeFormDataFromStorage(row.formData);
  const nextIds = normalizedEstimateIdsFromForm(form).filter((id) => id !== presetIdToRemove);
  const nextForm = applyEstimatePresetIdsToRepairForm(form, nextIds, presets);
  const formData = buildPersistedFormData(nextForm, templateOverrides, templatePresetIds);
  await updateContractDocumentPackage(packageId, {
    title: row.title?.trim() || null,
    formData,
    crmContractId: row.crmContractId ?? null,
  });
}
