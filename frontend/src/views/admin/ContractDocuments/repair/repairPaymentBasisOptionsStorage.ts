import type { ContractDocumentPackagePaymentKind } from '@/shared/api/admin-contract-document-packages';

/**
 * Пользовательские варианты «Основание платежа» для журнала оплат (ремонт).
 * Хранятся в localStorage браузера — общий список для всех пакетов на этом устройстве.
 */
export const REPAIR_PAYMENT_BASIS_OPTIONS_STORAGE_KEY =
  'admin.contractDocuments.repair.paymentBasisOptions';

const MAX_OPTIONS = 150;
const MAX_OPTION_LENGTH = 2000;

function normalizeList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    const t = x.trim();
    if (!t || t.length > MAX_OPTION_LENGTH) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_OPTIONS) break;
  }
  return out;
}

export function readRepairPaymentBasisOptions(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(REPAIR_PAYMENT_BASIS_OPTIONS_STORAGE_KEY);
    if (!raw?.trim()) return [];
    return normalizeList(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function writeRepairPaymentBasisOptions(items: string[]): void {
  if (typeof window === 'undefined') return;
  const next = normalizeList(items);
  window.localStorage.setItem(REPAIR_PAYMENT_BASIS_OPTIONS_STORAGE_KEY, JSON.stringify(next));
}

export function appendRepairPaymentBasisOption(
  text: string
): { ok: true; list: string[] } | { ok: false; reason: string } {
  const t = text.trim();
  if (!t) return { ok: false, reason: 'Введите текст варианта' };
  if (t.length > MAX_OPTION_LENGTH) {
    return { ok: false, reason: `Не длиннее ${MAX_OPTION_LENGTH} символов` };
  }
  const prev = readRepairPaymentBasisOptions();
  if (prev.includes(t)) {
    return { ok: false, reason: 'Такой вариант уже есть в списке' };
  }
  if (prev.length >= MAX_OPTIONS) {
    return { ok: false, reason: `В списке не более ${MAX_OPTIONS} вариантов` };
  }
  const list = [...prev, t];
  writeRepairPaymentBasisOptions(list);
  return { ok: true, list };
}

/**
 * Тип в БД выводится из текста основания (эвристика), чтобы не терять смысл при ручных формулировках.
 */
export function inferPaymentTypeFromBasisText(basis: string): {
  paymentType: ContractDocumentPackagePaymentKind;
  addendumNumber?: number;
} {
  const normalized = basis.trim().toLowerCase();
  if (normalized === 'предоплата по договору') {
    return { paymentType: 'PREPAYMENT' };
  }
  if (normalized === 'частичная оплата по договору') {
    return { paymentType: 'ADVANCE' };
  }
  if (normalized === 'окончательный расчёт по договору') {
    return { paymentType: 'FINAL' };
  }
  const addendumMatch = /^оплата по д\/с\s*(\d+)\s*$/i.exec(basis.trim());
  if (addendumMatch) {
    const n = Number.parseInt(addendumMatch[1], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 5) {
      return { paymentType: 'AMENDMENT', addendumNumber: n };
    }
  }
  const b = normalized;
  const m =
    /(?:д\/с|доп\.?\s*соглашен)[^\d]{0,40}№\s*(\d)/i.exec(basis) ||
    /дополнительн(?:ого|ому)\s+соглашен(?:ия|ию)[^\d]{0,20}№\s*(\d)/i.exec(basis);
  if (m) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= 1 && n <= 5) {
      return { paymentType: 'AMENDMENT', addendumNumber: n };
    }
  }
  if (/окончательн|приёмк|приемк|сдач/i.test(basis)) {
    return { paymentType: 'FINAL' };
  }
  if (/предоплат|аванс(?!\s*част)/i.test(b)) {
    return { paymentType: 'PREPAYMENT' };
  }
  return { paymentType: 'ADVANCE' };
}

export function paymentApiFieldsFromCustomBasis(basisText: string): {
  paymentType: ContractDocumentPackagePaymentKind;
  addendumNumber?: number;
  basis: string;
} {
  const basis = basisText.trim();
  const { paymentType, addendumNumber } = inferPaymentTypeFromBasisText(basis);
  return { paymentType, addendumNumber, basis };
}
