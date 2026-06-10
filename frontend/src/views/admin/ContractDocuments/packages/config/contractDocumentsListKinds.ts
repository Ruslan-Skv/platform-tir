import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { packageKindUiLabel } from './packageDirectionRegistry';

/** Подписи направлений в списках и UI (источник — реестр пакетов). */
export const CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS: Record<ContractDocumentPackageKind, string> = {
  REPAIR: packageKindUiLabel('REPAIR'),
  WINDOWS: packageKindUiLabel('WINDOWS'),
  DOORS: packageKindUiLabel('DOORS'),
  CEILINGS: packageKindUiLabel('CEILINGS'),
  BLINDS: packageKindUiLabel('BLINDS'),
  FURNITURE: packageKindUiLabel('FURNITURE'),
};
