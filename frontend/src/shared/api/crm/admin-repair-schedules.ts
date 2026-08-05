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

export type RepairScheduleProjectStatus = 'NEW' | 'IN_PROGRESS' | 'CLOSED';
export type RepairScheduleEntryKind = 'WEEKLY' | 'MILESTONE' | 'NOTE';

export type RepairContractAddendumMeta = {
  number: number;
  documentDate: string | null;
  status: 'OPEN' | 'SIGNED' | 'PAID' | string;
  workPeriodChangeDays: number | null;
  signedAt: string | null;
  paidAt: string | null;
};

export type RepairContractTimelineEventType =
  | 'WORK_START_ACT'
  | 'ADDENDUM'
  | 'CALCULATED_END_BASE'
  | 'CALCULATED_END'
  | 'WORK_CLOSE_ACT';

export type RepairContractTimelineEvent = {
  id: string;
  date: string;
  kind: 'CONTRACT';
  eventType: RepairContractTimelineEventType;
  text: string;
};

export type RepairScheduleEntry = {
  id: string;
  projectId: string;
  date: string;
  kind: RepairScheduleEntryKind;
  text: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null;
};

export type RepairScheduleProject = {
  id: string;
  status: RepairScheduleProjectStatus;
  contractNumber: string | null;
  workScope: string | null;
  installerId: string | null;
  installerName: string | null;
  packageId: string | null;
  contractId: string | null;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  contractSum: string | number | null;
  payoutSum: string | number | null;
  furnitureInfo: string | null;
  workPeriodDays: number | null;
  workStartActDate: string | null;
  workCloseActDate: string | null;
  plannedStartDate: string | null;
  closedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  latestEntry: RepairScheduleEntry | null;
  stale: boolean;
  staleDays: number;
  calculatedEndDateBase?: string | null;
  calculatedEndDate?: string | null;
  effectiveWorkPeriodDays?: number | null;
  syncedFromPackage?: boolean;
  /** Календарных дней до расчётного окончания; < 0 — просрочен. */
  deadlineDaysLeft?: number | null;
  /** Уровень предупреждения: ≤20 / ≤10 / ≤3 дн. или просрочка. */
  deadlineWarning?: 'D20' | 'D10' | 'D3' | 'OVERDUE' | null;
  addendums?: RepairContractAddendumMeta[];
  contractTimelineEvents?: RepairContractTimelineEvent[];
  entries?: RepairScheduleEntry[];
  installer?: {
    id: string;
    fullName: string;
    direction: string;
    grade: string;
    userId: string | null;
  } | null;
};

export type RepairScheduleProjectInput = {
  status?: RepairScheduleProjectStatus;
  contractNumber?: string | null;
  workScope?: string | null;
  installerId?: string | null;
  installerName?: string | null;
  packageId?: string | null;
  contractId?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  contractSum?: number | null;
  payoutSum?: number | null;
  furnitureInfo?: string | null;
  workPeriodDays?: number | null;
  workStartActDate?: string | null;
  workCloseActDate?: string | null;
  plannedStartDate?: string | null;
  note?: string | null;
};

export async function getRepairScheduleProjects(params?: {
  status?: RepairScheduleProjectStatus;
  installerId?: string;
  search?: string;
  staleOnly?: boolean;
}): Promise<RepairScheduleProject[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.installerId) search.set('installerId', params.installerId);
  if (params?.search) search.set('search', params.search);
  if (params?.staleOnly) search.set('staleOnly', '1');
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/repair-schedules${q ? `?${q}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить план-график ремонта');
  return res.json();
}

export async function getRepairScheduleProject(id: string): Promise<RepairScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/repair-schedules/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить проект');
  return res.json();
}

export async function createRepairScheduleProject(
  data: RepairScheduleProjectInput
): Promise<RepairScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/repair-schedules`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось создать проект');
  return res.json();
}

export async function updateRepairScheduleProject(
  id: string,
  data: Partial<RepairScheduleProjectInput>
): Promise<RepairScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/repair-schedules/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось обновить проект');
  return res.json();
}

export async function setRepairScheduleProjectStatus(
  id: string,
  status: RepairScheduleProjectStatus
): Promise<RepairScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/repair-schedules/${id}/status`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сменить статус');
  return res.json();
}

export async function deleteRepairScheduleProject(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/repair-schedules/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить проект');
}

export async function addRepairScheduleEntry(
  projectId: string,
  data: { date: string; kind?: RepairScheduleEntryKind; text: string }
): Promise<RepairScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/repair-schedules/${projectId}/entries`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось добавить запись');
  return res.json();
}

export async function deleteRepairScheduleEntry(
  projectId: string,
  entryId: string
): Promise<RepairScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/repair-schedules/${projectId}/entries/${entryId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить запись');
  return res.json();
}

export async function getMyRepairScheduleProjects(params?: {
  status?: RepairScheduleProjectStatus;
  search?: string;
}): Promise<RepairScheduleProject[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.search) search.set('search', params.search);
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/repair-schedules/my${q ? `?${q}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить мои ремонты');
  return res.json();
}

export type RepairScheduleImportResult = {
  sheetName: string;
  weekColumns: number;
  projectsInFile: number;
  skippedRows: number;
  created: number;
  updated: number;
  entriesUpserted: number;
};

export async function importRepairScheduleExcel(
  file: File,
  years: number[] = [2025, 2026]
): Promise<RepairScheduleImportResult> {
  const form = new FormData();
  form.append('file', file);
  const qs = years.length ? `?years=${years.join(',')}` : '';
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('admin_token') || localStorage.getItem('user_token')
      : null;
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  const res = await apiFetch(`${API_URL}/admin/repair-schedules/import${qs}`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) await throwApiError(res, 'Не удалось импортировать файл');
  return res.json();
}
