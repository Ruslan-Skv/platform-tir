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

export type OdpzhScheduleStatus = 'NEW' | 'IN_PROGRESS' | 'CLOSED';

/** Направления план-графика ОДПЖ (мебель — отдельный раздел). */
export type OdpzhScheduleDirection = 'WINDOWS' | 'DOORS' | 'CEILINGS' | 'BLINDS';

/** Запись графика монтажей договора (для таймлайна). */
export type OdpzhScheduleEntry = {
  id: string;
  date: string;
  dateEnd: string | null;
  direction: string;
  status: 'PLANNED' | 'DONE' | 'FAILED';
  installerName: string | null;
  workOrderKey: string | null;
};

export type OdpzhScheduleRow = {
  id: string;
  contractNumber: string | null;
  kind: OdpzhScheduleDirection;
  status: OdpzhScheduleStatus;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  contractSum: number | null;
  installerNames: string[];
  nearestInstallationDate: string | null;
  lastInstallationDate: string | null;
  entriesCount: number;
  entries: OdpzhScheduleEntry[];
  createdAt: string;
  updatedAt: string;
};

export async function getOdpzhSchedules(params?: {
  status?: OdpzhScheduleStatus;
  direction?: OdpzhScheduleDirection;
  search?: string;
}): Promise<OdpzhScheduleRow[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.direction) search.set('direction', params.direction);
  if (params?.search) search.set('search', params.search);
  const q = search.toString();
  const res = await apiFetch(`${API_URL}/admin/odpzh-schedules${q ? `?${q}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить план-график ОДПЖ');
  return res.json();
}
