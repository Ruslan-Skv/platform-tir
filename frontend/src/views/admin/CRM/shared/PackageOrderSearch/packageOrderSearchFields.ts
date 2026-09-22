import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import { CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS } from '@/views/admin/ContractDocuments/packages/config';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function trimStr(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function formStrFromPackage(pkg: ContractDocumentPackage, key: string): string {
  const formData = asRecord(pkg.formData) || {};
  return trimStr(formData[key]);
}

/** Nested WINDOWS/DOORS/… formData: contract.*, customer.*, object.* (+ flat legacy keys). */
export function packageFormFields(pkg: ContractDocumentPackage) {
  const formData = asRecord(pkg.formData) || {};
  const contract = asRecord(formData.contract) || {};
  const customer = asRecord(formData.customer) || {};
  const object = asRecord(formData.object) || {};

  const contractNumber =
    trimStr(contract.number) ||
    formStrFromPackage(pkg, 'contractNumber') ||
    formStrFromPackage(pkg, 'dogovorNumber');

  const customerName =
    trimStr(customer.fullName) ||
    trimStr(customer.organizationName) ||
    trimStr(customer.representativeFullNameNominative) ||
    formStrFromPackage(pkg, 'customerName') ||
    formStrFromPackage(pkg, 'clientFullName') ||
    formStrFromPackage(pkg, 'fio');

  const customerEmail = trimStr(customer.email) || formStrFromPackage(pkg, 'customerEmail');

  const phoneCandidates: string[] = [];
  const pushPhone = (value: unknown) => {
    const phone = trimStr(value);
    if (phone && !phoneCandidates.includes(phone)) phoneCandidates.push(phone);
  };
  pushPhone(customer.phone);
  if (Array.isArray(customer.phones)) {
    for (const phone of customer.phones) pushPhone(phone);
  }
  pushPhone(formData.customerPhone);
  pushPhone(formData.clientPhone);
  pushPhone(formData.phone);

  const objectAddress =
    trimStr(pkg.documentObject?.address) ||
    trimStr(object.objectAddress) ||
    trimStr(object.address) ||
    formStrFromPackage(pkg, 'objectAddress');

  const customerAddress =
    trimStr(customer.address) ||
    formStrFromPackage(pkg, 'customerAddress') ||
    formStrFromPackage(pkg, 'address');

  return {
    contractNumber,
    customerName,
    customerEmail,
    customerPhones: phoneCandidates,
    objectAddress,
    customerAddress,
    displayAddress: objectAddress || customerAddress,
  };
}

export function packageAssignedInstallerIds(pkg: ContractDocumentPackage): string[] {
  const raw = asRecord(pkg.formData) || {};
  const list = raw.selectedRepairInstallerIds;
  if (!Array.isArray(list)) return [];
  return list.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean);
}

export function packageResultTitle(pkg: ContractDocumentPackage): string {
  const fields = packageFormFields(pkg);
  return (
    fields.customerName ||
    (fields.contractNumber ? `Договор №${fields.contractNumber}` : '') ||
    trimStr(pkg.title) ||
    'Заказ'
  );
}

export function packageResultMeta(pkg: ContractDocumentPackage): string {
  const fields = packageFormFields(pkg);
  const kindLabel = CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS[pkg.kind] ?? pkg.kind;
  return [
    fields.customerPhones[0] || null,
    fields.customerEmail || null,
    kindLabel,
    fields.contractNumber ? `№${fields.contractNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function packageResultAddress(pkg: ContractDocumentPackage): string {
  return packageFormFields(pkg).displayAddress;
}

/** Подпись выбранного заказа для поля поиска. */
export function packageSearchLabel(pkg: ContractDocumentPackage): string {
  const fields = packageFormFields(pkg);
  return (
    [fields.customerName, fields.contractNumber ? `№${fields.contractNumber}` : null]
      .filter(Boolean)
      .join(' · ') || packageResultTitle(pkg)
  );
}
