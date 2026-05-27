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

export type ContractDocumentPaymentInvoiceKind = 'PREPAYMENT' | 'ADVANCE' | 'FINAL' | 'AMENDMENT';

export interface ContractDocumentPaymentInvoiceUserRef {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export type PaymentInvoiceLineKind = 'GOODS' | 'SERVICE';

export interface PaymentInvoiceLineItem {
  lineKind?: PaymentInvoiceLineKind;
  name: string;
  quantity: string;
  unit: string;
  vatLabel: string;
  unitPrice: number;
  amount: number;
}

export interface ContractDocumentPaymentInvoice {
  id: string;
  packageId: string;
  sequenceNumber: number;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  paymentType: ContractDocumentPaymentInvoiceKind;
  addendumNumber: number | null;
  basis: string;
  lineItems: PaymentInvoiceLineItem[];
  legacyFormId: string | null;
  createdAt: string;
  updatedAt: string;
  issuedById: string | null;
  issuedBy: ContractDocumentPaymentInvoiceUserRef | null;
  packageTitle: string | null;
  packageKind: string;
  contractNumber: string;
  customerName: string;
}

export interface ContractDocumentPaymentInvoiceInput {
  invoiceDate: string;
  amount: number;
  paymentType: ContractDocumentPaymentInvoiceKind;
  addendumNumber?: number;
  basis: string;
  lineItems: PaymentInvoiceLineItem[];
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

export async function peekNextPaymentInvoiceNumber(): Promise<{
  nextNumber: string;
  nextSequence: number;
}> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/payment-invoices/next-number`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function listAllPaymentInvoices(params?: {
  search?: string;
  packageId?: string;
  limit?: number;
}): Promise<{ items: ContractDocumentPaymentInvoice[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  if (params?.packageId?.trim()) qs.set('packageId', params.packageId.trim());
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/payment-invoices${query ? `?${query}` : ''}`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function listPackagePaymentInvoices(
  packageId: string
): Promise<ContractDocumentPaymentInvoice[]> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/payment-invoices`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function createPackagePaymentInvoice(
  packageId: string,
  body: ContractDocumentPaymentInvoiceInput
): Promise<ContractDocumentPaymentInvoice> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/${packageId}/payment-invoices`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
