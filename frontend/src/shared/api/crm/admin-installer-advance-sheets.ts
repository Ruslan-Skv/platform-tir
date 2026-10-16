'use client';

import { apiFetch } from '@/shared/lib/api-fetch';

import type { ContractDocumentPackageInstallerAdvancePaymentMethod } from '../admin-contract-document-packages';

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

/** Статус строки ведомости: ожидает / вопрос супер-админа / выплачено. */
export type InstallerAdvanceSheetItemStatus = 'PENDING' | 'QUESTION' | 'PAID';

/** Статус ведомости (производный): PAID — всё выдано, QUESTION — есть вопрос. */
export type InstallerAdvanceSheetStatus = 'PENDING' | 'QUESTION' | 'PAID';

export type InstallerAdvanceSheetItemComment = {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; role: string } | null;
};

/** Строка ведомости в карточке: аванс по договору + реквизиты договора + переписка. */
export type InstallerAdvanceSheetItem = {
  id: string;
  packageId: string;
  amount: string;
  status: InstallerAdvanceSheetItemStatus;
  /** Дата выплаты (YYYY-MM-DD); null — ещё не выдано. */
  paidAt: string | null;
  paymentMethod: ContractDocumentPackageInstallerAdvancePaymentMethod | null;
  paidBy: { id: string; name: string } | null;
  packageKind: string;
  direction: string;
  packageStatus: string;
  contractNumber: string | null;
  customerName: string | null;
  objectAddress: string | null;
  /** Запись журнала авансов, созданная выплатой этой строки. */
  advanceId: string | null;
  comments: InstallerAdvanceSheetItemComment[];
};

/** Ведомость в списке (агрегаты по строкам). */
export type InstallerAdvanceSheetSummary = {
  id: string;
  number: number;
  createdAt: string;
  note: string | null;
  installer: { id: string; name: string; grade: string | null };
  createdBy: { id: string; name: string } | null;
  status: InstallerAdvanceSheetStatus;
  itemsCount: number;
  paidCount: number;
  questionCount: number;
  totalAmount: number;
  paidAmount: number;
};

/** Ведомость в карточке: строки с договорами, перепиской и выплатами. */
export type InstallerAdvanceSheetDetail = InstallerAdvanceSheetSummary & {
  updatedAt: string;
  items: InstallerAdvanceSheetItem[];
};

