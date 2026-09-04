import { parseLinkedCrmCustomerIdFromFormData } from '../questionnaires/crmManagerQuestionnaire1';
import { defaultPackageFormData } from './defaults';
import { buildPersistedFormData, mergeFormDataFromStorage } from './formDataTemplateStorage';
import type { PackageFormData } from './types';

/**
 * Копия пакета «Ремонт»: все данные вкладки «Данные» и шаблоны/прочие вкладки,
 * но без прикреплённых расчётов (основная смета и Д/с) и без статусов подписания/оплаты договора.
 */
export function buildFormDataForPackageCopy(raw: unknown): Record<string, unknown> {
  const { form, templateOverrides, templatePresetIds } = mergeFormDataFromStorage(raw);
  const linkedCrmCustomerId = parseLinkedCrmCustomerIdFromFormData(raw);
  const blankSlots = defaultPackageFormData().addendumSlots;
  const addendumSlots = form.addendumSlots.map((cur, i) => ({
    ...blankSlots[i],
    notes: cur.notes ?? '',
    excludedNotes: cur.excludedNotes ?? '',
  })) as PackageFormData['addendumSlots'];

  const next: PackageFormData = {
    ...form,
    contractConcludedAt: '',
    contractRefusalReason: '',
    contractRefusedAt: '',
    contractPaidAt: '',
    repairWorkStartActSignedAt: '',
    repairWorkStartActPhotoUrl: '',
    repairContractCloseActSignedAt: '',
    repairContractCloseActPhotoUrl: '',
    productSpecificationAmount: '',
    productSpecificationFileUrl: '',
    productSpecificationFileName: '',
    doorsSpecificationLines: defaultPackageFormData().doorsSpecificationLines,
    doorsSpecificationDiscountPercent: '',
    ceilingsSpecification: defaultPackageFormData().ceilingsSpecification,
    furniture: {
      ...form.furniture,
      manufactureDocs: defaultPackageFormData().furniture.manufactureDocs,
    },
    estimate: {
      ...form.estimate,
      selectedPresetIds: [],
      selectedPresetId: '',
      snapshot: null,
    },
    addendumSlots,
    finalEstimateInstallerAssignments: {},
    estimateObjectGroupKey: '',
    issuedInvoices: [],
  };

  const fd = buildPersistedFormData(next, templateOverrides, templatePresetIds, {
    linkedCrmCustomerId,
  });
  delete fd.repairContractClosed;
  delete fd.contractClosed;
  delete fd.repairContractClientRefused;
  return fd;
}
