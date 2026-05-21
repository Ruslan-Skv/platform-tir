import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

export const CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS: Record<ContractDocumentPackageKind, string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Потолки',
  BLINDS: 'Жалюзи',
  FURNITURE: 'Мебель',
};