export type InstallerAdvanceSheetsListResponse = {
  data: InstallerAdvanceSheetSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function getInstallerAdvanceSheets(params?: {
  status?: InstallerAdvanceSheetStatus;
  installerId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<InstallerAdvanceSheetsListResponse> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.installerId) search.set('installerId', params.installerId);
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.search) search.set('search', params.search);
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  const res = await apiFetch(`${API_URL}/admin/installer-advance-sheets?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить ведомости');
  return res.json();
}

export async function getInstallerAdvanceSheet(id: string): Promise<InstallerAdvanceSheetDetail> {
  const res = await apiFetch(`${API_URL}/admin/installer-advance-sheets/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить ведомость');
  return res.json();
}

/** Остаток з/п мастера по договору (для строк формы ведомости). */
export type InstallerAdvancePackageBalance = {
  packageId: string;
  installerId: string;
  /** Есть назначения мастера в заказ-наряде; иначе остаток неизвестен. */
  hasAccruals: boolean;
  /** «Начислено» по заказ-наряду; null — мастер не назначен в заказ-наряде. */
  accrued: number | null;
  lineCount: number;
  /** Выдано авансов по этому договору этому мастеру. */
  paid: number;
  /** Остаток к выплате; отрицательный — переплата; null — нет заказ-наряда. */
  balance: number | null;
};

/** Начислено / выплачено / остаток з/п мастера по договору — как в «Расчёте мастеров». */
export async function getInstallerAdvancePackageBalance(
  packageId: string,
  installerId: string
): Promise<InstallerAdvancePackageBalance> {
  const search = new URLSearchParams({ packageId, installerId });
  const res = await apiFetch(
    `${API_URL}/admin/installer-advance-sheets/package-balance?${search}`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить остаток по договору');
  return res.json();
}

export type InstallerAdvanceSheetItemParams = {
  packageId: string;
  amount: number;
};

export async function createInstallerAdvanceSheet(params: {
  installerId: string;
  note?: string;
  items: InstallerAdvanceSheetItemParams[];
}): Promise<InstallerAdvanceSheetSummary> {
  const res = await apiFetch(`${API_URL}/admin/installer-advance-sheets`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось создать ведомость');
  return res.json();
}

export async function updateInstallerAdvanceSheet(
  id: string,
  params: {
    installerId?: string;
    note?: string;
    items?: InstallerAdvanceSheetItemParams[];
  }
): Promise<InstallerAdvanceSheetDetail> {
  const res = await apiFetch(`${API_URL}/admin/installer-advance-sheets/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сохранить ведомость');
  return res.json();
}

export async function deleteInstallerAdvanceSheet(id: string): Promise<{ ok: true }> {
  const res = await apiFetch(`${API_URL}/admin/installer-advance-sheets/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить ведомость');
  return res.json();
}

export type PayInstallerAdvanceSheetParams = {
  /** Дата выдачи (YYYY-MM-DD). */
  paidAt: string;
  paymentMethod?: ContractDocumentPackageInstallerAdvancePaymentMethod;
};

/** Выплатить одну строку ведомости (супер-админ). */
export async function payInstallerAdvanceSheetItem(
  sheetId: string,
  itemId: string,
  params: PayInstallerAdvanceSheetParams
): Promise<InstallerAdvanceSheetDetail> {
  const res = await apiFetch(
    `${API_URL}/admin/installer-advance-sheets/${sheetId}/items/${itemId}/pay`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(params),
    }
  );
  if (!res.ok) await throwApiError(res, 'Не удалось отметить выплату');
  return res.json();
}

/** Выплатить все невыданные строки ведомости одной датой и способом (супер-админ). */
export async function payAllInstallerAdvanceSheetItems(
  sheetId: string,
  params: PayInstallerAdvanceSheetParams
): Promise<InstallerAdvanceSheetDetail> {
  const res = await apiFetch(`${API_URL}/admin/installer-advance-sheets/${sheetId}/pay-all`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось отметить выплату ведомости');
  return res.json();
}

/** Отменить выплату строки: запись уйдёт из журнала авансов (супер-админ). */
export async function unpayInstallerAdvanceSheetItem(
  sheetId: string,
  itemId: string
): Promise<InstallerAdvanceSheetDetail> {
  const res = await apiFetch(
    `${API_URL}/admin/installer-advance-sheets/${sheetId}/items/${itemId}/unpay`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) await throwApiError(res, 'Не удалось отменить выплату');
  return res.json();
}

/** Комментарий в переписке по строке; вопрос супер-админа открывает статус QUESTION. */
export async function addInstallerAdvanceSheetItemComment(
  sheetId: string,
  itemId: string,
  body: string
): Promise<InstallerAdvanceSheetDetail> {
  const res = await apiFetch(
    `${API_URL}/admin/installer-advance-sheets/${sheetId}/items/${itemId}/comments`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify({ body }),
    }
  );
  if (!res.ok) await throwApiError(res, 'Не удалось добавить комментарий');
  return res.json();
}

/** Снять вопрос по строке (супер-админ). */
export async function resolveInstallerAdvanceSheetItemQuestion(
  sheetId: string,
  itemId: string
): Promise<InstallerAdvanceSheetDetail> {
  const res = await apiFetch(
    `${API_URL}/admin/installer-advance-sheets/${sheetId}/items/${itemId}/resolve-question`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) await throwApiError(res, 'Не удалось снять вопрос');
  return res.json();
}
