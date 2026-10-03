import { apiFetch } from '@/shared/lib/api-fetch';

import type { BankCode, BankEntryType } from './admin-bank-entries';

const API_FALLBACK = 'http://localhost:3001/api/v1';

function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (!raw) return API_FALLBACK;
  if (raw.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${raw.replace(/\/$/, '')}`;
    }
    return API_FALLBACK;
  }
  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw.replace(/\/$/, '')}`;
  }
  return raw.replace(/\/$/, '');
}

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Оплата ДП на экране сверки (краткая форма с остатками). */
export interface ReconciliationMovement {
  id: string;
  paymentDate: string;
  amount: string;
  paymentForm: string;
  contractNumber: string | null;
  customerName: string | null;
  managerName: string | null;
  linkedAmount: string;
  remainder: string;
}

/** Авто-предложение: одна банк-запись ↔ набор оплат. */
export interface ReconciliationSuggestion {
  movements: ReconciliationMovement[];
  amount: string;
  /** Расхождение до 1 ₽ (округления) — предложение неточное, с пометкой. */
  mismatchAmount?: string | null;
  reason: 'exact' | 'day' | 'window';
}

export interface ReconciliationEntryLink {
  id: string;
  amount: string;
  /** Пояснение о расхождении сумм, если связь зафиксирована с урезанной суммой. */
  note: string | null;
  createdAt: string;
  moneyMovement: ReconciliationMovement;
}

export interface ReconciliationEntry {
  id: string;
  entryDate: string;
  bank: BankCode;
  entryType: BankEntryType;
  amount: string;
  fee: string;
  refund: string;
  total: string;
  counterparty: string | null;
  notes: string | null;
  links: ReconciliationEntryLink[];
  coveredAmount: string;
  /** Суммарное расхождение связей (округления) — показывается у «Сверено». */
  mismatchAmount: string;
  remainingAmount: string;
  suggestion: ReconciliationSuggestion | null;
  status: 'covered' | 'partial' | 'unmatched';
}

export interface UnmatchedPayment extends ReconciliationMovement {
  /** Лаг зачисления ещё не истёк — оплата может прийти после конца периода. */
  inTransit: boolean;
}

export interface ReconciliationTotals {
  entriesCount: number;
  paymentsCount: number;
  bankSum: string;
  coveredSum: string;
  remainingBankSum: string;
  dpSum: string;
  matchedDpSum: string;
  suggestedSum: string;
  unmatchedDpSum: string;
  inTransitSum: string;
}

export interface ReconciliationPreview {
  dateFrom: string;
  dateTo: string;
  lagDays: number;
  entries: ReconciliationEntry[];
  unmatchedPayments: UnmatchedPayment[];
  totals: ReconciliationTotals;
}

export interface ReconciliationHistoryItem {
  id: string;
  amount: string;
  note: string | null;
  createdAt: string;
  createdBy: string | null;
  bankEntry: {
    id: string;
    entryDate: string;
    bank: BankCode;
    entryType: BankEntryType;
  };
  moneyMovement: ReconciliationMovement;
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string | string[] };
    const msg = data.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string' && msg.trim()) return msg;
  } catch {
    /* ignore */
  }
  return 'Ошибка запроса';
}

export async function getReconciliationPreview(params: {
  dateFrom: string;
  dateTo: string;
  lagDays?: number;
}): Promise<ReconciliationPreview> {
  const qs = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo });
  if (params.lagDays != null) qs.set('lagDays', String(params.lagDays));
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/bank-reconciliation/preview?${qs.toString()}`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function createReconciliationLinks(
  bankEntryId: string,
  moneyMovementIds: string[]
): Promise<{ bankEntryId: string; created: number; warnings: string[] }> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/bank-reconciliation/links`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({
      bankEntryId,
      items: moneyMovementIds.map((id) => ({ moneyMovementId: id })),
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function removeReconciliationLink(linkId: string): Promise<{ deleted: boolean }> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/bank-reconciliation/links/${linkId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function removeAllEntryLinks(bankEntryId: string): Promise<{ deleted: number }> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/bank-reconciliation/entries/${bankEntryId}/links`,
    { method: 'DELETE', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function listReconciliationLinks(params?: {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}): Promise<{ items: ReconciliationHistoryItem[] }> {
  const qs = new URLSearchParams();
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.set('dateTo', params.dateTo);
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/bank-reconciliation/links${query ? `?${query}` : ''}`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
