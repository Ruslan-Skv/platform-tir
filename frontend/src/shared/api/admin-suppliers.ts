'use client';

import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
}

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  throw new Error(Array.isArray(body.message) ? body.message.join(', ') : body.message || fallback);
}

/** Статус расчётов по знаку сальдо: PAYABLE — должны поставщику, OVERPAY — переплата. */
export type SupplierBalanceStatus = 'PAYABLE' | 'SETTLED' | 'OVERPAY';

/** Карточка поставщика раздела «Поставщики» (реквизитная часть). */
export type AdminSupplier = {
  id: string;
  legalName: string;
  commercialName: string | null;
  inn: string | null;
  email: string | null;
  phone: string[];
  website: string | null;
  legalAddress: string | null;
  isActive: boolean;
  /** Сальдо начальное: + — должны поставщику, − — переплата; null — не задано. */
  openingBalance: number | null;
  /** Дата, на которую зафиксировано сальдо начальное (YYYY-MM-DD). */
  openingBalanceDate: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Блок банковских реквизитов поставщика (блоков может быть несколько). */
export type AdminSupplierRequisite = {
  id: string;
  supplierId: string;
  name: string;
  bankName: string | null;
  bankAccount: string | null;
  bankBik: string | null;
  corrAccount: string | null;
  inn: string | null;
  kpp: string | null;
  note: string | null;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** Итоги ведомости поставщика: сальдо = начальное + Σ счетов − Σ оплат. */
export type AdminSupplierStats = {
  openingBalance: number | null;
  amountSum: number;
  paymentSum: number;
  balance: number;
  status: SupplierBalanceStatus;
};

/** Сводная строка поставщика для итогового списка раздела. */
export type AdminSupplierSummaryRow = {
  id: string;
  legalName: string;
  commercialName: string | null;
  name: string;
  inn: string | null;
  email: string | null;
  phone: string[];
  isActive: boolean;
  requisiteCount: number;
  openingBalance: number | null;
  amountSum: number;
  paymentSum: number;
  balance: number;
  status: SupplierBalanceStatus;
  lastEntryDate: string | null;
};

export type AdminSupplierSummaryTotals = {
  /** Σ положительных сальдо — «Итого к оплате». */
  payable: number;
  /** Σ отрицательных сальдо (со знаком минус) — суммарная переплата. */
  overpay: number;
  suppliersWithDebt: number;
  suppliersTotal: number;
};

export type AdminSupplierSummaryResponse = {
  data: AdminSupplierSummaryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totals: AdminSupplierSummaryTotals;
};

export type AdminSupplierDetailResponse = {
  supplier: AdminSupplier;
  requisites: AdminSupplierRequisite[];
  productsCount: number;
  stats: AdminSupplierStats;
};

/** Строка ведомости расчётов: счёт (начисление) и/или оплата. */
export type AdminSupplierLedgerEntry = {
  id: string;
  supplierId: string;
  requisiteId: string | null;
  requisiteName: string | null;
  /** Дата записи (YYYY-MM-DD). */
  date: string;
  /** № документа свободной строкой: «№ 71 от 14 октября 2026 г.». */
  documentNo: string | null;
  amount: number | null;
  payment: number | null;
  note: string | null;
  /** НДС: null — не указано, 0 — без НДС, 22 — 22%. */
  vatRate: number | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminSupplierLedgerResponse = {
  data: AdminSupplierLedgerEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  amountSum: number;
  paymentSum: number;
  openingBalance: number | null;
  balance: number;
  status: SupplierBalanceStatus;
};

/** Сводный список поставщиков с сальдо расчётов — итоговая вкладка раздела. */
export async function getSuppliersSummary(params?: {
  search?: string;
  status?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
}): Promise<AdminSupplierSummaryResponse> {
  const search = new URLSearchParams();
  if (params?.search) search.set('search', params.search);
  if (params?.status && params.status !== 'ALL') search.set('status', params.status);
  if (params?.sort) search.set('sort', params.sort);
  if (params?.order) search.set('order', params.order);
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  const res = await apiFetch(`${API_URL}/admin/suppliers/summary?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить список поставщиков');
  return res.json();
}

/** Карточка поставщика: реквизиты + итоги ведомости. */
export async function getSupplierDetail(supplierId: string): Promise<AdminSupplierDetailResponse> {
  const res = await apiFetch(`${API_URL}/admin/suppliers/${supplierId}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить поставщика');
  return res.json();
}

export type SaveSupplierParams = {
  legalName: string;
  commercialName?: string;
  inn?: string;
  legalAddress?: string;
  website?: string;
  email?: string;
  phone?: string[];
  isActive?: boolean;
  openingBalance?: number | null;
  openingBalanceDate?: string | null;
};

export async function createSupplier(params: SaveSupplierParams): Promise<AdminSupplier> {
  const res = await apiFetch(`${API_URL}/admin/suppliers`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось создать поставщика');
  return res.json();
}

export async function updateSupplier(
  supplierId: string,
  params: SaveSupplierParams
): Promise<AdminSupplier> {
  const res = await apiFetch(`${API_URL}/admin/suppliers/${supplierId}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сохранить поставщика');
  return res.json();
}

export async function deleteSupplier(supplierId: string): Promise<{ deleted: boolean }> {
  const res = await apiFetch(`${API_URL}/admin/suppliers/${supplierId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить поставщика');
  return res.json();
}

/** Ведомость расчётов поставщика: счета (начисления) и оплаты. */
export async function getSupplierLedger(
  supplierId: string,
  params?: { search?: string; page?: number; limit?: number }
): Promise<AdminSupplierLedgerResponse> {
  const search = new URLSearchParams();
  if (params?.search) search.set('search', params.search);
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  const res = await apiFetch(`${API_URL}/admin/suppliers/${supplierId}/ledger?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить ведомость поставщика');
  return res.json();
}

export type SaveSupplierLedgerEntryParams = {
  date: string;
  documentNo?: string;
  amount?: number | null;
  payment?: number | null;
  note?: string;
  vatRate?: number | null;
  requisiteId?: string | null;
};

export async function createSupplierLedgerEntry(
  supplierId: string,
  params: SaveSupplierLedgerEntryParams
): Promise<AdminSupplierLedgerEntry> {
  const res = await apiFetch(`${API_URL}/admin/suppliers/${supplierId}/ledger`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось добавить запись в ведомость');
  return res.json();
}

export async function updateSupplierLedgerEntry(
  entryId: string,
  params: SaveSupplierLedgerEntryParams
): Promise<AdminSupplierLedgerEntry> {
  const res = await apiFetch(`${API_URL}/admin/suppliers/ledger/${entryId}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сохранить запись ведомости');
  return res.json();
}

export async function deleteSupplierLedgerEntry(entryId: string): Promise<{ deleted: boolean }> {
  const res = await apiFetch(`${API_URL}/admin/suppliers/ledger/${entryId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить запись ведомости');
  return res.json();
}

export type SaveSupplierRequisiteParams = {
  name: string;
  bankName?: string;
  bankAccount?: string;
  bankBik?: string;
  corrAccount?: string;
  inn?: string;
  kpp?: string;
  note?: string;
  isDefault?: boolean;
};

export async function createSupplierRequisite(
  supplierId: string,
  params: SaveSupplierRequisiteParams
): Promise<AdminSupplierRequisite> {
  const res = await apiFetch(`${API_URL}/admin/suppliers/${supplierId}/requisites`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось добавить блок реквизитов');
  return res.json();
}

export async function updateSupplierRequisite(
  requisiteId: string,
  params: SaveSupplierRequisiteParams
): Promise<AdminSupplierRequisite> {
  const res = await apiFetch(`${API_URL}/admin/suppliers/requisites/${requisiteId}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сохранить блок реквизитов');
  return res.json();
}

export async function deleteSupplierRequisite(requisiteId: string): Promise<{ deleted: boolean }> {
  const res = await apiFetch(`${API_URL}/admin/suppliers/requisites/${requisiteId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить блок реквизитов');
  return res.json();
}
