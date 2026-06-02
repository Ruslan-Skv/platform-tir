import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

/** Каталог расчётов для вкладки прикрепления: «Окна» используют общий пул REPAIR (страница /estimates). */
export function estimatePresetsCatalogKind(
  packageKind: ContractDocumentPackageKind
): ContractDocumentPackageKind {
  return packageKind === 'WINDOWS' ? 'REPAIR' : packageKind;
}
