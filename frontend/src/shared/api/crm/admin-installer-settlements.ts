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

/** Проводка «выдан аванс мастеру» из модалки «Заказ-наряды» договора. */
export type InstallerSettlementAdvance = {
  id: string;
  packageId: string;
  installerId: string | null;
  /** Живое имя из справочника, иначе снимок на момент выдачи. */
  installerName: string | null;
  /** Разряд мастера из справочника («4», «5», «6» …); null — мастер удалён. */
  installerGrade: string | null;
  /** Дата выдачи аванса (YYYY-MM-DD). */
  paidAt: string;
  amount: string;
  note: string | null;
  direction: string;
  packageStatus: string;
  contractNumber: string | null;
  customerName: string | null;
  objectAddress: string | null;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
};

/** Сводка «начислено / выплачено / остаток» по мастеру (все договоры фильтра). */
export type InstallerSettlementMaster = {
  key: string;
  installerId: string | null;
  name: string;
  grade: string | null;
  /** Есть назначения мастера в заказ-нарядах; иначе остаток неизвестен. */
  hasAccruals: boolean;
  /** «Начислено» по заказ-нарядам (итоговая смета × коэффициенты направления). */
  accrued: number;
  lineCount: number;
  /** Выдано авансов всего по договорам фильтра (независимо от периода). */
  paidTotal: number;
  /** Выдано авансов за выбранный период. */
  paidInPeriod: number;
  advancesCount: number;
  advancesInPeriodCount: number;
  packagesCount: number;
  /** Остаток к выплате; отрицательный — переплата; null — нет заказ-наряда. */
  balance: number | null;
};

export type InstallerSettlementOption = { id: string; name: string };

export type InstallerSettlementsListResponse = {
  data: InstallerSettlementAdvance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Выдано авансов за период (журнал с текущими фильтрами). */
  totalPaidInPeriod: number;
  /** Выплаты за период по направлениям. */
  directionSums: { direction: string; sum: number }[];
  /** Сводка по мастерам: переплаты и недоплаты по договорам фильтра. */
  masters: InstallerSettlementMaster[];
  /** Мастера для фильтра: живое имя приоритетнее снимка из журнала. */
  installers: InstallerSettlementOption[];
};

export async function getInstallerSettlements(params?: {
  installerId?: string;
  direction?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<InstallerSettlementsListResponse> {
  const search = new URLSearchParams();
  if (params?.installerId) search.set('installerId', params.installerId);
  if (params?.direction) search.set('direction', params.direction);
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.search) search.set('search', params.search);
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 50));
  const res = await apiFetch(`${API_URL}/admin/installer-settlements?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить расчёт мастеров');
  return res.json();
}

/** Договор для формы выдачи аванса (поиск по № договора / заказчику). */
export type InstallerSettlementPackageOption = {
  id: string;
  kind: string;
  direction: string;
  status: string;
  contractNumber: string | null;
  customerName: string | null;
  objectAddress: string | null;
};

export async function searchInstallerSettlementPackages(params?: {
  search?: string;
  limit?: number;
}): Promise<InstallerSettlementPackageOption[]> {
  const search = new URLSearchParams();
  if (params?.search) search.set('search', params.search);
  if (params?.limit) search.set('limit', String(params.limit));
  const res = await apiFetch(`${API_URL}/admin/installer-settlements/packages?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить договоры');
  return res.json();
}

export type CreateInstallerSettlementAdvanceParams = {
  packageId: string;
  installerId: string;
  /** Дата выдачи (YYYY-MM-DD). */
  paidAt: string;
  amount: number;
  note?: string;
};

/** Выдать аванс из раздела — та же запись, что в модалке «Заказ-наряды» договора. */
export async function createInstallerSettlementAdvance(
  params: CreateInstallerSettlementAdvanceParams
): Promise<InstallerSettlementAdvance> {
  const res = await apiFetch(`${API_URL}/admin/installer-settlements/advances`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось зафиксировать выплату');
  return res.json();
}
