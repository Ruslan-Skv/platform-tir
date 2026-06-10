import type { ContractDocumentPackagePayment } from '@/shared/api/admin-contract-document-packages';
import type { ContractDocumentPackagePaymentKind } from '@/shared/api/admin-contract-document-packages';

import { type PackageFormData, clampPackageAddendumSlotCount } from '../form/packageForm';
import type { PackagePayableBreakdown } from './packagePaymentTotals';

export const PACKAGE_BASIS_LABEL_PREPAYMENT = 'предоплата по договору';
export const PACKAGE_BASIS_LABEL_PARTIAL = 'частичная оплата по договору';
export const PACKAGE_BASIS_LABEL_FINAL = 'окончательный расчёт по договору';

export function packageAddendumBasisLabel(addendumNumber: number): string {
  return `оплата по д/с ${addendumNumber}`;
}

export function packageAddendumPartialBasisLabel(addendumNumber: number): string {
  return `частичная оплата по д/с ${addendumNumber}`;
}

export type PackagePaymentBasisOptionKey =
  | 'contract_prepayment'
  | 'contract_partial'
  | 'contract_final'
  | `addendum_${number}`
  | `addendum_partial_${number}`;

export type PackagePaymentBasisOption = {
  key: PackagePaymentBasisOptionKey;
  label: string;
  paymentType: ContractDocumentPackagePaymentKind;
  addendumNumber?: number;
  disabled: boolean;
};

const PAYMENT_AMOUNT_TOLERANCE_RUB = 0.5;

function paymentAmountRub(row: ContractDocumentPackagePayment): number {
  const n = Number.parseFloat(row.amount);
  return Number.isFinite(n) ? n : 0;
}

function basisTextMatches(row: ContractDocumentPackagePayment, label: string): boolean {
  return (row.basis ?? '').trim().toLowerCase() === label.trim().toLowerCase();
}

function hasContractBasisPayment(
  rows: ContractDocumentPackagePayment[],
  paymentType: ContractDocumentPackagePaymentKind,
  label: string
): boolean {
  return rows.some((r) => {
    if (basisTextMatches(r, label)) return true;
    if (r.paymentType !== paymentType || r.paymentType === 'AMENDMENT') return false;
    if (paymentType === 'PREPAYMENT' || paymentType === 'FINAL') return true;
    if (paymentType === 'ADVANCE') {
      return inferLegacyContractBasisMatch(r, 'ADVANCE');
    }
    return false;
  });
}

/** Старые формулировки в журнале до фиксированного списка. */
function inferLegacyContractBasisMatch(
  row: ContractDocumentPackagePayment,
  paymentType: ContractDocumentPackagePaymentKind
): boolean {
  const b = (row.basis ?? '').toLowerCase();
  if (paymentType === 'PREPAYMENT') return /предоплат|аванс/i.test(b);
  if (paymentType === 'FINAL') return /окончательн|приёмк|приемк|сдач/i.test(b);
  if (paymentType === 'ADVANCE')
    return /частичн/i.test(b) || (!/д\/с|доп\.?\s*соглашен/i.test(b) && /оплат/i.test(b));
  return false;
}

/** Сумма оплат по Д/с №N (все проводки с этим номером доп. соглашения). */
export function sumPackageAddendumPaidRub(
  rows: ContractDocumentPackagePayment[],
  addendumNumber: number
): number {
  return rows.reduce((acc, r) => {
    if (r.paymentType === 'AMENDMENT' && r.addendumNumber === addendumNumber) {
      return acc + paymentAmountRub(r);
    }
    return acc;
  }, 0);
}

function sumPaidForAddendum(
  rows: ContractDocumentPackagePayment[],
  addendumNumber: number,
  label: string
): number {
  const byNumber = sumPackageAddendumPaidRub(rows, addendumNumber);
  const byLabel = rows.reduce((acc, r) => {
    if (r.paymentType === 'AMENDMENT' && basisTextMatches(r, label)) {
      return acc + paymentAmountRub(r);
    }
    return acc;
  }, 0);
  return Math.max(byNumber, byLabel);
}

function isAddendumBasisSatisfied(
  rows: ContractDocumentPackagePayment[],
  addendumNumber: number,
  label: string,
  totalRub: number | null | undefined
): boolean {
  if (totalRub == null || !Number.isFinite(totalRub) || totalRub <= 0) return false;
  const paid = sumPaidForAddendum(rows, addendumNumber, label);
  return paid >= totalRub - PAYMENT_AMOUNT_TOLERANCE_RUB;
}

export function buildPackagePaymentBasisOptions(
  form: PackageFormData,
  rows: ContractDocumentPackagePayment[],
  breakdown: PackagePayableBreakdown
): PackagePaymentBasisOption[] {
  const options: PackagePaymentBasisOption[] = [
    {
      key: 'contract_prepayment',
      label: PACKAGE_BASIS_LABEL_PREPAYMENT,
      paymentType: 'PREPAYMENT',
      disabled: hasContractBasisPayment(rows, 'PREPAYMENT', PACKAGE_BASIS_LABEL_PREPAYMENT),
    },
    {
      key: 'contract_partial',
      label: PACKAGE_BASIS_LABEL_PARTIAL,
      paymentType: 'ADVANCE',
      disabled: false,
    },
    {
      key: 'contract_final',
      label: PACKAGE_BASIS_LABEL_FINAL,
      paymentType: 'FINAL',
      disabled: hasContractBasisPayment(rows, 'FINAL', PACKAGE_BASIS_LABEL_FINAL),
    },
  ];

  const count = Math.min(5, clampPackageAddendumSlotCount(form.addendumSlotCount));
  for (let i = 0; i < count; i++) {
    const n = i + 1;
    const slot = form.addendumSlots[i];
    const raw = slot?.snapshot?.total;
    const totalRub = breakdown.addendumTotalsRub.find((a) => a.slotIndex1 === n)?.totalRub ?? null;

    options.push({
      key: `addendum_partial_${n}`,
      label: packageAddendumPartialBasisLabel(n),
      paymentType: 'AMENDMENT',
      addendumNumber: n,
      disabled: false,
    });

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      const label = packageAddendumBasisLabel(n);
      options.push({
        key: `addendum_${n}`,
        label,
        paymentType: 'AMENDMENT',
        addendumNumber: n,
        disabled: isAddendumBasisSatisfied(rows, n, label, totalRub),
      });
    }
  }

  return options;
}

export function packagePaymentBasisOptionByKey(
  options: PackagePaymentBasisOption[],
  key: PackagePaymentBasisOptionKey | ''
): PackagePaymentBasisOption | undefined {
  if (!key) return undefined;
  return options.find((o) => o.key === key);
}

export function firstEnabledPackagePaymentBasisKey(
  options: PackagePaymentBasisOption[]
): PackagePaymentBasisOptionKey | '' {
  return options.find((o) => !o.disabled)?.key ?? '';
}
