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

// --- CrmDirections ---
export interface CrmDirection {
  id: string;
  name: string;
  slug: string;
  numberLetter?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export async function getCrmDirections(): Promise<CrmDirection[]> {
  const res = await apiFetch(`${API_URL}/admin/crm-directions`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить направления');
  return res.json();
}

export interface CrmUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  employeeCode?: string | null;
  officeId?: string | null;
}

export async function getCrmUsers(): Promise<CrmUser[]> {
  const res = await apiFetch(`${API_URL}/admin/crm-directions/users/list`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список сотрудников');
  return res.json();
}

export async function getMyCrmDirectionIds(): Promise<string[]> {
  const res = await apiFetch(`${API_URL}/admin/crm-directions/users/me/directions`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить ваши направления');
  const data = (await res.json()) as { directionIds?: string[] };
  return Array.isArray(data.directionIds) ? data.directionIds : [];
}

export async function getUserCrmDirectionIds(userId: string): Promise<string[]> {
  const res = await apiFetch(`${API_URL}/admin/crm-directions/users/${userId}/directions`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить направления пользователя');
  const data = (await res.json()) as { directionIds?: string[] };
  return Array.isArray(data.directionIds) ? data.directionIds : [];
}

export async function setUserCrmDirectionIds(
  userId: string,
  directionIds: string[]
): Promise<string[]> {
  const res = await apiFetch(`${API_URL}/admin/crm-directions/users/${userId}/directions`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ directionIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err?.message === 'string' ? err.message : 'Не удалось сохранить направления'
    );
  }
  const data = (await res.json()) as { directionIds?: string[] };
  return Array.isArray(data.directionIds) ? data.directionIds : [];
}

export type InstallerDirection =
  | 'REPAIR'
  | 'WINDOWS'
  | 'DOORS'
  | 'CEILINGS'
  | 'FURNITURE'
  | 'BLINDS';

export interface InstallerMaster {
  id: string;
  directions: InstallerDirection[];
  fullName: string;
  grade: string;
  phone: string | null;
  phones: string[];
  userId: string | null;
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export async function getInstallers(): Promise<InstallerMaster[]> {
  const res = await apiFetch(`${API_URL}/admin/installers`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список мастеров');
  return res.json();
}

export async function createInstaller(data: {
  directions: InstallerDirection[];
  fullName: string;
  grade: string;
  phone?: string | null;
  phones?: string[];
  userId?: string | null;
}): Promise<InstallerMaster> {
  const res = await apiFetch(`${API_URL}/admin/installers`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(msg || 'Не удалось создать мастера');
  }
  return res.json();
}

export async function updateInstaller(
  id: string,
  data: Partial<{
    directions: InstallerDirection[];
    fullName: string;
    grade: string;
    phone: string | null;
    phones: string[];
    userId: string | null;
  }>
): Promise<InstallerMaster> {
  const res = await apiFetch(`${API_URL}/admin/installers/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(msg || 'Не удалось обновить мастера');
  }
  return res.json();
}

export async function deleteInstaller(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/installers/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить мастера');
}

// --- Sales funnel (Воронка продаж) ---
export interface FunnelStageStat {
  stage: string;
  count: number;
  totalValue: number | string;
}

export async function getFunnelStats(managerId?: string): Promise<FunnelStageStat[]> {
  const url = new URL(`${API_URL}/admin/customers/funnel`);
  if (managerId) url.searchParams.set('managerId', managerId);
  const res = await apiFetch(String(url), { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить воронку продаж');
  return res.json();
}

// --- Complex Objects (Комплексные объекты) ---
export interface ComplexObject {
  id: string;
  name: string;
  customerName: string | null;
  customerPhones: string[];
  address: string | null;
  notes: string | null;
  hasElevator: boolean | null;
  floor: number | null;
  officeId: string | null;
  managerId: string | null;
  office?: { id: string; name: string; address: string | null } | null;
  manager?: { id: string; firstName: string | null; lastName: string | null } | null;
}

export async function getComplexObjects(): Promise<ComplexObject[]> {
  const res = await apiFetch(`${API_URL}/admin/complex-objects`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить комплексные объекты');
  return res.json();
}

export async function getComplexObject(id: string): Promise<ComplexObject> {
  const res = await apiFetch(`${API_URL}/admin/complex-objects/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить комплексный объект');
  return res.json();
}

export async function createComplexObject(data: {
  name: string;
  customerName?: string;
  customerPhones?: string[];
  address?: string;
  notes?: string;
  officeId?: string;
  managerId?: string;
}): Promise<ComplexObject> {
  const res = await apiFetch(`${API_URL}/admin/complex-objects`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось создать комплексный объект');
  }
  return res.json();
}

export async function updateComplexObject(
  id: string,
  data: Partial<{
    name: string | null;
    customerName: string | null;
    customerPhones: string[];
    address: string | null;
    notes: string | null;
    hasElevator: boolean | null;
    floor: number | null;
    officeId: string | null;
    managerId: string | null;
  }>
): Promise<ComplexObject> {
  const res = await apiFetch(`${API_URL}/admin/complex-objects/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось обновить комплексный объект');
  return res.json();
}

export async function deleteComplexObject(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/complex-objects/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить комплексный объект');
}

export interface ComplexObjectHistoryEntry {
  id: string;
  action: 'UPDATE' | 'ROLLBACK';
  changedAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string };
  changedFields: string[];
  snapshot: Record<string, unknown>;
}

export async function getComplexObjectHistory(
  complexObjectId: string
): Promise<ComplexObjectHistoryEntry[]> {
  const res = await apiFetch(`${API_URL}/admin/complex-objects/${complexObjectId}/history`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}

export async function rollbackComplexObject(
  complexObjectId: string,
  historyId: string
): Promise<ComplexObject> {
  const res = await apiFetch(
    `${API_URL}/admin/complex-objects/${complexObjectId}/rollback/${historyId}`,
    { method: 'POST', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось откатить изменения');
  }
  return res.json();
}

// --- Offices ---
export interface Office {
  id: string;
  name: string;
  prefix: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  sortOrder: number;
}

export async function getOffices(includeInactive = false): Promise<Office[]> {
  const params = includeInactive ? '?includeInactive=true' : '';
  const res = await apiFetch(`${API_URL}/admin/offices${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить офисы');
  return res.json();
}

export async function getOffice(id: string): Promise<Office> {
  const res = await apiFetch(`${API_URL}/admin/offices/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить офис');
  return res.json();
}

export async function createOffice(data: {
  name: string;
  prefix?: string;
  address?: string;
  phone?: string;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<Office> {
  const res = await apiFetch(`${API_URL}/admin/offices`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось создать офис');
  }
  return res.json();
}

export async function updateOffice(
  id: string,
  data: Partial<{
    name: string;
    prefix: string | null;
    address: string | null;
    phone: string | null;
    isActive: boolean;
    sortOrder: number;
  }>
): Promise<Office> {
  const res = await apiFetch(`${API_URL}/admin/offices/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось обновить офис');
  return res.json();
}

export async function deleteOffice(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/offices/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить офис');
}

export interface OfficeHistoryEntry {
  id: string;
  action: 'UPDATE' | 'ROLLBACK';
  changedAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string };
  changedFields: string[];
  snapshot: Record<string, unknown>;
}

export async function getOfficeHistory(officeId: string): Promise<OfficeHistoryEntry[]> {
  const res = await apiFetch(`${API_URL}/admin/offices/${officeId}/history`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}

export async function rollbackOffice(officeId: string, historyId: string): Promise<Office> {
  const res = await apiFetch(`${API_URL}/admin/offices/${officeId}/rollback/${historyId}`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось откатить изменения');
  }
  return res.json();
}

// --- Supplier Settlements (расчёты с поставщиками) ---
export interface SupplierSettlementRowApi {
  id: string;
  date: string;
  invoice: string;
  amount: number | null;
  payment: number | null;
  note: string;
  sortOrder: number;
}

export interface SupplierSettlementHistoryEntry {
  id: string;
  action: 'UPDATE' | 'ROLLBACK';
  changedAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string };
  changedFields: string[];
  snapshot: { rows: Array<Record<string, unknown>> };
}

export async function getSupplierSettlementTotals(): Promise<
  Record<string, { amountSum: number; paymentSum: number; total: number }>
> {
  const res = await apiFetch(`${API_URL}/admin/catalog/suppliers/settlement-totals`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить итоги расчётов');
  return res.json();
}

export async function getSupplierSettlements(
  supplierId: string
): Promise<SupplierSettlementRowApi[]> {
  const res = await apiFetch(`${API_URL}/admin/catalog/suppliers/${supplierId}/settlements`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить расчёты');
  return res.json();
}

export async function saveSupplierSettlements(
  supplierId: string,
  rows: Array<{
    id?: string;
    date?: string;
    invoice?: string;
    amount?: number | null;
    payment?: number | null;
    note?: string;
    sortOrder?: number;
  }>
): Promise<SupplierSettlementRowApi[]> {
  const res = await apiFetch(`${API_URL}/admin/catalog/suppliers/${supplierId}/settlements`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось сохранить расчёты');
  }
  return res.json();
}

export async function getSupplierSettlementHistory(
  supplierId: string
): Promise<SupplierSettlementHistoryEntry[]> {
  const res = await apiFetch(
    `${API_URL}/admin/catalog/suppliers/${supplierId}/settlements/history`,
    {
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}

export async function rollbackSupplierSettlement(
  supplierId: string,
  historyId: string
): Promise<SupplierSettlementRowApi[]> {
  const res = await apiFetch(
    `${API_URL}/admin/catalog/suppliers/${supplierId}/settlements/rollback/${historyId}`,
    { method: 'POST', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось откатить изменения');
  }
  return res.json();
}

// --- Tasks ---
export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  customerId: string | null;
  assigneeId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email?: string;
  } | null;
  assignee?: { id: string; firstName: string | null; lastName: string | null } | null;
  createdBy?: { id: string; firstName: string | null; lastName: string | null } | null;
}

export interface TasksListResponse {
  data: Task[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TaskStats {
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export interface TaskHistoryEntry {
  id: string;
  action: 'UPDATE' | 'ROLLBACK';
  changedAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string };
  changedFields: string[];
  snapshot: Record<string, unknown>;
}

export async function getTasks(params?: {
  status?: string;
  priority?: string;
  assigneeId?: string;
  customerId?: string;
  type?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}): Promise<TasksListResponse> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.priority) search.set('priority', params.priority);
  if (params?.assigneeId) search.set('assigneeId', params.assigneeId);
  if (params?.customerId) search.set('customerId', params.customerId);
  if (params?.type) search.set('type', params.type);
  if (params?.overdue) search.set('overdue', 'true');
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(params?.limit ?? 20));
  const res = await apiFetch(`${API_URL}/admin/tasks?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить задачи');
  return res.json();
}

export async function getTask(id: string): Promise<Task> {
  const res = await apiFetch(`${API_URL}/admin/tasks/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить задачу');
  return res.json();
}

export async function createTask(data: {
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  dueDate?: string;
  customerId?: string;
  assigneeId?: string;
}): Promise<Task> {
  const res = await apiFetch(`${API_URL}/admin/tasks`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось создать задачу');
  }
  return res.json();
}

export async function updateTask(
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    type: string;
    priority: string;
    status: string;
    dueDate: string | null;
    customerId: string | null;
    assigneeId: string | null;
  }>
): Promise<Task> {
  const res = await apiFetch(`${API_URL}/admin/tasks/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось обновить задачу');
  return res.json();
}

export async function completeTask(id: string): Promise<Task> {
  const res = await apiFetch(`${API_URL}/admin/tasks/${id}/complete`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось завершить задачу');
  return res.json();
}

export async function deleteTask(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/tasks/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить задачу');
}

export async function getTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
  const res = await apiFetch(`${API_URL}/admin/tasks/${taskId}/history`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}

export async function rollbackTask(taskId: string, historyId: string): Promise<Task> {
  const res = await apiFetch(`${API_URL}/admin/tasks/${taskId}/rollback/${historyId}`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось откатить изменения');
  }
  return res.json();
}

export async function getTaskStats(assigneeId?: string): Promise<TaskStats> {
  const url = assigneeId
    ? `${API_URL}/admin/tasks/stats?assigneeId=${encodeURIComponent(assigneeId)}`
    : `${API_URL}/admin/tasks/stats`;
  const res = await apiFetch(url, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить статистику');
  return res.json();
}

export async function createCrmDirection(data: {
  name: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
  numberLetter?: string | null;
}): Promise<CrmDirection> {
  const res = await apiFetch(`${API_URL}/admin/crm-directions`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось создать направление');
  return res.json();
}

export async function updateCrmDirection(
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    isActive: boolean;
    sortOrder: number;
    numberLetter: string | null;
  }>
): Promise<CrmDirection> {
  const res = await apiFetch(`${API_URL}/admin/crm-directions/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось обновить направление');
  }
  return res.json();
}

// --- Measurements ---
export interface Measurement {
  id: string;
  managerId: string;
  receptionDate: string;
  executionDate: string | null;
  surveyorId: string | null;
  directionId: string | null;
  additionalDirectionIds?: string[];
  additionalDirections?: { id: string; name: string; slug: string }[];
  customerName: string;
  customerAddress: string | null;
  customerPhone: string;
  comments: string | null;
  /** Желаемое время проведения замера (свободный текст). */
  preferredTime?: string | null;
  status: string;
  customerId: string | null;
  /** Фото с результатами замера (кнопка-скрепка на странице замера). */
  photoUrls?: string[];
  manager?: { id: string; firstName: string | null; lastName: string | null };
  surveyor?: { id: string; firstName: string | null; lastName: string | null } | null;
  direction?: { id: string; name: string; slug: string } | null;
  customer?: { id: string; firstName: string; lastName: string | null; email: string } | null;
}

export type MeasurementListSortBy = 'receptionDate' | 'executionDate' | 'status';

export type MeasurementsListScope = 'mine' | 'my_directions' | 'all';

export type MeasurementsListCounts = {
  scope: { mine: number; my_directions: number; all: number };
  status: Record<string, number>;
};

export async function getMeasurements(params?: {
  status?: string;
  managerId?: string;
  surveyorId?: string;
  directionId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  /** Замеры без привязанного договора (отчёт «замер без конверсии»). */
  withoutContract?: boolean;
  /** Только замеры с выбранной карточкой клиента (`customerId`). */
  hasCustomerId?: boolean;
  scope?: MeasurementsListScope;
  myDirectionIds?: string[];
  includeCounts?: boolean;
  countsMyDirectionIds?: string[];
  page?: number;
  limit?: number;
  sortBy?: MeasurementListSortBy;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  data: Measurement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts?: MeasurementsListCounts;
}> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.managerId) searchParams.set('managerId', params.managerId);
  if (params?.surveyorId) searchParams.set('surveyorId', params.surveyorId);
  if (params?.directionId) searchParams.set('directionId', params.directionId);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params?.withoutContract) searchParams.set('withoutContract', 'true');
  if (params?.hasCustomerId) searchParams.set('hasCustomerId', 'true');
  if (params?.scope && params.scope !== 'all') searchParams.set('scope', params.scope);
  if (params?.myDirectionIds && params.myDirectionIds.length > 0) {
    searchParams.set('myDirectionIds', [...new Set(params.myDirectionIds)].join(','));
  }
  if (params?.includeCounts) searchParams.set('includeCounts', 'true');
  if (params?.countsMyDirectionIds && params.countsMyDirectionIds.length > 0) {
    searchParams.set('countsMyDirectionIds', [...new Set(params.countsMyDirectionIds)].join(','));
  }
  searchParams.set('page', String(params?.page ?? 1));
  searchParams.set('limit', String(params?.limit ?? 20));
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const res = await apiFetch(`${API_URL}/admin/measurements?${searchParams}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить замеры');
  return res.json();
}

/** Замеры текущего пользователя как замерщика (`GET /admin/measurements/my`). */
export async function getMyMeasurements(params?: {
  status?: string;
  directionId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  includeCounts?: boolean;
  page?: number;
  limit?: number;
  sortBy?: MeasurementListSortBy;
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  data: Measurement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts?: MeasurementsListCounts;
}> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.directionId) searchParams.set('directionId', params.directionId);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  if (params?.includeCounts !== false) searchParams.set('includeCounts', 'true');
  searchParams.set('page', String(params?.page ?? 1));
  searchParams.set('limit', String(params?.limit ?? 20));
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const res = await apiFetch(`${API_URL}/admin/measurements/my?${searchParams}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить мои замеры');
  return res.json();
}

export async function getMeasurement(id: string): Promise<Measurement> {
  const res = await apiFetch(`${API_URL}/admin/measurements/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить замер');
  return res.json();
}

export async function createMeasurement(data: {
  managerId: string;
  receptionDate: string;
  executionDate?: string;
  surveyorId?: string;
  directionId?: string;
  additionalDirectionIds?: string[];
  customerName: string;
  customerAddress?: string;
  customerPhone: string;
  comments?: string;
  preferredTime?: string;
  status?: string;
  customerId?: string | null;
  photoUrls?: string[];
}): Promise<Measurement> {
  const res = await apiFetch(`${API_URL}/admin/measurements`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(err.message) ? err.message.join('. ') : err.message;
    throw new Error(msg || 'Не удалось создать замер');
  }
  return res.json();
}

export async function updateMeasurement(
  id: string,
  data: Partial<Parameters<typeof createMeasurement>[0]> & { customerId?: string | null },
  init?: Pick<RequestInit, 'signal'>
): Promise<Measurement> {
  const res = await apiFetch(`${API_URL}/admin/measurements/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
    signal: init?.signal,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') detail = body.message;
      else if (Array.isArray(body.message)) detail = body.message.join(', ');
    } catch {
      /* ignore */
    }
    throw new Error(detail ? `Не удалось обновить замер: ${detail}` : 'Не удалось обновить замер');
  }
  return res.json();
}

/** Загрузка фото с результатами замера; сервер сам дописывает URL в photoUrls замера. */
export async function uploadMeasurementPhoto(
  id: string,
  file: File
): Promise<{ imageUrl: string; photoUrls: string[] }> {
  const body = new FormData();
  body.append('file', file);
  const headers = { ...getAdminAuthHeaders() } as Record<string, string>;
  delete headers['Content-Type'];
  const res = await apiFetch(`${API_URL}/admin/measurements/${id}/upload-photo`, {
    method: 'POST',
    headers: { ...headers, Accept: 'application/json' },
    body,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(err.message) ? err.message.join('. ') : err.message;
    throw new Error(msg || 'Не удалось загрузить фото замера');
  }
  return res.json() as Promise<{ imageUrl: string; photoUrls: string[] }>;
}

export async function deleteMeasurement(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/measurements/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить замер');
}

export interface MeasurementHistoryEntry {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'ROLLBACK';
  changedAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string };
  changedFields: string[];
  snapshot: Record<string, unknown>;
}

export async function getMeasurementHistory(
  measurementId: string
): Promise<MeasurementHistoryEntry[]> {
  const res = await apiFetch(`${API_URL}/admin/measurements/${measurementId}/history`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}

export async function rollbackMeasurement(
  measurementId: string,
  historyId: string
): Promise<Measurement> {
  const res = await apiFetch(
    `${API_URL}/admin/measurements/${measurementId}/rollback/${historyId}`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось откатить изменения');
  }
  return res.json();
}

// --- Contracts ---
export interface CrmCustomerContractLink {
  id: string;
  contractNumber: string;
  contractDate: string | null;
  totalAmount: number;
  /** Сумма платежей (для договоров-пакетов); null, если неизвестна. */
  paidAmount?: number | null;
  /** Остаток к оплате (для договоров-пакетов); null, если стоимость неизвестна. */
  remainingAmount?: number | null;
  documentPackageId: string | null;
}

export interface CrmCustomerMeasurementLink {
  id: string;
  receptionDate: string;
  status: string;
  customerName: string;
}

/** Строка единого справочника GET /admin/customers/directory */
export interface ClientDirectoryRow {
  rowSource: 'customer' | 'contract_only';
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  entityType: string | null;
  status: string | null;
  stage: string | null;
  createdAt: string | null;
  manager: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  createdBy?: CrmCustomerAuditUser | null;
  contractCount: number | null;
  totalAmount: number | null;
  lastContractDate: string | null;
  lastContractNumber: string | null;
  lastMeasurementDate: string | null;
  measurementCount?: number | null;
  /** Доля заполнения карточки CRM (0–100), только для rowSource === 'customer'. */
  profileFillPercent?: number | null;
  /** Адрес объекта (при expandObjectAddresses — отдельная строка на каждый адрес). */
  objectAddress?: string | null;
  /** Уникальный ключ строки в выпадающем списке (id или id#obj:N). */
  directoryRowKey?: string;
}

export type CrmCustomerEntityType = 'PERSON' | 'COMPANY' | 'ENTREPRENEUR';

export interface CreateCrmCustomerPayload {
  /** Необязательно. */
  email?: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  /** Все номера по порядку; первый дублируется в `phone` на бэкенде */
  phones?: string[];
  company?: string;
  position?: string;
  entityType?: CrmCustomerEntityType;
  extendedProfile?: Record<string, unknown>;
  notes?: string;
}

export interface CrmCustomerAuditUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

/** Строка из списка GET /admin/customers (для поиска при замере и т.п.). */
export interface CrmCustomerListItem {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  phones: string[];
  company: string | null;
  entityType?: string | null;
  extendedProfile?: Record<string, unknown> | null;
  status?: string;
  stage?: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  manager?: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  createdBy?: CrmCustomerAuditUser | null;
  updatedBy?: CrmCustomerAuditUser | null;
}

/** Полная карточка GET /admin/customers/:id */
export type CrmCustomerDetail = CrmCustomerListItem & {
  tags?: string[];
  lastContactAt?: string | null;
  nextFollowUp?: string | null;
  dealValue?: unknown;
  isActive?: boolean;
  contracts?: CrmCustomerContractLink[];
  measurements?: CrmCustomerMeasurementLink[];
};

export async function getCrmCustomers(params?: {
  search?: string;
  page?: number;
  limit?: number;
  entityType?: CrmCustomerEntityType;
}): Promise<{
  data: CrmCustomerListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const search = new URLSearchParams();
  if (params?.search?.trim()) search.set('search', params.search.trim());
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(Math.min(params?.limit ?? 30, 100)));
  if (params?.entityType) search.set('entityType', params.entityType);
  const res = await apiFetch(`${API_URL}/admin/customers?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список клиентов');
  return res.json();
}

export type ClientDirectorySortBy =
  | 'displayName'
  | 'createdAt'
  | 'lastMeasurementDate'
  | 'lastContractDate';

/** `_none` — карточки без автора в БД */
export type ClientDirectoryCreatedByFilter = string;

export async function getClientDirectory(params?: {
  search?: string;
  page?: number;
  limit?: number;
  entityType?: CrmCustomerEntityType;
  createdById?: ClientDirectoryCreatedByFilter;
  sortBy?: ClientDirectorySortBy;
  sortOrder?: 'asc' | 'desc';
  /** По одной строке на каждый адрес объекта в карточке заказчика. */
  expandObjectAddresses?: boolean;
}): Promise<{
  data: ClientDirectoryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const search = new URLSearchParams();
  if (params?.search?.trim()) search.set('search', params.search.trim());
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(Math.min(params?.limit ?? 25, 100)));
  if (params?.entityType) search.set('entityType', params.entityType);
  if (params?.createdById) search.set('createdById', params.createdById);
  if (params?.sortBy) search.set('sortBy', params.sortBy);
  if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
  if (params?.expandObjectAddresses) search.set('expandObjectAddresses', 'true');
  const res = await apiFetch(`${API_URL}/admin/customers/directory?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить справочник клиентов');
  return res.json();
}

export async function getCrmCustomer(id: string): Promise<CrmCustomerDetail> {
  const res = await apiFetch(`${API_URL}/admin/customers/${encodeURIComponent(id)}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить карточку клиента');
  return res.json() as Promise<CrmCustomerDetail>;
}

export interface CrmCustomerHistoryEntry {
  id: string;
  action: 'CREATE' | 'UPDATE';
  changedAt: string;
  changedBy: CrmCustomerAuditUser;
  changedFields: string[];
  snapshot: Record<string, unknown>;
}

export async function getCrmCustomerHistory(
  customerId: string
): Promise<CrmCustomerHistoryEntry[]> {
  const res = await apiFetch(
    `${API_URL}/admin/customers/${encodeURIComponent(customerId)}/history`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error('Не удалось загрузить историю карточки клиента');
  return res.json();
}

export interface CrmCustomerTrashRow {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  entityType: string | null;
  deletedAt: string;
  deletedBy: CrmCustomerAuditUser | null;
}

export async function getCrmCustomerTrash(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: CrmCustomerTrashRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const search = new URLSearchParams();
  if (params?.search?.trim()) search.set('search', params.search.trim());
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(Math.min(params?.limit ?? 25, 100)));
  const res = await apiFetch(`${API_URL}/admin/customers/trash?${search}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить корзину клиентов');
  return res.json();
}

export async function trashCrmCustomer(customerId: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/customers/${encodeURIComponent(customerId)}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось переместить карточку в корзину');
  }
}

export async function restoreCrmCustomer(customerId: string): Promise<void> {
  const res = await apiFetch(
    `${API_URL}/admin/customers/${encodeURIComponent(customerId)}/restore`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось восстановить карточку');
  }
}

export interface CrmCustomerDuplicate {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  phones: string[];
  address: string;
  reasons: string[];
}

export async function checkCrmCustomerDuplicates(params: {
  phones?: string[];
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  patronymic?: string | null;
  excludeId?: string;
}): Promise<CrmCustomerDuplicate[]> {
  const search = new URLSearchParams();
  const phones = (params.phones ?? []).map((p) => p.trim()).filter(Boolean);
  if (phones.length > 0) search.set('phones', phones.join(','));
  if (params.email?.trim()) search.set('email', params.email.trim());
  if (params.firstName?.trim()) search.set('firstName', params.firstName.trim());
  if (params.lastName?.trim()) search.set('lastName', params.lastName.trim());
  if (params.patronymic?.trim()) search.set('patronymic', params.patronymic.trim());
  if (params.excludeId) search.set('excludeId', params.excludeId);
  const qs = search.toString();
  if (!qs) return [];
  const res = await apiFetch(`${API_URL}/admin/customers/duplicate-check?${qs}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { duplicates?: CrmCustomerDuplicate[] };
  return data.duplicates ?? [];
}

export interface CrmCustomerLinksCount {
  deals: number;
  measurements: number;
  contracts: number;
  documentPackages: number;
  interactions: number;
  tasks: number;
  total: number;
}

export async function getCrmCustomerLinksCount(
  customerId: string
): Promise<CrmCustomerLinksCount | null> {
  try {
    const res = await apiFetch(
      `${API_URL}/admin/customers/${encodeURIComponent(customerId)}/links-count`,
      { headers: getAdminAuthHeaders() }
    );
    if (!res.ok) return null;
    return (await res.json()) as CrmCustomerLinksCount;
  } catch {
    return null;
  }
}

export async function createCrmCustomer(
  payload: CreateCrmCustomerPayload & { allowDuplicate?: boolean }
): Promise<unknown> {
  const res = await apiFetch(`${API_URL}/admin/customers`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (res.status === 409) {
    const err = (await res.json().catch(() => ({}))) as {
      message?: string;
      duplicates?: CrmCustomerDuplicate[];
    };
    const error = new Error(err.message || 'Найден существующий клиент с совпадающими данными');
    (error as Error & { duplicates?: CrmCustomerDuplicate[] }).duplicates = err.duplicates ?? [];
    throw error;
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось создать заказчика');
  }
  return res.json();
}

export async function updateCrmCustomer(
  customerId: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const res = await apiFetch(`${API_URL}/admin/customers/${encodeURIComponent(customerId)}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось сохранить данные клиента');
  }
  return res.json();
}
