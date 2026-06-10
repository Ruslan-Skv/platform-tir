import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { getPackageDirectionConfig } from '../config';

/** Каталог расчётов для вкладки прикрепления сметы/счёт-заказа. */
export function packageEstimatePresetsCatalogKind(
  packageKind: ContractDocumentPackageKind
): ContractDocumentPackageKind {
  return getPackageDirectionConfig(packageKind).estimateCatalogKind;
}

/** Справочник исполнителей для пакета. */
export function packageExecutorProfilesKind(
  packageKind: ContractDocumentPackageKind
): ContractDocumentPackageKind {
  return getPackageDirectionConfig(packageKind).profilesKind;
}

/** Справочник менеджеров для пакета. */
export function packageSignatoryProfilesKind(
  packageKind: ContractDocumentPackageKind
): ContractDocumentPackageKind {
  return getPackageDirectionConfig(packageKind).profilesKind;
}

/** Настройки срока / наценки заказ-наряда. */
export function packageContractSettingsKind(
  packageKind: ContractDocumentPackageKind
): ContractDocumentPackageKind {
  return getPackageDirectionConfig(packageKind).settingsKind;
}

/** Пресеты шаблонов документов в редакторе. */
export function packageTemplatePresetsKind(
  packageKind: ContractDocumentPackageKind
): ContractDocumentPackageKind {
  return getPackageDirectionConfig(packageKind).templatePresetsKind;
}
