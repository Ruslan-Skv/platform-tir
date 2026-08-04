'use client';

import type { InstallerDirection } from '@/shared/api/admin-crm';
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

export type InstallationScheduleStatus = 'PLANNED' | 'DONE' | 'FAILED';

export type InstallationSchedule = {
  id: string;
  date: string;
  timeFrom: string | null;
  timeTo: string | null;
  timeText: string | null;
  direction: InstallerDirection;
  orderInfo: string | null;
  note: string | null;
  installerId: string | null;
  installerName: string | null;
  packageId: string | null;
  contractId: string | null;
  contractNumber: string | null;
  workOrderKey: string | null;
  workOrderLabel: string | null;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  customerPhones: string[];
  status: InstallationScheduleStatus;
  completionNote: string | null;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  deletedAt?: string | null;
  deletedById?: string | null;
  permanentDeleteAt?: string | null;
  deletedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null;
};

export type InstallationScheduleInput = {
  date: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  timeText?: string | null;
  direction: InstallerDirection;
  orderInfo?: string | null;
  note?: string | null;
  installerId?: string | null;
  installerName?: string | null;
  packageId?: string | null;
  contractId?: string | null;
  contractNumber?: string | null;
  workOrderKey?: string | null;
  workOrderLabel?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerPhones?: string[] | null;
};

export type InstallationWorkOrderOption = {
  key: string;
  label: string;
  assignedToInstaller?: boolean;
};

export async function getInstallationSchedules(params?: {
  dateFrom?: string;
  dateTo?: string;
  direction?: InstallerDirection;
  installerId?: string;
}): Promise<InstallationSchedule[]> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.direction) search.set('direction', params.direction);
  if (params?.installerId) search.set('installerId', params.installerId);
  const res = await apiFetch(`${API_URL}/admin/installation-schedules?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить график монтажей');
  return res.json();
}

export async function getMyInstallationSchedules(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<InstallationSchedule[]> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/installation-schedules/my${q ? `?${q}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить мои монтажи');
  return res.json();
}

async function mutate<T>(path: string, method: string, data?: unknown): Promise<T> {
  const res = await apiFetch(`${API_URL}/admin/installation-schedules/${path}`, {
    method,
    headers: getAdminAuthHeaders(),
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сохранить запись');
  return res.json() as Promise<T>;
}

export async function createInstallationSchedule(
  data: InstallationScheduleInput
): Promise<InstallationSchedule> {
  const res = await apiFetch(`${API_URL}/admin/installation-schedules`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось создать запись');
  return res.json();
}

export const updateInstallationSchedule = (id: string, data: Partial<InstallationScheduleInput>) =>
  mutate<InstallationSchedule>(id, 'PATCH', data);
export const deleteInstallationSchedule = (id: string) => mutate<void>(id, 'DELETE');
export const completeInstallationSchedule = (id: string, note?: string | null) =>
  mutate<InstallationSchedule>(`${id}/complete`, 'POST', { note: note ?? null });
export const failInstallationSchedule = (id: string, note: string) =>
  mutate<InstallationSchedule>(`${id}/fail`, 'POST', { note });
export const reopenInstallationSchedule = (id: string) =>
  mutate<InstallationSchedule>(`${id}/reopen`, 'POST', {});
export const rescheduleInstallationSchedule = (
  id: string,
  data: { date: string; timeFrom?: string | null; timeTo?: string | null; timeText?: string | null }
) => mutate<InstallationSchedule>(`${id}/reschedule`, 'POST', data);

export async function getInstallationWorkOrders(params: {
  packageId?: string;
  installerId?: string;
}): Promise<{
  options: InstallationWorkOrderOption[];
  selectedInstallerIds: string[];
  installerAssigned: boolean;
}> {
  const search = new URLSearchParams();
  if (params.packageId) search.set('packageId', params.packageId);
  if (params.installerId) search.set('installerId', params.installerId);
  const res = await apiFetch(`${API_URL}/admin/installation-schedules/work-orders?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить состав заказа');
  return res.json();
}

export async function getInstallationScheduleTrashCount(): Promise<number> {
  const res = await apiFetch(`${API_URL}/admin/installation-schedules/trash/count`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить счётчик корзины');
  const data = (await res.json()) as { count: number };
  return data.count ?? 0;
}

export async function getInstallationScheduleTrash(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: InstallationSchedule[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  trashRetentionDays?: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  searchParams.set('page', String(params?.page ?? 1));
  searchParams.set('limit', String(params?.limit ?? 15));
  const res = await apiFetch(`${API_URL}/admin/installation-schedules/trash?${searchParams}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить корзину');
  return res.json();
}

export async function restoreInstallationSchedule(id: string): Promise<InstallationSchedule> {
  const res = await apiFetch(`${API_URL}/admin/installation-schedules/${id}/restore`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось восстановить запись');
  return res.json();
}
