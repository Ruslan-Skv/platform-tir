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

export type FurnitureScheduleProjectStatus = 'NEW' | 'IN_PROGRESS' | 'CLAIMS' | 'CLOSED';
export type FurnitureScheduleEntryKind = 'WEEKLY' | 'MILESTONE' | 'NOTE';

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
  | 'WORK_CLOSE_ACT'
  | 'PAUSE_START'
  | 'PAUSE_RESUME';

export type RepairContractTimelineEvent = {
  id: string;
  date: string;
  kind: 'CONTRACT';
  eventType: RepairContractTimelineEventType;
  text: string;
};

export type FurnitureScheduleEntry = {
  id: string;
  projectId: string;
  date: string;
  kind: FurnitureScheduleEntryKind;
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

export type FurnitureScheduleProject = {
  id: string;
  status: FurnitureScheduleProjectStatus;
  contractNumber: string | null;
  installationContractNumber: string | null;
  appliancesContractNumber: string | null;
  repairInfo: string | null;
  reviewInfo: string | null;
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
  contractDate: string | null;
  kzInfo: string | null;
  pauseStartDate: string | null;
  pauseResumeDate: string | null;
  workPeriodDays: number | null;
  workStartActDate: string | null;
  workCloseActDate: string | null;
  plannedStartDate: string | null;
  closedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  latestEntry: FurnitureScheduleEntry | null;
  stale: boolean;
  staleDays: number;
  calculatedEndDateBase?: string | null;
  calculatedEndDate?: string | null;
  effectiveWorkPeriodDays?: number | null;
  /** Календарных дней паузы (остановка → возобновление). */
  pauseCalendarDays?: number | null;
  syncedFromPackage?: boolean;
  /** Календарных дней до расчётного окончания; < 0 — просрочен. */
  deadlineDaysLeft?: number | null;
  /** Уровень предупреждения: ≤20 / ≤10 / ≤3 дн. или просрочка. */
  deadlineWarning?: 'D20' | 'D10' | 'D3' | 'OVERDUE' | null;
  addendums?: RepairContractAddendumMeta[];
  contractTimelineEvents?: RepairContractTimelineEvent[];
  entries?: FurnitureScheduleEntry[];
  installer?: {
    id: string;
    fullName: string;
    direction: string;
    grade: string;
    userId: string | null;
  } | null;
  package?: {
    id: string;
    kind?: string;
    title: string | null;
    status?: string;
    formData?: Record<string, unknown>;
    crmContractId?: string | null;
    crmContract?: {
      id: string;
      contractNumber: string;
      customerName: string | null;
      customerAddress: string | null;
      customerPhone: string | null;
      totalAmount?: string | number;
      advanceAmount?: string | number | null;
      actWorkStartDate?: string | null;
      actWorkEndDate?: string | null;
      contractDurationDays?: number | null;
    } | null;
  } | null;
};

export type FurnitureScheduleProjectInput = {
  status?: FurnitureScheduleProjectStatus;
  contractNumber?: string | null;
  installationContractNumber?: string | null;
  appliancesContractNumber?: string | null;
  repairInfo?: string | null;
  reviewInfo?: string | null;
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
  contractDate?: string | null;
  kzInfo?: string | null;
  pauseStartDate?: string | null;
  pauseResumeDate?: string | null;
  workPeriodDays?: number | null;
  workStartActDate?: string | null;
  workCloseActDate?: string | null;
  plannedStartDate?: string | null;
  note?: string | null;
};

export async function getFurnitureScheduleProjects(params?: {
  status?: FurnitureScheduleProjectStatus;
  installerId?: string;
  search?: string;
  staleOnly?: boolean;
}): Promise<FurnitureScheduleProject[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.installerId) search.set('installerId', params.installerId);
  if (params?.search) search.set('search', params.search);
  if (params?.staleOnly) search.set('staleOnly', '1');
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/furniture-schedules${q ? `?${q}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить план-график мебели');
  return res.json();
}

export async function getFurnitureScheduleProject(id: string): Promise<FurnitureScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/furniture-schedules/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить проект');
  return res.json();
}

export async function createFurnitureScheduleProject(
  data: FurnitureScheduleProjectInput
): Promise<FurnitureScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/furniture-schedules`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось создать проект');
  return res.json();
}

export async function updateFurnitureScheduleProject(
  id: string,
  data: Partial<FurnitureScheduleProjectInput>
): Promise<FurnitureScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/furniture-schedules/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось обновить проект');
  return res.json();
}

export async function setFurnitureScheduleProjectStatus(
  id: string,
  status: FurnitureScheduleProjectStatus
): Promise<FurnitureScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/furniture-schedules/${id}/status`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сменить статус');
  return res.json();
}

export async function deleteFurnitureScheduleProject(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/furniture-schedules/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить проект');
}

export async function addFurnitureScheduleEntry(
  projectId: string,
  data: { date: string; kind?: FurnitureScheduleEntryKind; text: string }
): Promise<FurnitureScheduleProject> {
  const res = await apiFetch(`${API_URL}/admin/furniture-schedules/${projectId}/entries`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось добавить запись');
  return res.json();
}

export async function updateFurnitureScheduleEntry(
  projectId: string,
  entryId: string,
  data: { date?: string; kind?: FurnitureScheduleEntryKind; text?: string }
): Promise<FurnitureScheduleProject> {
  const res = await apiFetch(
    `${API_URL}/admin/furniture-schedules/${projectId}/entries/${entryId}`,
    {
      method: 'PATCH',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) await throwApiError(res, 'Не удалось обновить запись');
  return res.json();
}

export async function deleteFurnitureScheduleEntry(
  projectId: string,
  entryId: string
): Promise<FurnitureScheduleProject> {
  const res = await apiFetch(
    `${API_URL}/admin/furniture-schedules/${projectId}/entries/${entryId}`,
    {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) await throwApiError(res, 'Не удалось удалить запись');
  return res.json();
}

export async function getMyFurnitureScheduleProjects(params?: {
  status?: FurnitureScheduleProjectStatus;
  search?: string;
}): Promise<FurnitureScheduleProject[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.search) search.set('search', params.search);
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/furniture-schedules/my${q ? `?${q}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить мои ремонты');
  return res.json();
}

export type FurnitureScheduleImportResult = {
  sheetName: string;
  weekColumns: number;
  projectsInFile: number;
  skippedRows: number;
  created: number;
  updated: number;
  entriesUpserted: number;
};

export async function importFurnitureScheduleExcel(
  file: File,
  years: number[] = [2025, 2026]
): Promise<FurnitureScheduleImportResult> {
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
  const res = await apiFetch(`${API_URL}/admin/furniture-schedules/import${qs}`, {
    method: 'POST',
    headers,
    body: form,
  });
  if (!res.ok) await throwApiError(res, 'Не удалось импортировать файл');
  return res.json();
}
