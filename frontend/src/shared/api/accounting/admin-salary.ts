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

export interface SalaryEmployeeSalary {
  userId: string;
  userName: string | null;
  monthlySalary: number;
}

/** Индивидуальный план продаж менеджера: 3 порога объёма за месяц + премии за них. */
export interface SalaryManagerSalesPlan {
  userId: string;
  userName: string | null;
  threshold1: number;
  threshold2: number;
  threshold3: number;
  percent1: number;
  percent2: number;
  percent3: number;
}

export interface SalaryGlobalSettings {
  taxPercent: number;
  /** Контролировать режим работы (удержания из оклада за опоздания/ранние уходы). */
  workModeEnforced?: boolean;
  /** Удержание из оклада за каждое опоздание/ранний уход, ₽. */
  workModePenaltyRub?: number;
  /** Учитывать автозакрытия (удержания из оклада за автозакрытые рабочие дни). */
  autoCloseEnforced?: boolean;
  /** Удержание из оклада за каждое автозакрытие рабочего дня, ₽. */
  autoClosePenaltyRub?: number;
  /** Начислять премию «QR + Н» (терминал < 50% продаж месяца). */
  cashQrBonusEnforced?: boolean;
  /** Премия «QR + Н»: процент от не терминальных продаж месяца, %. */
  cashQrBonusPercent?: number;
  /** Учитывать прогулы (удержание дневной доли оклада за каждый прогул). */
  truancyEnforced?: boolean;
  /** Премии за места по итогам продаж месяца (журнал ДП), ₽. */
  salesBonusFirstPlace?: number;
  salesBonusSecondPlace?: number;
  salesBonusThirdPlace?: number;
  /** Минимальный уровень продаж менеджера за месяц для права на премию, ₽. */
  salesBonusMinSales?: number;
  /** Пользователь-бригадир (получатель бригадирского фонда); null — не назначен. */
  brigadierUserId: string | null;
  brigadierName: string | null;
  updatedAt: string | null;
  /** Установленные месячные оклады сотрудников. */
  employeeSalaries?: SalaryEmployeeSalary[];
  /** Индивидуальные планы продаж менеджеров. */
  managerSalesPlans?: SalaryManagerSalesPlan[];
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
  /** Минимальная предоплата по договору для начала расчёта з/п, % (0 — не требуется). */
  minPrepaidPercent: number;
  /** Пользователь — ведущий специалист направления (получатель з/п ВС); null — не назначен. */
  leadSpecialistUserId: string | null;
  leadSpecialistName: string | null;
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
  /** Дата внесения минимальной предоплаты (старт расчёта з/п); null — не внесена/не требуется. */
  prepaidReachedAt: string | null;
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
  /** Оплачено деньгами по договору; null — ручная запись без пакета-источника. */
  paidAmount: number | null;
  /** Оплачено, % от стоимости договора; null — нет данных. */
  paidPercent: number | null;
  /** Дата внесения минимальной предоплаты; null — не требуется или ещё не внесена. */
  prepaidReachedAt: string | null;
  /** Минимальная предоплата направления, % (0 — не требуется). */
  minPrepaidPercent: number;
  /** Минимальная предоплата требуется, но ещё не внесена — з/п по договору не считается. */
  awaitingPrepaid: boolean;
  /** Дата, к которой отнесена доля «при заключении» (с учётом сдвига на предоплату). */
  signDate: string | null;
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
  signedInPeriod: boolean;
  closedInPeriod: boolean;
  totalAmount: number;
}

