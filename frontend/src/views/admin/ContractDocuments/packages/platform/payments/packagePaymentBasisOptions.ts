import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import type { ContractDocumentPackagePayment } from '@/shared/api/admin-contract-document-packages';
import type { ContractDocumentPackagePaymentKind } from '@/shared/api/admin-contract-document-packages';

import { isFurnitureLikePackageKind } from '../../config';
import type { FurniturePackageLegId } from '../../directions/furniture/furnitureLegs';
import {
  furniturePaymentBasisLabel,
  resolveFurniturePaymentLeg,
  sumFurnitureLegPaidRub,
} from '../../directions/furniture/furniturePaymentLeg';
import { type PackageFormData, clampPackageAddendumSlotCount } from '../form/packageForm';
import type { PackagePayableBreakdown } from './packagePaymentTotals';

export const PACKAGE_BASIS_LABEL_PREPAYMENT = 'предоплата по договору';
export const PACKAGE_BASIS_LABEL_PARTIAL = 'частичная оплата по договору';
export const PACKAGE_BASIS_LABEL_FINAL = 'окончательный расчёт по договору';
export const PACKAGE_BASIS_LABEL_FULL = 'полная оплата по договору';
export const PACKAGE_BASIS_LABEL_REFUND = 'возврат денежных средств клиенту';

export function packageAddendumBasisLabel(addendumNumber: number): string {
  return `оплата по д/с ${addendumNumber}`;
}

export function packageAddendumPartialBasisLabel(addendumNumber: number): string {
  return `частичная оплата по д/с ${addendumNumber}`;
}

export type PackageFurniturePaymentBasisKind = 'prepayment' | 'partial' | 'final';

export type PackagePaymentBasisOptionKey =
  | 'contract_prepayment'
  | 'contract_partial'
  | 'contract_full'
  | 'contract_final'
  | 'contract_refund'
  | `addendum_${number}`
  | `addendum_partial_${number}`
  | `furniture_${FurniturePackageLegId}_${PackageFurniturePaymentBasisKind}`;

export type PackagePaymentBasisOption = {
  key: PackagePaymentBasisOptionKey;
  label: string;
  paymentType: ContractDocumentPackagePaymentKind;
  addendumNumber?: number;
  furnitureLeg?: FurniturePackageLegId;
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

function hasFurnitureLegBasisPayment(
  rows: ContractDocumentPackagePayment[],
  leg: FurniturePackageLegId,
  paymentType: ContractDocumentPackagePaymentKind,
  label: string
): boolean {
  return rows.some((r) => {
    if (resolveFurniturePaymentLeg(r) !== leg) return false;
    if (basisTextMatches(r, label)) return true;
    return r.paymentType === paymentType;
  });
}

/** Старые формулировки в журнале до фиксированного списка. */
function inferLegacyContractBasisMatch(
  row: ContractDocumentPackagePayment,
  paymentType: ContractDocumentPackagePaymentKind
): boolean {
  const b = (row.basis ?? '').toLowerCase();
  if (paymentType === 'PREPAYMENT') return /предоплат|аванс|полная оплата/i.test(b);
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

function appendAddendumBasisOptions(
  options: PackagePaymentBasisOption[],
  form: PackageFormData,
  rows: ContractDocumentPackagePayment[],
  breakdown: PackagePayableBreakdown
): void {
  const count = Math.min(5, clampPackageAddendumSlotCount(form.addendumSlotCount));
  for (let i = 0; i < count; i++) {
    const n = i + 1;
    const totalRub = breakdown.addendumTotalsRub.find((a) => a.slotIndex1 === n)?.totalRub ?? null;

    options.push({
      key: `addendum_partial_${n}`,
      label: packageAddendumPartialBasisLabel(n),
      paymentType: 'AMENDMENT',
      addendumNumber: n,
      disabled: false,
    });

    // Полная оплата доступна, когда известен итог Д/с: прикреплённый расчёт
    // или вручную заполненные блоки (например, «Изменения в Спецификации»).
    if (totalRub != null && Number.isFinite(totalRub) && totalRub > 0) {
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
}

function buildFurniturePaymentBasisOptions(
  form: PackageFormData,
  rows: ContractDocumentPackagePayment[],
  breakdown: PackagePayableBreakdown
): PackagePaymentBasisOption[] {
  const options: PackagePaymentBasisOption[] = [];
  const legs = breakdown.furnitureLegs ?? [];

  for (const leg of legs) {
    const prepayLabel = furniturePaymentBasisLabel(leg.legId, 'prepayment');
    const partialLabel = furniturePaymentBasisLabel(leg.legId, 'partial');
    const finalLabel = furniturePaymentBasisLabel(leg.legId, 'final');
    const paid = sumFurnitureLegPaidRub(rows, leg.legId);
    const total = leg.totalRub;
    const fullyPaid =
      total != null &&
      Number.isFinite(total) &&
      total > 0 &&
      paid >= total - PAYMENT_AMOUNT_TOLERANCE_RUB;

    options.push({
      key: `furniture_${leg.legId}_prepayment`,
      label: prepayLabel,
      paymentType: 'PREPAYMENT',
      furnitureLeg: leg.legId,
      disabled:
        hasFurnitureLegBasisPayment(rows, leg.legId, 'PREPAYMENT', prepayLabel) || fullyPaid,
    });
    options.push({
      key: `furniture_${leg.legId}_partial`,
      label: partialLabel,
      paymentType: 'ADVANCE',
      furnitureLeg: leg.legId,
      disabled: fullyPaid,
    });
    options.push({
      key: `furniture_${leg.legId}_final`,
      label: finalLabel,
      paymentType: 'FINAL',
      furnitureLeg: leg.legId,
      disabled: hasFurnitureLegBasisPayment(rows, leg.legId, 'FINAL', finalLabel) || fullyPaid,
    });
  }

  appendAddendumBasisOptions(options, form, rows, breakdown);
  return options;
}

export function buildPackagePaymentBasisOptions(
  form: PackageFormData,
  rows: ContractDocumentPackagePayment[],
  breakdown: PackagePayableBreakdown,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): PackagePaymentBasisOption[] {
  const options: PackagePaymentBasisOption[] = isFurnitureLikePackageKind(packageKind)
    ? buildFurniturePaymentBasisOptions(form, rows, breakdown)
    : [
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
        {
          key: 'contract_full',
          label: PACKAGE_BASIS_LABEL_FULL,
          paymentType: 'FINAL',
          disabled: hasContractBasisPayment(rows, 'FINAL', PACKAGE_BASIS_LABEL_FULL),
        },
      ];

  if (!isFurnitureLikePackageKind(packageKind)) {
    appendAddendumBasisOptions(options, form, rows, breakdown);
  }
  // Возврат доступен всегда: расторжение договора, «отрицательное» Д/с и т.п.
  options.push({
    key: 'contract_refund',
    label: PACKAGE_BASIS_LABEL_REFUND,
    paymentType: 'REFUND',
    disabled: false,
  });
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
