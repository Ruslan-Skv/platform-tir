/** Маршруты подраздела «Договора» (список направлений и пакеты по направлению «Ремонт»). */

export const ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF = '/admin/contract-documents/contracts';

export const ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_REPAIR_HREF = `${ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}/repair`;

export function adminContractDocumentsContractsRepairPackageHref(packageId: string): string {
  return `${ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_REPAIR_HREF}/${packageId}`;
}
