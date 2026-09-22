import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import { getDisplayContractNumber } from '@/views/admin/ContractDocuments/packages/platform/form/packageContractDisplay';

export type WaybillPackagePick = {
  number: string;
  customerName: string;
  customerAddress: string;
  customerPhones: string[];
};

function formBlock(
  formData: Record<string, unknown> | undefined,
  key: string
): Record<string, unknown> {
  const block = formData?.[key];
  return block && typeof block === 'object' ? (block as Record<string, unknown>) : {};
}

function formString(block: Record<string, unknown>, key: string): string {
  const value = block[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Данные договора-пакета для автозаполнения полей накладной. */
export function waybillPackagePick(pkg: ContractDocumentPackage): WaybillPackagePick {
  const customer = formBlock(pkg.formData, 'customer');
  const phonesRaw = customer.phones;
  const phones = Array.isArray(phonesRaw)
    ? phonesRaw
        .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
        .map((p) => p.trim())
    : [];
  const singlePhone = formString(customer, 'phone');
  const displayNumber = getDisplayContractNumber(pkg).trim();
  return {
    number: displayNumber && displayNumber !== '—' ? displayNumber : '',
    customerName: pkg.documentObject?.customerName?.trim() || formString(customer, 'fullName'),
    customerAddress: pkg.documentObject?.address?.trim() || formString(customer, 'address'),
    customerPhones: phones.length > 0 ? phones : singlePhone ? [singlePhone] : [],
  };
}

/** Подпись варианта в списке поиска договоров. */
export function waybillPackageHitLabel(pkg: ContractDocumentPackage): string {
  const pick = waybillPackagePick(pkg);
  return [pick.number || 'без номера', pick.customerName || 'без имени'].join(' — ');
}
