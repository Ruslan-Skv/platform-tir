import type { CSSProperties } from 'react';

import type { ContractDocumentPackagePayment } from '@/shared/api/admin-contract-document-packages';

export function isWithinRevertWindow(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= 24 * 60 * 60 * 1000;
}

export function isWithinMsSinceIso(iso: string | null | undefined, windowMs: number): boolean {
  if (!iso?.trim()) return false;
  const ts = Date.parse(iso.trim());
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= windowMs;
}

export function sumPackagePaymentAmountsRub(rows: ContractDocumentPackagePayment[]): number {
  return rows.reduce((acc, r) => {
    const n = Number.parseFloat(r.amount);
    // Возврат денег клиенту уменьшает сумму по журналу.
    const signed = r.paymentType === 'REFUND' ? -n : n;
    return acc + (Number.isFinite(n) ? signed : 0);
  }, 0);
}

export function formatPackagePipelineActDate(raw: string): string {
  const t = raw.trim();
  if (!t) return '—';
  const d = /\d{4}-\d{2}-\d{2}/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const JOURNAL_PAY_BANNER_RGB = {
  bg0: [254, 242, 242] as const,
  bg100: [220, 252, 200] as const,
  border0: [252, 165, 165] as const,
  border100: [163, 230, 53] as const,
  text0: [153, 27, 27] as const,
  text100: [54, 83, 20] as const,
};

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mixRgb(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number
): string {
  const clamped = Math.min(1, Math.max(0, t));
  return `rgb(${lerpChannel(from[0], to[0], clamped)} ${lerpChannel(from[1], to[1], clamped)} ${lerpChannel(from[2], to[2], clamped)})`;
}

/** Фон плашки «Всего оплачено» — от красноватого (0%) до салатового (100%). */
export function getPackageContractJournalPayBannerStyle(displayPct: number): CSSProperties {
  const t = Math.min(100, Math.max(0, displayPct)) / 100;
  return {
    backgroundColor: mixRgb(JOURNAL_PAY_BANNER_RGB.bg0, JOURNAL_PAY_BANNER_RGB.bg100, t),
    borderColor: mixRgb(JOURNAL_PAY_BANNER_RGB.border0, JOURNAL_PAY_BANNER_RGB.border100, t),
    color: mixRgb(JOURNAL_PAY_BANNER_RGB.text0, JOURNAL_PAY_BANNER_RGB.text100, t),
    borderWidth: 1,
    borderStyle: 'solid',
  };
}

export const REPAIR_CONTRACT_JOURNAL_PAY_BANNER_TOOLTIP =
  'Процент считается с учётом полной стоимости договора и всех дополнительных соглашений.';

export function formatContractConcludedDateForHeader(iso: string | undefined): string | null {
  const s = iso?.trim();
  if (!s) return null;
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const base = d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${base}г.`;
  } catch {
    return null;
  }
}
