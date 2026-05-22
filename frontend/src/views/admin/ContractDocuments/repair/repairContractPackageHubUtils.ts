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
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function formatRepairPipelineActDate(raw: string): string {
  const t = raw.trim();
  if (!t) return '—';
  const d = /\d{4}-\d{2}-\d{2}/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

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
