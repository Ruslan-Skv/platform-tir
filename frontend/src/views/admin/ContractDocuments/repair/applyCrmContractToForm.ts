import type { Contract } from '@/shared/api/admin-crm';

import type { RepairPackageFormData } from './repairPackageForm';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = String(iso);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function formatMoney(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Заполняет поля формы из карточки CRM (не затирает непустые значения заказчика, если в CRM пусто). */
export function mergeRepairFormFromCrmContract(
  c: Contract,
  prev: RepairPackageFormData
): RepairPackageFormData {
  const customerName = c.customerName?.trim();
  const customerAddress = c.customerAddress?.trim();
  const customerPhone = c.customerPhone?.trim();
  const total = formatMoney(c.totalAmount);
  const advance = formatMoney(c.advanceAmount);

  return {
    ...prev,
    customer: {
      ...prev.customer,
      fullName: customerName || prev.customer.fullName,
      address: customerAddress || prev.customer.address,
      phone: customerPhone || prev.customer.phone,
    },
    object: {
      ...prev.object,
      objectAddress: customerAddress || prev.object.objectAddress,
    },
    contract: {
      ...prev.contract,
      number: c.contractNumber || prev.contract.number,
      date: formatDate(c.contractDate) || prev.contract.date,
      totalAmount: total || prev.contract.totalAmount,
      prepaymentAmount: advance || prev.contract.prepaymentAmount,
    },
  };
}
