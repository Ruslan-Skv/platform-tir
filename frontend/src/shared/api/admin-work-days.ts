import type { BackendRole } from '@/shared/config/admin-roles';
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

export type WorkDayStatus = 'OPEN' | 'CLOSED' | 'AUTO_CLOSED';

export interface DayScheduleEntry {
  enabled: boolean;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
}

export type WeeklySchedule = Record<string, DayScheduleEntry>;

export interface WorkDayAbsence {
  id: string;
  workDayId: string;
  startedAt: string;
  endedAt: string | null;
  reason: string | null;
  comment: string | null;
}

export interface WorkDayRecord {
  id: string;
  userId: string;
  officeId: string | null;
  workDate: string;
  status: WorkDayStatus;
  startedAt: string;
  endedAt: string | null;
  closeReason: string | null;
  autoClosedAt: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  reportedEndAt: string | null;
  office?: { id: string; name: string } | null;
  absences?: WorkDayAbsence[];
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
}

export interface WorkDaySettings {
  id: string;
  isEnabled: boolean;
  trackedRoles: BackendRole[];
  blockAdminWithoutWorkDay: boolean;
  requireOfficeIp: boolean;
  blockMobileDevices: boolean;
  autoCloseHour: number;
  autoCloseMinute: number;
  defaultGracePeriodMinutes: number;
  greetingMessages: string[];
}

export interface WorkDayMyStatus {
  tracked: boolean;
  settings: {
    isEnabled: boolean;
    blockAdminWithoutWorkDay: boolean;
    requireOfficeIp: boolean;
    blockMobileDevices: boolean;
  };
  isWorkDayToday: boolean;
  approvedDayOff?: boolean;
  approvedEarlyLeave?: boolean;
  approvedLateArrival?: boolean;
  todayWorkDay: WorkDayRecord | null;
  forgottenOpenDay: WorkDayRecord | null;
  hasOpenAbsence: boolean;
  canAccessAdmin: boolean;
  schedule: {
    startTime: string;
    endTime: string;
    workDaysOfWeek: number[];
    gracePeriodMinutes: number;
    weeklySchedule: WeeklySchedule;
    today: DayScheduleEntry & { isWorkDay: boolean };
  };
  office: {
    id: string;
    name: string;
    allowedIps: string[];
    skipWorkDayIpCheck: boolean;
  } | null;
}

export interface WorkDayOfficeSchedule {
  id: string;
  name: string;
  isActive: boolean;
  allowedIps: string[];
  skipWorkDayIpCheck: boolean;
  workDayStartTime: string;
  workDayEndTime: string;
  workDaysOfWeek: number[];
  gracePeriodMinutes: number;
  workDayWeeklySchedule?: WeeklySchedule | null;
}

export interface WorkDayUserSchedule {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: BackendRole;
  officeId: string | null;
  workDayTrackingEnabled: boolean;
  useCustomWorkSchedule: boolean;
  workDayStartTime: string | null;
  workDayEndTime: string | null;
  workDaysOfWeek: number[];
  gracePeriodMinutes: number | null;
  workDayWeeklySchedule?: WeeklySchedule | null;
  office?: { id: string; name: string } | null;
}

