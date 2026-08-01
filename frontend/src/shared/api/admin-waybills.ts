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

export type WaybillTaskStatus = 'PLANNED' | 'DONE' | 'FAILED';

export interface WaybillTaskUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export interface WaybillTaskContract {
  id: string;
  contractNumber: string;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
}

export interface WaybillTask {
  id: string;
  date: string;
  timeFrom: string | null;
  timeTo: string | null;
  direction: string | null;
  taskText: string;
  customerInfoText: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerPhones?: string[];
  contractId: string | null;
  deliveryCost: string | number | null;
  deliveryPayer: string | null;
  moversCost: string | number | null;
  moversPayer: string | null;
  responsibleUserId: string | null;
  driverUserId: string | null;
  status: WaybillTaskStatus;
  completionNote: string | null;
  completedAt: string | null;
  completedById: string | null;
  createdById: string | null;
  deletedAt: string | null;
  deletedById: string | null;
  /** ISO — дата безвозвратного удаления из корзины (только в ответе trash). */
  permanentDeleteAt?: string | null;
  createdAt: string;
  updatedAt: string;
  contract?: WaybillTaskContract | null;
  responsible?: WaybillTaskUser | null;
  driver?: WaybillTaskUser | null;
  completedBy?: WaybillTaskUser | null;
  createdBy?: WaybillTaskUser | null;
  deletedBy?: WaybillTaskUser | null;
}

export type WaybillTaskInput = {
  date: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  direction?: string | null;
  taskText: string;
  customerInfoText?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  customerPhone?: string | null;
  customerPhones?: string[] | null;
  contractId?: string | null;
  deliveryCost?: number | null;
  deliveryPayer?: string | null;
  moversCost?: number | null;
  moversPayer?: string | null;
  responsibleUserId?: string | null;
  driverUserId?: string | null;
};

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
  const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
  throw new Error(msg || fallback);
}

export async function getWaybillTasksByDate(date: string): Promise<WaybillTask[]> {
  return getWaybillTasks({ dateFrom: date, dateTo: date });
}

export async function getWaybillTasks(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<WaybillTask[]> {
  const searchParams = new URLSearchParams();
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  const q = searchParams.toString();
  const res = await apiFetch(`${API_URL}/admin/waybills${q ? `?${q}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить путевой лист');
  return res.json();
}

export async function getMyWaybillTasks(params?: {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<WaybillTask[]> {
  const searchParams = new URLSearchParams();
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  if (!params?.dateFrom && !params?.dateTo && params?.date) {
    searchParams.set('date', params.date);
  }
  const q = searchParams.toString();
  const res = await apiFetch(`${API_URL}/admin/waybills/my${q ? `?${q}` : ''}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить маршрут');
  return res.json();
}

export async function createWaybillTask(data: WaybillTaskInput): Promise<WaybillTask> {
  const res = await apiFetch(`${API_URL}/admin/waybills`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось создать задание');
  return res.json();
}

export async function updateWaybillTask(
  id: string,
  data: Partial<WaybillTaskInput>
): Promise<WaybillTask> {
  const res = await apiFetch(`${API_URL}/admin/waybills/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось обновить задание');
  return res.json();
}

export async function deleteWaybillTask(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/waybills/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить задание');
}

export async function completeWaybillTask(id: string, note?: string | null): Promise<WaybillTask> {
  const res = await apiFetch(`${API_URL}/admin/waybills/${id}/complete`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ note: note ?? null }),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось отметить выполнение');
  return res.json();
}

export async function failWaybillTask(id: string, note: string): Promise<WaybillTask> {
  const res = await apiFetch(`${API_URL}/admin/waybills/${id}/fail`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ note }),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось отметить невыполнение');
  return res.json();
}

export async function rescheduleWaybillTask(
  id: string,
  data: { date: string; timeFrom?: string | null; timeTo?: string | null }
): Promise<{ copy: WaybillTask }> {
  const res = await apiFetch(`${API_URL}/admin/waybills/${id}/reschedule`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось скопировать задание');
  return res.json();
}

export async function reopenWaybillTask(id: string): Promise<WaybillTask> {
  const res = await apiFetch(`${API_URL}/admin/waybills/${id}/reopen`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось вернуть задание в план');
  return res.json();
}

export async function getWaybillTrashCount(): Promise<number> {
  const res = await apiFetch(`${API_URL}/admin/waybills/trash/count`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить счётчик корзины');
  const data = (await res.json()) as { count: number };
  return data.count ?? 0;
}

export async function getWaybillTrash(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: WaybillTask[];
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
  const res = await apiFetch(`${API_URL}/admin/waybills/trash?${searchParams}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить корзину');
  return res.json();
}

export async function restoreWaybillTask(id: string): Promise<WaybillTask> {
  const res = await apiFetch(`${API_URL}/admin/waybills/${id}/restore`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось восстановить задание');
  return res.json();
}

export type DriverDeliveryCycleDay = {
  kind: 'ON' | 'OFF';
  availableFrom?: string | null;
  availableTo?: string | null;
};

export type DriverDeliveryAbsenceBlock = {
  kind: 'VACATION' | 'SICK';
  dateFrom: string;
  dateTo: string;
  note?: string | null;
};

export type DriverDeliveryAvailabilityScheme = {
  id: string;
  userId: string;
  isActive: boolean;
  cycleAnchorDate: string;
  cycleDays: DriverDeliveryCycleDay[];
  absenceBlocks: DriverDeliveryAbsenceBlock[];
  notes: string | null;
  updatedAt: string;
};

export type DriverDeliveryAvailabilityListItem = {
  user: WaybillTaskUser;
  scheme: DriverDeliveryAvailabilityScheme | null;
};

export type DriverAvailabilityStatus = {
  userId: string;
  hasScheme: boolean;
  isActive: boolean;
  available: boolean;
  kind: 'ON' | 'OFF' | 'VACATION' | 'SICK' | 'NONE';
  availableFrom: string | null;
  availableTo: string | null;
  label: string;
  outsideWindow: boolean;
};

export type UpsertDriverDeliveryAvailabilityInput = {
  isActive?: boolean;
  cycleAnchorDate: string;
  cycleDays: DriverDeliveryCycleDay[];
  absenceBlocks?: DriverDeliveryAbsenceBlock[];
  notes?: string | null;
};

export async function listDriverDeliveryAvailability(): Promise<
  DriverDeliveryAvailabilityListItem[]
> {
  const res = await apiFetch(`${API_URL}/admin/waybills/driver-availability`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось загрузить схемы водителей');
  return res.json();
}

export async function upsertDriverDeliveryAvailability(
  userId: string,
  input: UpsertDriverDeliveryAvailabilityInput
): Promise<DriverDeliveryAvailabilityScheme> {
  const res = await apiFetch(`${API_URL}/admin/waybills/driver-availability/${userId}`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось сохранить схему');
  return res.json();
}

export async function deleteDriverDeliveryAvailability(userId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/waybills/driver-availability/${userId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) await throwApiError(res, 'Не удалось удалить схему');
}

export async function resolveDriverDeliveryAvailability(params: {
  date: string;
  timeFrom?: string | null;
}): Promise<DriverAvailabilityStatus[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('date', params.date);
  if (params.timeFrom?.trim()) searchParams.set('timeFrom', params.timeFrom.trim());
  const res = await apiFetch(
    `${API_URL}/admin/waybills/driver-availability/resolve?${searchParams}`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) await throwApiError(res, 'Не удалось проверить доступность водителей');
  return res.json();
}