export interface SalaryCalcResult {
  period: { from: string; to: string };
  settings: {
    taxPercent: number;
    netFactor: number;
    /** Премия «QR + Н»: процент от не терминальных продаж, %. */
    cashQrBonusPercent?: number;
  };
  totals: {
    contractsCount: number;
    managerPersonalTotal: number;
    managerPersonalNet: number;
    surveyorFund: number;
    surveyorFundNet: number;
    brigadierFund: number;
    brigadierTotal: number;
    brigadierTotalNet: number;
    vsTotal: number;
    /** Сумма окладов, начисленных за период. */
    salariesTotal?: number;
    /** Сумма премий за места по итогам продаж. */
    salesBonusesTotal?: number;
    /** Сумма премий за выполнение плана продаж. */
    salesPlanBonusesTotal?: number;
    /** Сумма премий «QR + Н». */
    cashQrBonusesTotal?: number;
    stats: { signedCount: number; signedAmount: number; closedCount: number; closedAmount: number };
  };
  /** Оклады за период: за каждый день 1/N оклада (N — дней в месяце этого дня);
   * при включённых контроле режима / учёте автозакрытий из оклада вычитаются
   * соответствующие удержания. */
  salaries?: Array<{
    userId: string;
    userName: string | null;
    monthlySalary: number;
    days: number;
    violationsCount?: number;
    penalty?: number;
    autoCloseCount?: number;
    autoClosePenalty?: number;
    truancyDays?: number;
    truancyDeduction?: number;
    /** Расшифровка удержаний по событиям (дата, основание, минуты, сумма). */
    deductions?: MySalaryDeduction[];
    amount: number;
  }>;
  /** Премии за места по итогам продаж за завершённые месяцы (журнал ДП). */
  salesBonuses?: Array<{
    userId: string;
    userName: string | null;
    month: string;
    place: number;
    salesAmount: number;
    amount: number;
  }>;
  /** Премии за выполнение плана продаж (пороги → % от з/п по договорам). */
  salesPlanBonuses?: Array<{
    userId: string;
    userName: string | null;
    month: string;
    salesAmount: number;
    reachedTiers: number;
    percent: number;
    baseAmount: number;
    amount: number;
  }>;
  /** Премии «QR + Н»: терминал < 50% продаж → % от остальных продаж. */
  cashQrBonuses?: Array<{
    userId: string;
    userName: string | null;
    month: string;
    totalSales: number;
    terminalSales: number;
    otherSales: number;
    terminalShare: number;
    amount: number;
  }>;
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
    /** Получатель фонда ВС направления (из настроек); null — не назначен. */
    userId: string | null;
    userName: string | null;
  }>;
  /** З/п ведущих специалистов — по получателям из привязок направлений. */
  byLeadSpecialist: Array<{
    userId: string;
    userName: string | null;
    categories: string[];
    amount: number;
    amountNet: number;
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
      signedCount: number;
      signedAmount: number;
      closedCount: number;
      closedAmount: number;
      contractsCount: number;
    }>;
    totals: { vsAmount: number; brigadierAmount: number };
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
  dto: Partial<
    Pick<
      SalaryGlobalSettings,
      | 'taxPercent'
      | 'brigadierUserId'
      | 'workModeEnforced'
      | 'workModePenaltyRub'
      | 'autoCloseEnforced'
      | 'autoClosePenaltyRub'
      | 'cashQrBonusEnforced'
      | 'cashQrBonusPercent'
      | 'truancyEnforced'
      | 'salesBonusFirstPlace'
      | 'salesBonusSecondPlace'
      | 'salesBonusThirdPlace'
      | 'salesBonusMinSales'
    > & {
      employeeSalaries: Array<{ userId: string; monthlySalary: number | null }>;
      managerSalesPlans: Array<{
        userId: string;
        threshold1: number | null;
        threshold2: number | null;
        threshold3: number | null;
        percent1: number | null;
        percent2: number | null;
        percent3: number | null;
      }>;
    }
  >
): Promise<SalaryGlobalSettings> {
  return request(
    `${API_URL}/admin/salary/settings/global`,
    { method: 'PUT', body: JSON.stringify(dto) },
    'Не удалось сохранить глобальные настройки'
  );
}

export function createSalaryCategory(
  dto: Partial<Omit<SalaryCategory, 'id' | 'rateRules' | 'leadSpecialistName'>> & {
    code: string;
    name: string;
  }
): Promise<SalaryCategory> {
  return request(
    `${API_URL}/admin/salary/settings/categories`,
    { method: 'POST', body: JSON.stringify(dto) },
    'Не удалось создать направление'
  );
}

export function updateSalaryCategory(
  id: string,
  dto: Partial<Omit<SalaryCategory, 'id' | 'rateRules' | 'leadSpecialistName'>>
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
  surveyorHandled: boolean;
  baseAmount: number;
  managerPercentOverride: number | null;
  surveyorPercentOverride: number | null;
  vsPercentOverride: number | null;
  brigadierPercentOverride: number | null;
  /** Дата внесения минимальной предоплаты (старт расчёта з/п); null — не внесена/не требуется. */
  prepaidReachedAt: string | null;
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

// ===== Моя з/п =====

export interface MySalaryContractPart {
  role: string;
  amount: number;
}

export interface MySalaryContract {
  id: string;
  number: string;
  categoryName: string;
  officeName: string;
  signedAt: string | null;
  closedAt: string | null;
  customerName: string | null;
  baseAmount: number;
  roles: string[];
  parts: MySalaryContractPart[];
  payout: number;
}

/** Личный расчёт текущего сотрудника: суммы по ролям (итоговые к выплате) и договоры. */
export interface MySalaryResult {
  period: { from: string; to: string };
  employee: { userId: string; userName: string };
  payouts: {
    manager: number;
    managerContracts: number;
    surveyor: number;
    surveyorContracts: number;
    vs: number;
    vsCategories: string[];
    brigadier: number;
    isBrigadier: boolean;
    /** Оклад за период (1/N оклада за каждый день). */
    salary?: number;
    /** Премия за место по итогам продаж за прошедшие месяцы. */
    bonus?: number;
    /** Премия за выполнение плана продаж. */
    planBonus?: number;
    /** Премия «QR + Н». */
    cashQrBonus?: number;
    total: number;
  };
  contracts: MySalaryContract[];
  /** Расшифровка удержаний из оклада: дата, основание, минуты, сумма. */
  deductions?: MySalaryDeduction[];
}

/** Одно удержание из оклада (контроль режима, автозакрытия, прогулы). */
export interface MySalaryDeduction {
  /** Дата события (YYYY-MM-DD). */
  date: string;
  /** Опоздание / ранний уход / автозакрытие дня / прогул. */
  kind: 'LATE' | 'EARLY_LEAVE' | 'AUTO_CLOSE' | 'TRUANCY';
  /** На сколько минут (для опоздания и раннего ухода). */
  minutes: number | null;
  amount: number;
}

export function getMySalary(params: { dateFrom: string; dateTo: string }): Promise<MySalaryResult> {
  const qs = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo });
  return request(`${API_URL}/admin/salary/my?${qs.toString()}`, {}, 'Не удалось загрузить з/п');
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
