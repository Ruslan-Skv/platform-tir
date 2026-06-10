import type { PackageFormData } from '../form/packageForm';

/** Поля блока «Договор и объект» на вкладке «Данные». */
export type PackageContractObjectBlockFieldId =
  | 'contract.number'
  | 'contract.date'
  | 'contract.workPeriod'
  | 'contract.discountPercent'
  | 'object.objectAddress'
  | 'object.objectFloor'
  | 'object.objectDescription'
  | 'executor.selectedProfileTitle'
  | 'executor.selectedSignatoryProfileTitle';

export function snapshotPackageContractObjectBlockFields(
  data: PackageFormData
): Record<PackageContractObjectBlockFieldId, string> {
  return {
    'contract.number': data.contract.number ?? '',
    'contract.date': data.contract.date ?? '',
    'contract.workPeriod': data.contract.workPeriod ?? '',
    'contract.discountPercent': data.contract.discountPercent ?? '',
    'object.objectAddress': data.object.objectAddress ?? '',
    'object.objectFloor': data.object.objectFloor ?? '',
    'object.objectDescription': data.object.objectDescription ?? '',
    'executor.selectedProfileTitle': data.executor.selectedProfileTitle ?? '',
    'executor.selectedSignatoryProfileTitle': data.executor.selectedSignatoryProfileTitle ?? '',
  };
}
