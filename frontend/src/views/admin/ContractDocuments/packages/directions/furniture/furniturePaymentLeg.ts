import type { ContractDocumentPackagePayment } from '@/shared/api/admin-contract-document-packages';

import {
  FURNITURE_LEG_LABEL,
  type FurniturePackageLegId,
} from '../../directions/furniture/furnitureLegs';

const LEG_IDS: readonly FurniturePackageLegId[] = ['manufacture', 'montage', 'appliances'];

const NOTES_LEG_RE = /^furnitureLeg=(manufacture|montage|appliances)(?:\n|$)/;

/** Машинная метка ноги в `notes` журнала (без отдельной колонки БД). */
export function encodeFurniturePaymentLegNotes(
  leg: FurniturePackageLegId,
  extraNotes?: string
): string {
  const marker = `furnitureLeg=${leg}`;
  const rest = extraNotes?.trim() ?? '';
  return rest ? `${marker}\n${rest}` : marker;
}

export function parseFurniturePaymentLegFromNotes(
  notes: string | null | undefined
): FurniturePackageLegId | null {
  const m = NOTES_LEG_RE.exec((notes ?? '').trim());
  if (!m) return null;
  return m[1] as FurniturePackageLegId;
}

/** Подпись основания: «Изготовление · предоплата по договору». */
export function furniturePaymentBasisLabel(
  leg: FurniturePackageLegId,
  kind: 'prepayment' | 'partial' | 'final'
): string {
  const legLabel = FURNITURE_LEG_LABEL[leg];
  if (kind === 'prepayment') {
    return leg === 'appliances'
      ? `${legLabel} · полная оплата по договору`
      : `${legLabel} · предоплата по договору`;
  }
  if (kind === 'partial') return `${legLabel} · частичная оплата по договору`;
  return `${legLabel} · окончательный расчёт по договору`;
}

export function parseFurniturePaymentLegFromBasis(
  basis: string | null | undefined
): FurniturePackageLegId | null {
  const b = (basis ?? '').trim().toLowerCase();
  if (!b) return null;
  for (const leg of LEG_IDS) {
    const label = FURNITURE_LEG_LABEL[leg].toLowerCase();
    if (b.startsWith(`${label} ·`) || b.startsWith(`${label} ·`.replace(' ·', '·'))) {
      return leg;
    }
    if (b.startsWith(label)) return leg;
  }
  return null;
}

export function resolveFurniturePaymentLeg(
  row: Pick<ContractDocumentPackagePayment, 'notes' | 'basis'>
): FurniturePackageLegId | null {
  return (
    parseFurniturePaymentLegFromNotes(row.notes) ?? parseFurniturePaymentLegFromBasis(row.basis)
  );
}

export function sumFurnitureLegPaidRub(
  rows: ContractDocumentPackagePayment[],
  leg: FurniturePackageLegId
): number {
  return rows.reduce((acc, r) => {
    if (resolveFurniturePaymentLeg(r) !== leg) return acc;
    const n = Number.parseFloat(r.amount);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function furniturePaymentLegDisplayLabel(
  row: Pick<ContractDocumentPackagePayment, 'notes' | 'basis'>
): string {
  const leg = resolveFurniturePaymentLeg(row);
  return leg ? FURNITURE_LEG_LABEL[leg] : '—';
}
