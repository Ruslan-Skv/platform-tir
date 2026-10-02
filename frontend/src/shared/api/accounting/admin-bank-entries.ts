import { apiFetch } from '@/shared/lib/api-fetch';

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

export type BankCode = 'SBER' | 'ALFA' | 'OTHER';

/** Способы оплаты в разделе «Банк» — соответствуют способам оплаты ДП. */
export type BankEntryType = 'TERMINAL_QR' | 'INVOICE_PAYMENT' | 'LC_TRANSFER';

export interface BankEntryUserRef {
  id: string;
  name: string;
}

export interface BankEntry {
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
  createdBy: BankEntryUserRef | null;
  createdAt: string;
  updatedAt: string;
}

/** Сводка сумм по записям банка (все суммы — строки с двумя знаками). */
export interface BankEntriesTotals {
  count: number;
  amount: string;
  fee: string;
  refund: string;
  total: string;
}

export interface BankEntriesListResponse {
  data: BankEntry[];
  total: number;
  page: number;
  limit: number;
  totals: BankEntriesTotals;
  byBank: Record<string, BankEntriesTotals>;
}

export interface BankEntryInput {
  entryDate: string;
  bank: BankCode;
  entryType: BankEntryType;
  amount: number;
  fee?: number;
  refund?: number;
  counterparty?: string;
  notes?: string;
}

export type BankEntryPatch = Partial<BankEntryInput>;

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

export async function listBankEntries(params?: {
  dateFrom?: string;
  dateTo?: string;
  bank?: string;
  entryType?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<BankEntriesListResponse> {
  const qs = new URLSearchParams();
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.set('dateTo', params.dateTo);
  if (params?.bank) qs.set('bank', params.bank);
  if (params?.entryType) qs.set('entryType', params.entryType);
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const res = await apiFetch(`${getApiBaseUrl()}/admin/bank-entries${query ? `?${query}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function createBankEntry(body: BankEntryInput): Promise<BankEntry> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/bank-entries`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function updateBankEntry(id: string, body: BankEntryPatch): Promise<BankEntry> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/bank-entries/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function deleteBankEntry(id: string): Promise<{ deleted: boolean }> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/bank-entries/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
