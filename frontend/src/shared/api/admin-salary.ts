import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(url: string, init?: RequestInit, errorMessage?: string): Promise<T> {
  const res = await apiFetch(url, { ...init, headers: getAdminAuthHeaders() });
  if (!res.ok) {
    let message = errorMessage ?? 'Ошибка запроса';
    try {
      const body = (await res.json()) as { message?: string };
      if (body?.message)
        message = Array.isArray(body.message) ? body.message.join('; ') : body.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ===== Типы =====

export interface SalaryGlobalSettings {
  taxPercent: number;
  /** Пользователь-бригадир (получатель бригадирского фонда); null — не назначен. */
  brigadierUserId: string | null;
  brigadierName: string | null;
  updatedAt: string | null;
}

export interface SalaryRateRule {
  id: string;
  officeId: string | null;
  officeName: string | null;
  role: string;
  percent: number;
  isActive: boolean;
}

export interface SalaryCategory {
  id: string;
  code: string;
  name: string;
  vsPercent: number;
  splitSign: number;
  splitClose: number;
  managerPercent: number;
  surveyorPercent: number;
  brigadierPercent: number;
  isActive: boolean;
  sortOrder: number;
  rateRules: SalaryRateRule[];
}

export interface SalarySettings {
  global: SalaryGlobalSettings;
  roles: Record<string, string>;
  categories: SalaryCategory[];
}

export interface SalaryExtraBillInput {
  id?: string;
  amount: number;
  date: string;
  note?: string | null;
}

export interface SalaryExtraBill extends SalaryExtraBillInput {
  id: string;
}

export interface SalaryContract {
  id: string;
  officeId: string;
  officeName: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  number: string;
  signedAt: string;
  closedAt: string | null;
  customerName: string | null;
  managerId: string | null;
  managerName: string | null;
  surveyorId: string | null;
  surveyorName: string | null;
  managerHandled: boolean;
  surveyorHandled: boolean;
  baseAmount: number;
  managerPercentOverride: number | null;
  surveyorPercentOverride: number | null;
  vsPercentOverride: number | null;
  brigadierPercentOverride: number | null;
  /** id пакета договора, из которого запись создана синхронизацией (null — ручная). */
  sourcePackageId: string | null;
  source: string | null;
  note: string | null;
  extraBills: SalaryExtraBill[];
  createdAt: string;
  updatedAt: string;
}

export interface SalaryContractsList {
  total: number;
  page: number;
  limit: number;
  items: SalaryContract[];
}

export interface SalaryCalcRow {
  id: string;
  officeId: string;
  officeName: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  number: string;
  signedAt: string;
  closedAt: string | null;
  customerName: string | null;
  managerId: string | null;
  managerName: string | null;
  surveyorId: string | null;
  surveyorName: string | null;
  managerHandled: boolean;
  surveyorHandled: boolean;
  baseAmount: number;
  extraBillsAmount: number;
  /** Доп. соглашения, вошедшие в расчёт (дата в периоде) */
  extraBills: Array<{ date: string; amount: number }>;
  percents: { manager: number; surveyor: number; vs: number; brigadier: number };
  split: { sign: number; close: number };
  parts: { sign: number; close: number; extra: number };
  managerAmount: number;
  surveyorAmount: number;
  vsAmount: number;
  brigadierAmount: number;
  managerCommon: number;
  surveyorCommon: number;
  signedInPeriod: boolean;
  closedInPeriod: boolean;
  totalAmount: number;
}

export interface SalaryCalcResult {
  period: { from: string; to: string };
  settings: {
    taxPercent: number;
    netFactor: number;
  };
  totals: {
    contractsCount: number;
    managerPersonalTotal: number;
    managerPersonalNet: number;
    surveyorFund: number;
    surveyorFundNet: number;
    brigadierFund: number;
    commonPool: number;
    brigadierTotal: number;
    brigadierTotalNet: number;
    vsTotal: number;
    stats: { signedCount: number; signedAmount: number; closedCount: number; closedAmount: number };
  };
  /** Кому начислен бригадирский фонд (фиксируется в настройках з/п). */
  brigadier: {
    userId: string | null;
    userName: string | null;
    total: number;
    totalNet: number;
  };
  vsByCategory: Array<{
    categoryId: string;
    categoryCode: string;
    categoryName: string;
    vsPercent: number;
    gross: number;
    net: number;
  }>;
  byManager: Array<{
    managerId: string | null;
    managerName: string;
    amount: number;
    contractsCount: number;
  }>;
  bySurveyor: Array<{
    surveyorId: string | null;
    surveyorName: string;
    amount: number;
    contractsCount: number;
  }>;
  byOffice: Array<{
    officeId: string;
    officeName: string;
    byCategory: Array<{
      categoryId: string;
      categoryCode: string;
      categoryName: string;
      managerAmount: number;
      surveyorAmount: number;
      vsAmount: number;
      brigadierAmount: number;
      commonPool: number;
      signedCount: number;
      signedAmount: number;
      closedCount: number;
      closedAmount: number;
      contractsCount: number;
    }>;
    totals: { vsAmount: number; brigadierAmount: number; commonPool: number };
  }>;
  rows: SalaryCalcRow[];
}

export interface SalarySettlementListItem {
  id: string;
  dateFrom: string;
  dateTo: string;
  status: 'DRAFT' | 'CONFIRMED';
  createdAt: string;
  createdByName: string | null;
}

export interface SalarySettlement extends SalarySettlementListItem {
  snapshot: SalaryCalcResult;
}

// ===== Настройки =====

export function getSalarySettings(): Promise<SalarySettings> {
  return request(
    `${API_URL}/admin/salary/settings`,
    {},
    'Не удалось загрузить настройки расчёта з/п'
  );
}

export function saveSalaryGlobalSettings(
  dto: Partial<Pick<SalaryGlobalSettings, 'taxPercent' | 'brigadierUserId'>>
): Promise<SalaryGlobalSettings> {
  return request(
    `${API_URL}/admin/salary/settings/global`,
    { method: 'PUT', body: JSON.stringify(dto) },
    'Не удалось сохранить глобальные настройки'
  );
}

export function createSalaryCategory(
  dto: Partial<Omit<SalaryCategory, 'id' | 'rateRules'>> & { code: string; name: string }
): Promise<SalaryCategory> {
  return request(
    `${API_URL}/admin/salary/settings/categories`,
    { method: 'POST', body: JSON.stringify(dto) },
    'Не удалось создать направление'
  );
}

export function updateSalaryCategory(
  id: string,
  dto: Partial<Omit<SalaryCategory, 'id' | 'rateRules'>>
): Promise<SalaryCategory> {
  return request(
    `${API_URL}/admin/salary/settings/categories/${id}`,
    { method: 'PATCH', body: JSON.stringify(dto) },
    'Не удалось сохранить направление'
  );
}

export function deleteSalaryCategory(id: string): Promise<{ ok: boolean }> {
  return request(
    `${API_URL}/admin/salary/settings/categories/${id}`,
    { method: 'DELETE' },
    'Не удалось удалить направление'
  );
}

export function upsertSalaryRateRule(
  categoryId: string,
  dto: { officeId?: string | null; role: string; percent: number }
): Promise<{ id: string }> {
  return request(
    `${API_URL}/admin/salary/settings/categories/${categoryId}/rate-rules`,
    { method: 'PUT', body: JSON.stringify(dto) },
    'Не удалось сохранить правило ставок'
  );
}

export function deleteSalaryRateRule(categoryId: string, ruleId: string): Promise<{ ok: boolean }> {
  return request(
    `${API_URL}/admin/salary/settings/categories/${categoryId}/rate-rules/${ruleId}`,
    { method: 'DELETE' },
    'Не удалось удалить правило ставок'
  );
}

// ===== Договоры =====

export function getSalaryContracts(
  params: {
    officeId?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    /** Тип записи: 'auto' — синхронизированы из договоров, 'manual' — внесены вручную. */
    entryKind?: 'auto' | 'manual';
    page?: number;
    limit?: number;
  } = {}
): Promise<SalaryContractsList> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  });
  return request(
    `${API_URL}/admin/salary/contracts?${qs.toString()}`,
    {},
    'Не удалось загрузить договоры'
  );
}

