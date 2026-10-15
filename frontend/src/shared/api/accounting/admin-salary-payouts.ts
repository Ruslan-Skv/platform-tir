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

/** Способ выплаты з/п. */
export type SalaryPayoutMethod = 'CASH' | 'BANK';

/** Категория выплаты з/п. */
export type SalaryPayoutCategory = 'SALARY' | 'ADVANCE' | 'BONUS' | 'OTHER';

export const SALARY_PAYOUT_CATEGORY_LABELS: Record<SalaryPayoutCategory, string> = {
  SALARY: 'З/п',
  ADVANCE: 'Аванс',
  BONUS: 'Премия',
  OTHER: 'Прочее',
};

export const SALARY_PAYOUT_METHOD_LABELS: Record<SalaryPayoutMethod, string> = {
  CASH: 'Наличные',
  BANK: 'Банк',
};

export type SalaryPayoutUserRef = { id: string; name: string };

/** Строка журнала «Выплаты з/п» (сумма — положительная, строкой как Decimal). */
export interface SalaryPayoutItem {
  id: string;
  /** Источник: PAYOUT — запись раздела, DP — ручная запись журнала ДП «Зар/плата». */
  source: 'PAYOUT' | 'DP';
  /** Дата выплаты (YYYY-MM-DD). */
  paidAt: string;
  performedAt: string;
  amount: string;
  method: SalaryPayoutMethod;
  category: SalaryPayoutCategory;
  recipientName: string;
  note: string | null;
  manager: SalaryPayoutUserRef | null;
  createdBy: SalaryPayoutUserRef | null;
  /** Ручная сверка ДП (только записи DP): наличная выплата попадает в кассу после неё. */
  manualReconciledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Итог по получателю за период. */
export interface SalaryPayoutRecipientTotals {
  name: string;
  sum: number;
  count: number;
}

export interface SalaryPayoutsListResponse {
  data: SalaryPayoutItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalSum: number;
  cashSum: number;
  bankSum: number;
  byRecipient: SalaryPayoutRecipientTotals[];
  /** Сотрудники справочника «Карточки менеджеров» — для выбора получателя. */
  managers: { id: string; name: string }[];
}

/** Параметры выплаты: получатель — сотрудник справочника или ФИО вручную. */
export interface SalaryPayoutInput {
  paidAt: string;
  amount: number;
  paymentMethod: SalaryPayoutMethod;
  category?: SalaryPayoutCategory;
  recipientUserId?: string;
  recipientName?: string;
  /** Менеджер кассы — для наличной выплаты (по умолчанию текущий пользователь). */
  managerId?: string;
  note?: string;
}

export type SalaryPayoutPatch = Partial<SalaryPayoutInput>;

/** Журнал выплат з/п: записи раздела + ручные записи ДП с основанием «Зар/плата». */
export async function listSalaryPayouts(params?: {
  dateFrom?: string;
  dateTo?: string;
  method?: 'CASH' | 'BANK';
  source?: 'PAYOUT' | 'DP';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<SalaryPayoutsListResponse> {
  const qs = new URLSearchParams();
  if (params?.dateFrom) qs.set('dateFrom', params.dateFrom);
  if (params?.dateTo) qs.set('dateTo', params.dateTo);
  if (params?.method) qs.set('method', params.method);
  if (params?.source) qs.set('source', params.source);
  if (params?.search?.trim()) qs.set('search', params.search.trim());
  qs.set('page', String(params?.page ?? 1));
  qs.set('limit', String(params?.limit ?? 50));
  const res = await apiFetch(`${API_URL}/admin/salary-payouts?${qs}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить выплаты з/п');
  return res.json();
}

/** Выплата з/п: наличная попадает в кассу, безналичная — в раздел «Банк». */
export async function createSalaryPayout(params: SalaryPayoutInput): Promise<SalaryPayoutItem> {
  const res = await apiFetch(`${API_URL}/admin/salary-payouts`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось записать выплату з/п');
  return res.json();
}

/** Правка выплаты — только супер-админ. */
export async function updateSalaryPayout(
  id: string,
  params: SalaryPayoutPatch
): Promise<SalaryPayoutItem> {
  const res = await apiFetch(`${API_URL}/admin/salary-payouts/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сохранить правку выплаты');
  return res.json();
}

/** Удаление ошибочной выплаты (мягкое) — только супер-админ. */
export async function deleteSalaryPayout(id: string): Promise<{ deleted: boolean }> {
  const res = await apiFetch(`${API_URL}/admin/salary-payouts/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить выплату');
  return res.json();
}
