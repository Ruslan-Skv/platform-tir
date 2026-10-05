'use client';

import type {
  MoneyMovement,
  MoneyMovementManagerOption,
} from '@/shared/api/crm/admin-money-movements';
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

/** Итог по менеджеру кассы за период (плитка итогов). */
export type CashBookManagerTotals = {
  managerId: string;
  name: string;
  sum: number;
};

export type CashBookListResponse = {
  data: MoneyMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Сумма записей кассы за выбранный период. */
  totalSum: number;
  /** Разбивка по менеджерам кассы за период. */
  byManager: CashBookManagerTotals[];
  /** Менеджеры для модалки записи (участники кассы + текущий пользователь). */
  managers: MoneyMovementManagerOption[];
};

/** Записи кассы: свёрнные наличные оплаты журнала ДП за период. */
export async function listCashBook(params?: {
  dateFrom?: string;
  dateTo?: string;
  managerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<CashBookListResponse> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.managerId) search.set('managerId', params.managerId);
  if (params?.search) search.set('search', params.search);
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  const res = await apiFetch(`${API_URL}/admin/cash-book?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить кассу');
  return res.json();
}

/** Параметры ручной записи в кассе — как «+ Запись» в ДП, но способ всегда «Наличные». */
export type CashBookEntryParams = {
  managerId?: string;
  /** Сумма со знаком: внесение > 0, изъятие < 0. */
  amount: number;
  direction?: string;
  contractNumber?: string;
  customerName?: string;
  executorName?: string;
  basis: string;
  notes?: string;
};

/**
 * Ручная запись в кассе: наличная проводка создаётся сразу свёрнной,
 * поэтому попадает в раздел сразу после сохранения.
 */
export async function createCashBookEntry(params: CashBookEntryParams): Promise<MoneyMovement> {
  const res = await apiFetch(`${API_URL}/admin/cash-book/entry`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось записать проводку в кассу');
  return res.json();
}
