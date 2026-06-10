import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../config/productDirectionPackageKind';
import { computeProductContractCostBreakdown } from '../../families/product-like/cost/productContractCostBreakdown';
import {
  applyPackageContractDiscountToAmount,
  parsePackageContractDiscountPercent,
} from '../form/packageContractDiscount';
import type { PackageFormData } from '../form/packageForm';
import { clampPackageAddendumSlotCount } from '../form/packageForm';
import type { PackagePaymentBasisOptionKey } from './packagePaymentBasisOptions';
import {
  type PaymentInvoiceLineItem,
  formatPaymentInvoiceLineAmount,
  formatPaymentInvoiceQuantity,
} from './packagePaymentInvoiceLineItems';

type EstimateSnapshot = NonNullable<PackageFormData['estimate']['snapshot']>;

export type PackageInvoiceEstimateSourceId = 'contract' | `addendum_${1 | 2 | 3 | 4 | 5}`;

export type PackageInvoiceEstimateSourceOption = {
  id: PackageInvoiceEstimateSourceId;
  label: string;
  linesCount: number;
  totalRub: number;
  disabled: boolean;
};

function countSnapshotLines(snapshot: EstimateSnapshot | null | undefined): number {
  if (!snapshot?.rooms?.length) return 0;
  return snapshot.rooms.reduce((sum, room) => sum + (room.lines?.length ?? 0), 0);
}

function sumSnapshotAmountRub(
  snapshot: EstimateSnapshot | null | undefined,
  discountPercentRaw: string
): number {
  if (!snapshot?.rooms?.length) return 0;
  const discount = parsePackageContractDiscountPercent(discountPercentRaw);
  return snapshot.rooms.reduce(
    (sum, room) =>
      sum +
      room.lines.reduce(
        (lineSum, line) => lineSum + applyPackageContractDiscountToAmount(line.amount, discount),
        0
      ),
    0
  );
}

export function packageInvoiceContractSourceLabel(
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): string {
  return isProductDirectionPackageKind(packageKind) ? 'Счёт-заказ' : 'Смета договора';
}

function snapshotForSource(
  form: PackageFormData,
  sourceId: PackageInvoiceEstimateSourceId
): EstimateSnapshot | null {
  if (sourceId === 'contract') return form.estimate.snapshot;
  const match = /^addendum_(\d)$/.exec(sourceId);
  if (!match) return null;
  const idx = Number(match[1]) - 1;
  if (idx < 0 || idx > 4) return null;
  return form.addendumSlots[idx]?.snapshot ?? null;
}

/** Документы с позициями для загрузки в счёт (смета / счёт-заказ и Д/с). */
export function buildPackageInvoiceEstimateSourceOptions(
  form: PackageFormData,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): PackageInvoiceEstimateSourceOption[] {
  const discountRaw = form.contract.discountPercent;
  const contractLinesCount = countSnapshotLines(form.estimate.snapshot);
  const contractTotalRub = sumSnapshotAmountRub(form.estimate.snapshot, discountRaw);

  const options: PackageInvoiceEstimateSourceOption[] = [
    {
      id: 'contract',
      label: packageInvoiceContractSourceLabel(packageKind),
      linesCount: contractLinesCount,
      totalRub: contractTotalRub,
      disabled: contractLinesCount === 0,
    },
  ];

  const addendumCount = clampPackageAddendumSlotCount(form.addendumSlotCount);
  for (let i = 0; i < addendumCount; i++) {
    const n = (i + 1) as 1 | 2 | 3 | 4 | 5;
    const snapshot = form.addendumSlots[i]?.snapshot ?? null;
    options.push({
      id: `addendum_${n}`,
      label: `Д/с №${n}`,
      linesCount: countSnapshotLines(snapshot),
      totalRub: sumSnapshotAmountRub(snapshot, discountRaw),
      disabled: countSnapshotLines(snapshot) === 0,
    });
  }

  return options;
}

/** Позиции счёта из сметы / счёт-заказа или Д/с (скидка по договору — на работы). */
export function paymentInvoiceLinesFromEstimateSource(
  form: PackageFormData,
  sourceId: PackageInvoiceEstimateSourceId,
  _packageKind: ContractDocumentPackageKind = 'REPAIR'
): PaymentInvoiceLineItem[] {
  const snapshot = snapshotForSource(form, sourceId);
  if (!snapshot?.rooms?.length) return [];

  const discount = parsePackageContractDiscountPercent(form.contract.discountPercent);
  const result: PaymentInvoiceLineItem[] = [];

  for (const room of snapshot.rooms) {
    for (const line of room.lines) {
      const name = line.name.trim();
      if (!name) continue;

      const amount = applyPackageContractDiscountToAmount(line.amount, discount);
      if (amount <= 0) continue;

      const quantity = line.quantity > 0 ? line.quantity : 1;
      const unitPrice = amount / quantity;

      result.push({
        lineKind: 'SERVICE',
        name,
        quantity: formatPaymentInvoiceQuantity(quantity),
        unit: (line.unit || 'шт.').trim() || 'шт.',
        vatLabel: 'Без НДС',
        unitPrice: formatPaymentInvoiceLineAmount(unitPrice),
        amount: formatPaymentInvoiceLineAmount(amount),
      });
    }
  }

  return result;
}

/** Сводка по договору для подсказки (окна: справочно, без автозагрузки в счёт). */
export function packageInvoiceContractSourceSummaryHint(
  form: PackageFormData,
  packageKind: ContractDocumentPackageKind = 'REPAIR'
): string | null {
  if (!isProductDirectionPackageKind(packageKind)) return null;
  const breakdown = computeProductContractCostBreakdown(form);
  if (breakdown.totalAmount <= 0) return null;
  const parts: string[] = [];
  if (breakdown.productsAmount > 0) {
    parts.push(`изделия по спецификации ${breakdown.productsDisplay} ₽ (в счёт вручную)`);
  }
  if (breakdown.worksAmount > 0) {
    parts.push(`работы по счёт-заказу ${breakdown.worksDisplay} ₽`);
  }
  return parts.length > 0 ? parts.join('; ') : null;
}

/** Подбор источника сметы по выбранному основанию платежа. */
export function packageInvoiceEstimateSourceFromBasisKey(
  basisKey: PackagePaymentBasisOptionKey | ''
): PackageInvoiceEstimateSourceId | '' {
  if (!basisKey) return '';
  if (
    basisKey === 'contract_prepayment' ||
    basisKey === 'contract_partial' ||
    basisKey === 'contract_final'
  ) {
    return 'contract';
  }
  const partial = /^addendum_partial_(\d)$/.exec(basisKey);
  if (partial) return `addendum_${Number(partial[1])}` as PackageInvoiceEstimateSourceId;
  const full = /^addendum_(\d)$/.exec(basisKey);
  if (full) return `addendum_${Number(full[1])}` as PackageInvoiceEstimateSourceId;
  return '';
}

export function formatPackageInvoiceEstimateSourceLabel(
  option: PackageInvoiceEstimateSourceOption
): string {
  if (option.disabled) return `${option.label} — нет позиций`;
  const total =
    option.totalRub > 0
      ? option.totalRub
          .toFixed(2)
          .replace('.', ',')
          .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      : '0,00';
  return `${option.label} — ${option.linesCount} поз., ${total} ₽`;
}
