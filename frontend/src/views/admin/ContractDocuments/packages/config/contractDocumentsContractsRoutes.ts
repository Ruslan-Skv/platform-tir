/** Маршруты раздела «Договора» (пакеты документов по направлению «Ремонт»). */

export const ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF = '/admin/contract-documents/contracts';

/** @deprecated Используйте {@link ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF} */
export const ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_REPAIR_HREF =
  ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF;

export function adminContractDocumentsContractsRepairPackageHref(packageId: string): string {
  return `${ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}/${packageId}`;
}
