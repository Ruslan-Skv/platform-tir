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

/** Запись кассы: ручное движение наличных. Отдельная от журнала ДП сущность. */
export type CashBookEntry = {
  id: string;
  paymentDate: string;
  performedAt: string;
  /** Сумма со знаком: внесение в кассу > 0, изъятие < 0 (строкой, как Decimal). */
  amount: string;
  manager: { id: string; name: string } | null;
  direction: string | null;
  contractNumber: string | null;
  customerName: string | null;
  executorName: string | null;
  basis: string | null;
  notes: string | null;
  /** Тип записи: MANUAL — ручная проводка, OPENING — начальный остаток кассы. */
  kind: 'MANUAL' | 'OPENING';
  /** ФИО мастера, получившего зарплату наличными (записи «Зар/плата» из расчётов). */
  salaryRecipientName: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Итог по менеджеру кассы за период (плитка итогов). */
export type CashBookManagerTotals = {
  managerId: string;
  name: string;
  sum: number;
};

export type CashBookManagerOption = { id: string; name: string };

/** Остатки кассы (центра) за период: считаются на бэкенде по всем источникам,
 *  от фильтров менеджера и поиска не зависят — только от границ периода. */
export type CashBookBalance = {
  /** Остаток на начало периода (все записи до «даты от»). */
  start: number;
  /** Остаток на конец периода (все записи до «даты до»; без неё — текущий). */
  end: number;
  /** Приход за период (положительные записи, без начального остатка). */
  income: number;
  /** Расход за период (величина изъятий, положительное число). */
  expense: number;
  /** Начальный остаток, если его дата попала внутрь периода. */
  openingInPeriod: number;
};

/** Зафиксированный начальный остаток кассы — якорь остатков (kind = OPENING). */
export type CashBookOpeningBalance = {
  id: string;
  /** Дата, на которую зафиксирован остаток (YYYY-MM-DD). */
  date: string;
  amount: number;
  notes: string | null;
  updatedAt: string;
};

export type CashBookListResponse = {
  data: CashBookEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Сумма кассы за выбранный период: свёрнутые наличные ДП + ручные записи. */
  totalSum: number;
  /** Разбивка по менеджерам кассы за период (оба источника: наличные ДП + записи). */
  byManager: CashBookManagerTotals[];
  /** Менеджеры из справочника «Карточки менеджеров» — как в фильтре «Все менеджеры» ДП. */
  managers: CashBookManagerOption[];
  /** Остатки кассы за выбранный период (начало/конец, приход/расход). */
  balance: CashBookBalance;
  /** Зафиксированный начальный остаток; null — ещё не задан. */
  openingBalance: CashBookOpeningBalance | null;
};

/** Записи кассы за период: свёрнутые наличные оплаты ДП + ручные записи кассы. */
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

/** Параметры ручной записи в кассе: способ всегда «Наличные». */
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

/** Ручная запись в кассе — живёт только в кассе, в журнал ДП не попадает. */
export async function createCashBookEntry(params: CashBookEntryParams): Promise<CashBookEntry> {
  const res = await apiFetch(`${API_URL}/admin/cash-book/entry`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось записать проводку в кассу');
  return res.json();
}

/** Параметры фиксации начального остатка кассы (центра). */
export type CashBookOpeningBalanceParams = {
  /** Дата остатка (YYYY-MM-DD). */
  date: string;
  /** Фактическая сумма наличных на дату (положительное число). */
  amount: number;
  notes?: string;
};

/** Фиксация начального остатка кассы: задаёт или перезаписывает (супер-админ). */
export async function setCashBookOpeningBalance(
  params: CashBookOpeningBalanceParams
): Promise<CashBookOpeningBalance> {
  const res = await apiFetch(`${API_URL}/admin/cash-book/opening-balance`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось зафиксировать начальный остаток');
  return res.json();
}

/** Удаление начального остатка: остатки снова считаются от нуля (супер-админ). */
export async function deleteCashBookOpeningBalance(): Promise<{ deleted: boolean }> {
  const res = await apiFetch(`${API_URL}/admin/cash-book/opening-balance`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить начальный остаток');
  return res.json();
}
