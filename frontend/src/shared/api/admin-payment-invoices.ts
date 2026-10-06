import { apiFetch } from '@/shared/lib/api-fetch';

import type { ExecutorRequisiteProfile } from './admin-contract-document-packages';

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
  /** null — свободный счёт без договора в базе. */
  packageId: string | null;
  sequenceNumber: number;
  invoiceNumber: string;
  invoiceDate: string;
  amount: string;
  paymentType: ContractDocumentPaymentInvoiceKind;
  addendumNumber: number | null;
  basis: string;
  lineItems: PaymentInvoiceLineItem[];
  legacyFormId: string | null;
  /** Свободный счёт: дата договора. */
  contractDate: string | null;
  /** Свободный счёт: карточка заказчика в CRM (если выбрана). */
  customerId: string | null;
  /** Свободный счёт: снимок профиля исполнителя (справочник «Реквизиты»). */
  executorProfile: ExecutorRequisiteProfile | null;
  /** Свободный счёт: снимок реквизитов заказчика для печатной формы счёта. */
  customerSnapshot: FreeInvoiceCustomerSnapshot | null;
  createdAt: string;
  updatedAt: string;
  issuedById: string | null;
  issuedBy: ContractDocumentPaymentInvoiceUserRef | null;
  /** Подписан ли счёт ПЭП со стороны Подрядчика (дата подписания). */
  signedAt: string | null;
  signedById: string | null;
  signedBy: ContractDocumentPaymentInvoiceUserRef | null;
  /** Подписанная копия PDF со штампом ПЭП Подрядчика (в uploads). */
  signedFileUrl: string | null;
  signedSha256: string | null;
  packageTitle: string | null;
  packageKind: string | null;
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

/** Реквизиты заказчика свободного счёта (для печатной формы). */
export interface FreeInvoiceCustomerSnapshot {
  type?: string;
  fullName?: string;
  organizationName?: string;
  inn?: string;
  address?: string;
  phone?: string;
  email?: string;
}

/** Свободный счёт без договора в базе: реквизиты передаются в запросе. */
export interface FreePaymentInvoiceInput {
  invoiceDate: string;
  amount: number;
  paymentType: Exclude<ContractDocumentPaymentInvoiceKind, 'AMENDMENT'>;
  basis: string;
  lineItems: PaymentInvoiceLineItem[];
  contractNumber?: string;
  contractDate?: string;
  customerId?: string;
  customerName: string;
  executorProfile?: ExecutorRequisiteProfile;
  customerSnapshot?: FreeInvoiceCustomerSnapshot;
}

/** Строка корзины: счёт + кто/когда удалил и момент безвозвратного удаления. */
export interface ContractDocumentPaymentInvoiceTrashItem extends ContractDocumentPaymentInvoice {
  deletedAt: string | null;
  deletedById: string | null;
  deletedBy: ContractDocumentPaymentInvoiceUserRef | null;
  /** Момент безвозвратного удаления — deletedAt + 30 дней хранения корзины. */
  permanentDeleteAt: string | null;
}

export interface PaymentInvoiceTrashResponse {
  items: ContractDocumentPaymentInvoiceTrashItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  trashRetentionDays: number;
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
  /** Период по дате счёта (YYYY-MM-DD), границы включительно. */
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ items: ContractDocumentPaymentInvoice[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  if (params?.packageId?.trim()) qs.set('packageId', params.packageId.trim());
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.dateFrom?.trim()) qs.set('dateFrom', params.dateFrom.trim());
  if (params?.dateTo?.trim()) qs.set('dateTo', params.dateTo.trim());
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

/** Выставить свободный счёт (без договора в базе). */
export async function createFreePaymentInvoice(
  body: FreePaymentInvoiceInput
): Promise<ContractDocumentPaymentInvoice> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/payment-invoices/free`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Подписать выставленный счёт ПЭП со стороны Подрядчика (multipart: PDF счёта).
 *  Работает и для свободных счетов — счёт ищется по id. */
export async function signPackagePaymentInvoiceEp(
  invoiceId: string,
  input: {
    file: Blob;
    fileName: string;
    contractorLabel?: string;
    contractorSignatory?: string;
  }
): Promise<ContractDocumentPaymentInvoice> {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('admin_token') || localStorage.getItem('user_token')
      : null;
  const form = new FormData();
  form.append('file', input.file, input.fileName);
  if (input.contractorLabel) form.append('contractorLabel', input.contractorLabel);
  if (input.contractorSignatory) form.append('contractorSignatory', input.contractorSignatory);
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/payment-invoices/${invoiceId}/sign-ep`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Отменить ПЭП счёта: снимает отметку подписания и удаляет подписанную копию PDF. */
export async function cancelPackagePaymentInvoiceEp(
  invoiceId: string
): Promise<ContractDocumentPaymentInvoice> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/payment-invoices/${invoiceId}/sign-ep`,
    { method: 'DELETE', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Удалить выставленный счёт в корзину (только супер-админ; хранение 30 дней). */
export async function deletePackagePaymentInvoice(
  invoiceId: string
): Promise<ContractDocumentPaymentInvoiceTrashItem> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/payment-invoices/${invoiceId}`,
    { method: 'DELETE', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Корзина выставленных счетов (только супер-админ). */
export async function getPaymentInvoiceTrash(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<PaymentInvoiceTrashResponse> {
  const qs = new URLSearchParams();
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  if (params?.page != null) qs.set('page', String(params.page));
  if (params?.limit != null) qs.set('limit', String(params.limit));
  const query = qs.toString();
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/payment-invoices/trash${query ? `?${query}` : ''}`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** Число счетов в корзине для бейджа кнопки (только супер-админ). */
export async function getPaymentInvoiceTrashCount(): Promise<{ count: number }> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/payment-invoices/trash/count`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