/** Payload создания/обновления договора расчёта з/п. */
export interface SalaryContractPayload {
  officeId: string;
  categoryId: string;
  number: string;
  signedAt: string | null;
  closedAt: string | null;
  customerName: string | null;
  managerId: string | null;
  managerName: string | null;
  surveyorId: string | null;
  surveyorName: string | null;
  managerHandled: boolean;
  surveyorHandled: boolean;
  baseAmount: number;
  managerPercentOverride: number | null;
  surveyorPercentOverride: number | null;
  vsPercentOverride: number | null;
  brigadierPercentOverride: number | null;
  source: string | null;
  note: string | null;
  extraBills: Array<{ amount: number; date: string; note: string | null }>;
}

export function createSalaryContract(dto: SalaryContractPayload): Promise<SalaryContract> {
  return request(
    `${API_URL}/admin/salary/contracts`,
    { method: 'POST', body: JSON.stringify(dto) },
    'Не удалось создать договор'
  );
}

export function updateSalaryContract(
  id: string,
  dto: Partial<SalaryContractPayload>
): Promise<SalaryContract> {
  return request(
    `${API_URL}/admin/salary/contracts/${id}`,
    { method: 'PATCH', body: JSON.stringify(dto) },
    'Не удалось сохранить договор'
  );
}

