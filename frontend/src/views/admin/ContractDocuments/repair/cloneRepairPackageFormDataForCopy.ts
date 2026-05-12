import { buildPersistedFormData, mergeFormDataFromStorage } from './formDataTemplateStorage';
import { type RepairPackageFormData, defaultRepairPackageFormData } from './repairPackageForm';

/**
 * Копия пакета «Ремонт»: все данные вкладки «Данные» и шаблоны/прочие вкладки,
 * но без прикреплённых расчётов (основная смета и Д/с) и без статусов подписания/оплаты договора.
 */
export function buildFormDataForRepairPackageCopy(raw: unknown): Record<string, unknown> {
  const { form, templateOverrides, templatePresetIds } = mergeFormDataFromStorage(raw);
  const blankSlots = defaultRepairPackageFormData().addendumSlots;
  const addendumSlots = form.addendumSlots.map((cur, i) => ({
    ...blankSlots[i],
    notes: cur.notes ?? '',
    excludedNotes: cur.excludedNotes ?? '',
  })) as RepairPackageFormData['addendumSlots'];

  const next: RepairPackageFormData = {
    ...form,
    contractConcludedAt: '',
    contractPaidAt: '',
    estimate: {
      ...form.estimate,
      selectedPresetIds: [],
      selectedPresetId: '',
      snapshot: null,
    },
    addendumSlots,
    finalEstimateInstallerAssignments: {},
    estimateObjectGroupKey: '',
  };

  return buildPersistedFormData(next, templateOverrides, templatePresetIds);
}
