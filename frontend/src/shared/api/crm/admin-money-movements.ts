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

export type MoneyMovement = {
  id: string;
  sourceId: string | null;
  packageId: string | null;
  contractId: string | null;
  paymentDate: string;
  performedAt: string;
  amount: string;
  paymentForm: string;
  paymentType: string;
  /** Ручная проводка («Ручная запись в журнале ДП») — не связана с оплатой договора. */
  isManual: boolean;
  addendumNumber: number | null;
  basis: string | null;
  notes: string | null;
  contractNumber: string | null;
  customerName: string | null;
  direction: string | null;
  /** Офис заключения договора на момент оплаты («Офис закл.»). */
  office: string | null;
  /**
   * Первоначальные значения полей, правленных супер-админом: поле → значение до
   * первой правки (null — запись не правилась). Журнал помечает их значком «было …».
   */
  originalValues: Record<string, string | null> | null;
  manager: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type MoneyMovementManagerOption = { id: string; name: string };

export type MoneyMovementListResponse = {
  data: MoneyMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalSum: number;
  /** Суммы оплат по направлениям за выбранный период (те же фильтры, что у журнала). */
  directionSums: { direction: string | null; sum: number }[];
  /** Суммы оплат по менеджерам за выбранный период — для графиков статистики. */
  managerSums: { managerId: string | null; name: string; sum: number }[];
  /** Суммы «направление × менеджер» — кто из менеджеров лидер в каждом направлении. */
  directionManagerSums: {
    direction: string | null;
    managerId: string | null;
    name: string;
    sum: number;
  }[];
  managers: MoneyMovementManagerOption[];
};

export async function getMoneyMovements(params?: {
  managerId?: string;
  /** «mine» — только записи текущего пользователя (менеджера из карточки договора). */
  scope?: 'mine' | 'all';
  direction?: string;
  paymentForm?: string;
  paymentType?: string;
  /** Тип записи: «manual» — ручные проводки, «auto» — автоматические по оплатам договоров. */
  entryKind?: 'manual' | 'auto';
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<MoneyMovementListResponse> {
  const search = new URLSearchParams();
  if (params?.managerId) search.set('managerId', params.managerId);
  if (params?.scope === 'mine') search.set('scope', params.scope);
  if (params?.direction) search.set('direction', params.direction);
  if (params?.paymentForm) search.set('paymentForm', params.paymentForm);
  if (params?.paymentType) search.set('paymentType', params.paymentType);
  if (params?.entryKind) search.set('entryKind', params.entryKind);
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.search) search.set('search', params.search);
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  const res = await apiFetch(`${API_URL}/admin/money-movements?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить журнал ДП');
  return res.json();
}

export type ManagerIncassation = {
  id: string;
  performedAt: string;
  amount: string;
  /** ФИО лица, производившего инкассацию (записал менеджер при создании). */
  incassator: string;
  notes: string | null;
  /** Менеджер, за которого сдана инкассация (по чьей кассе закрыт остаток). */
  manager: { id: string; name: string } | null;
  /** Менеджер, фактически сдавший инкассацию; null — сдал сам за себя. */
  submitter: { id: string; name: string } | null;
  createdAt: string;
};

export type IncassationCashBalance = {
  /** Менеджер, для которого посчитан остаток. */
  managerId: string;
  /** Имя менеджера (если пользователь найден). */
  managerName: string | null;
  /** Наличные с момента последней инкассации (строкой, как Decimal). */
  balance: string;
  lastIncassation: { performedAt: string; amount: string; incassator: string } | null;
};

/** Наличные менеджера (по умолчанию — текущего) с момента последней инкассации. */
export async function getIncassationCashBalance(
  managerId?: string
): Promise<IncassationCashBalance> {
  const search = new URLSearchParams();
  if (managerId) search.set('managerId', managerId);
  const query = search.size > 0 ? `?${search}` : '';
  const res = await apiFetch(`${API_URL}/admin/money-movements/incassations/cash-balance${query}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить остаток наличных');
  return res.json();
}

export async function getManagerIncassations(limit = 50): Promise<ManagerIncassation[]> {
  const res = await apiFetch(`${API_URL}/admin/money-movements/incassations?limit=${limit}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить инкассации');
  return res.json();
}

export async function createManagerIncassation(params: {
  /** Менеджер, сдающий инкассацию; по умолчанию — текущий пользователь. */
  managerId?: string;
  /** За кого сдаётся инкассация: менеджер, по чьей кассе закрывается остаток. Пусто — за себя. */
  onBehalfOfId?: string;
  amount: number;
  incassator: string;
  performedAt: string;
  notes?: string;
}): Promise<ManagerIncassation> {
  const res = await apiFetch(`${API_URL}/admin/money-movements/incassations`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось записать инкассацию');
  return res.json();
}

/** Поля ручной записи журнала ДП (создание и правка). */
export type ManualMoneyMovementParams = {
  /** Менеджер, по кассе которого проводится запись; по умолчанию — текущий пользователь. */
  managerId?: string;
  /** Сумма со знаком: внесение > 0, изъятие < 0. */
  amount: number;
  paymentForm: string;
  /** Дата записи, YYYY-MM-DD. */
  paymentDate: string;
  /**
   * Направление записи: направление договоров, «Материалы» или «Прочее».
   * «Прочее» не учитывается в итоговых продажах.
   */
  direction: string;
  /** № договора — для направлений и «Материалов» (колонка «№ договора»). */
  contractNumber?: string;
  /** Заказчик — для направлений и «Материалов» (колонка «Заказчик»). */
  customerName?: string;
  /** Основание: «Бытовые нужды» и т.п. */
  basis: string;
  notes?: string;
};

/** Ручная запись (проводка) в журнале ДП: изъятие из кассы (сумма < 0) или внесение (> 0). */
export async function createManualMoneyMovement(
  params: ManualMoneyMovementParams
): Promise<MoneyMovement> {
  const res = await apiFetch(`${API_URL}/admin/money-movements/manual-entry`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось записать проводку');
  return res.json();
}

/** Правка ручной записи журнала ДП — только супер-админ (исправление ошибок). */
export async function updateManualMoneyMovement(
  id: string,
  params: ManualMoneyMovementParams
): Promise<MoneyMovement> {
  const res = await apiFetch(`${API_URL}/admin/money-movements/manual-entry/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сохранить правку проводки');
  return res.json();
}