export async function getWorkDayMyStatus(): Promise<WorkDayMyStatus> {
  const res = await apiFetch(`${API_URL}/admin/work-days/my/status`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить статус рабочего дня');
  return res.json();
}

export async function startWorkDay(): Promise<{ workDay: WorkDayRecord; greeting: string }> {
  const res = await apiFetch(`${API_URL}/admin/work-days/my/start`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось начать рабочий день');
  }
  return res.json();
}

export async function endWorkDay(): Promise<WorkDayRecord> {
  const res = await apiFetch(`${API_URL}/admin/work-days/my/end`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось завершить рабочий день');
  }
  return res.json();
}

export async function startWorkDayAbsence(data: {
  reason?: string;
  comment?: string;
}): Promise<WorkDayAbsence> {
  const res = await apiFetch(`${API_URL}/admin/work-days/my/absence/start`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отметить отсутствие');
  }
  return res.json();
}

export async function endWorkDayAbsence(): Promise<WorkDayAbsence> {
  const res = await apiFetch(`${API_URL}/admin/work-days/my/absence/end`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отметить возвращение');
  }
  return res.json();
}

export async function closeForgottenWorkDay(data: {
  workDayId: string;
  reportedEndTime: string;
}): Promise<WorkDayRecord> {
  const res = await apiFetch(`${API_URL}/admin/work-days/my/close-forgotten`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось закрыть предыдущий день');
  }
  return res.json();
}

export async function getMyClientIp(): Promise<{ ip: string | null }> {
  const res = await apiFetch(`${API_URL}/admin/work-days/my/client-ip`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось определить IP');
  return res.json();
}

export async function getMyWorkDayHistory(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<MyWorkDayHistoryResponse> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  const qs = search.toString();
  const res = await apiFetch(`${API_URL}/admin/work-days/my/history${qs ? `?${qs}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю рабочих дней');
  return res.json();
}

export interface MyWorkDayHistorySummary {
  totalDays: number;
  lateDays: number;
  earlyLeaveDays: number;
  autoClosedDays: number;
  totalAbsenceMinutes: number;
}

export interface MyWorkDayHistoryResponse {
  records: WorkDayRecord[];
  summary: MyWorkDayHistorySummary;
}

export async function getWorkDays(params?: {
  dateFrom?: string;
  dateTo?: string;
  officeId?: string;
  userId?: string;
}): Promise<WorkDayRecord[]> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.officeId) search.set('officeId', params.officeId);
  if (params?.userId) search.set('userId', params.userId);
  const qs = search.toString();
  const res = await apiFetch(`${API_URL}/admin/work-days${qs ? `?${qs}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить учёт рабочего времени');
  return res.json();
}

export async function deleteWorkDay(id: string): Promise<{ id: string }> {
  const res = await apiFetch(`${API_URL}/admin/work-days/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось удалить запись');
  }
  return res.json();
}

export async function getWorkDaySettings(): Promise<WorkDaySettings> {
  const res = await apiFetch(`${API_URL}/admin/work-days/settings`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateWorkDaySettings(
  data: Partial<WorkDaySettings>
): Promise<WorkDaySettings> {
  const res = await apiFetch(`${API_URL}/admin/work-days/settings`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось сохранить настройки');
  return res.json();
}

export async function getWorkDayOffices(): Promise<WorkDayOfficeSchedule[]> {
  const res = await apiFetch(`${API_URL}/admin/work-days/offices`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить офисы');
  return res.json();
}

export async function updateWorkDayOffice(
  officeId: string,
  data: Partial<WorkDayOfficeSchedule>
): Promise<WorkDayOfficeSchedule> {
  const res = await apiFetch(`${API_URL}/admin/work-days/offices/${officeId}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось сохранить настройки офиса');
  return res.json();
}

export async function getWorkDayUsers(): Promise<WorkDayUserSchedule[]> {
  const res = await apiFetch(`${API_URL}/admin/work-days/users`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить сотрудников');
  return res.json();
}

export async function updateWorkDayUser(
  userId: string,
  data: Partial<WorkDayUserSchedule>
): Promise<WorkDayUserSchedule> {
  const res = await apiFetch(`${API_URL}/admin/work-days/users/${userId}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось сохранить настройки сотрудника');
  return res.json();
}

export type WorkDayRequestType = 'DAY_OFF' | 'EARLY_LEAVE' | 'LATE_ARRIVAL';
export type WorkDayRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface WorkDayRequest {
  id: string;
  userId: string;
  type: WorkDayRequestType;
  status: WorkDayRequestStatus;
  requestDate: string;
  proposedEndTime: string | null;
  comment: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role?: string;
  };
  reviewedBy?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export async function createMyWorkDayRequest(body: {
  type: WorkDayRequestType;
  requestDate: string;
  proposedEndTime?: string;
  comment?: string;
}): Promise<WorkDayRequest> {
  const res = await apiFetch(`${API_URL}/admin/work-days/my/requests`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить запрос');
  }
  return res.json();
}

export async function getMyWorkDayRequests(params?: {
  dateFrom?: string;
  dateTo?: string;
  status?: WorkDayRequestStatus;
}): Promise<WorkDayRequest[]> {
  const search = new URLSearchParams();
  if (params?.dateFrom) search.set('dateFrom', params.dateFrom);
  if (params?.dateTo) search.set('dateTo', params.dateTo);
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  const res = await apiFetch(`${API_URL}/admin/work-days/my/requests${qs ? `?${qs}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить запросы');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function cancelMyWorkDayRequest(id: string): Promise<WorkDayRequest> {
  const res = await apiFetch(`${API_URL}/admin/work-days/my/requests/${id}/cancel`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отменить запрос');
  }
  return res.json();
}

export async function getAdminWorkDayRequests(params?: {
  status?: WorkDayRequestStatus;
}): Promise<WorkDayRequest[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  const qs = search.toString();
  const res = await apiFetch(`${API_URL}/admin/work-days/requests${qs ? `?${qs}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить запросы');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function approveWorkDayRequest(
  id: string,
  body?: { reviewComment?: string }
): Promise<WorkDayRequest> {
  const res = await apiFetch(`${API_URL}/admin/work-days/requests/${id}/approve`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось подтвердить запрос');
  }
  return res.json();
}

export async function rejectWorkDayRequest(
  id: string,
  body?: { reviewComment?: string }
): Promise<WorkDayRequest> {
  const res = await apiFetch(`${API_URL}/admin/work-days/requests/${id}/reject`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отклонить запрос');
  }
  return res.json();
}