export function deleteSalaryContract(id: string): Promise<{ ok: boolean }> {
  return request(
    `${API_URL}/admin/salary/contracts/${id}`,
    { method: 'DELETE' },
    'Не удалось удалить договор'
  );
}

/** Итог синхронизации реестра з/п с договорами раздела «Договоры». */
export interface SalaryContractsSyncReport {
  created: number;
  updated: number;
  /** Ручные записи, «усыновлённые» синхронизацией по совпадению «офис + №». */
  adopted: number;
  skipped: Array<{ number: string; reason: string }>;
}

export function syncSalaryContracts(): Promise<SalaryContractsSyncReport> {
  return request(
    `${API_URL}/admin/salary/contracts/sync`,
    { method: 'POST' },
    'Не удалось синхронизировать договоры'
  );
}

// ===== Расчёт =====

export function calculateSalary(params: {
  dateFrom: string;
  dateTo: string;
  officeId?: string;
  employeeId?: string;
}): Promise<SalaryCalcResult> {
  const qs = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo });
  if (params.officeId) qs.set('officeId', params.officeId);
  if (params.employeeId) qs.set('employeeId', params.employeeId);
  return request(
    `${API_URL}/admin/salary/calculate?${qs.toString()}`,
    {},
    'Не удалось рассчитать з/п'
  );
}

export function getSalarySettlements(): Promise<SalarySettlementListItem[]> {
  return request(
    `${API_URL}/admin/salary/settlements`,
    {},
    'Не удалось загрузить зафиксированные расчёты'
  );
}

export function getSalarySettlement(id: string): Promise<SalarySettlement> {
  return request(`${API_URL}/admin/salary/settlements/${id}`, {}, 'Не удалось загрузить расчёт');
}

export function createSalarySettlement(dto: {
  dateFrom: string;
  dateTo: string;
}): Promise<{ id: string }> {
  return request(
    `${API_URL}/admin/salary/settlements`,
    { method: 'POST', body: JSON.stringify(dto) },
    'Не удалось зафиксировать расчёт'
  );
}

export function confirmSalarySettlement(id: string): Promise<{ id: string }> {
  return request(
    `${API_URL}/admin/salary/settlements/${id}/confirm`,
    { method: 'PUT' },
    'Не удалось подтвердить расчёт'
  );
}

export function deleteSalarySettlement(id: string): Promise<{ ok: boolean }> {
  return request(
    `${API_URL}/admin/salary/settlements/${id}`,
    { method: 'DELETE' },
    'Не удалось удалить расчёт'
  );
}
