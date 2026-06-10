import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { packageEstimatePresetsCatalogKind } from '../catalogKinds';

/** Каталог расчётов для вкладки прикрепления: «Окна» и «Двери» используют общий пул REPAIR. */
export function estimatePresetsCatalogKind(
  packageKind: ContractDocumentPackageKind
): ContractDocumentPackageKind {
  return packageEstimatePresetsCatalogKind(packageKind);
}
