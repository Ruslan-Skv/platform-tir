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
  isActive: boolean;
  sortOrder: number;
}

export async function getCrmDirections(): Promise<CrmDirection[]> {
  const res = await fetch(`${API_URL}/admin/crm-directions`, {
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
}

export async function getCrmUsers(): Promise<CrmUser[]> {
  const res = await fetch(`${API_URL}/admin/crm-directions/users/list`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список сотрудников');
  return res.json();
}

// --- Complex Objects (Комплексные объекты) ---
export interface ComplexObjectContract {
  id: string;
  contractNumber: string;
  status: string;
  totalAmount: string | number;
  direction: { id: string; name: string } | null;
}

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
  contracts: ComplexObjectContract[];
}

export async function getComplexObjects(): Promise<ComplexObject[]> {
  const res = await fetch(`${API_URL}/admin/complex-objects`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить комплексные объекты');
  return res.json();
}

export async function getComplexObject(id: string): Promise<ComplexObject> {
  const res = await fetch(`${API_URL}/admin/complex-objects/${id}`, {
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
  const res = await fetch(`${API_URL}/admin/complex-objects`, {
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
    name: string;
    customerName: string | null;
    customerPhones: string[];
    address: string | null;
    notes: string | null;
    officeId: string | null;
    managerId: string | null;
  }>
): Promise<ComplexObject> {
  const res = await fetch(`${API_URL}/admin/complex-objects/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось обновить комплексный объект');
  return res.json();
}

export async function deleteComplexObject(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/complex-objects/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить комплексный объект');
}

export async function getComplexObjectContracts(id: string): Promise<Contract[]> {
  const res = await fetch(`${API_URL}/admin/complex-objects/${id}/contracts`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить договоры объекта');
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
  const res = await fetch(`${API_URL}/admin/offices${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить офисы');
  return res.json();
}

export async function getOffice(id: string): Promise<Office> {
  const res = await fetch(`${API_URL}/admin/offices/${id}`, {
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
  const res = await fetch(`${API_URL}/admin/offices`, {
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
  const res = await fetch(`${API_URL}/admin/offices/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось обновить офис');
  return res.json();
}

export async function deleteOffice(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/offices/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить офис');
}

export async function createCrmDirection(data: {
  name: string;
  slug: string;
  isActive?: boolean;
  sortOrder?: number;
}): Promise<CrmDirection> {
  const res = await fetch(`${API_URL}/admin/crm-directions`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось создать направление');
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
  customerName: string;
  customerAddress: string | null;
  customerPhone: string;
  comments: string | null;
  status: string;
  customerId: string | null;
  manager?: { id: string; firstName: string | null; lastName: string | null };
  surveyor?: { id: string; firstName: string | null; lastName: string | null } | null;
  direction?: { id: string; name: string; slug: string } | null;
}

export async function getMeasurements(params?: {
  status?: string;
  managerId?: string;
  surveyorId?: string;
  directionId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: Measurement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.managerId) searchParams.set('managerId', params.managerId);
  if (params?.surveyorId) searchParams.set('surveyorId', params.surveyorId);
  if (params?.directionId) searchParams.set('directionId', params.directionId);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  searchParams.set('page', String(params?.page ?? 1));
  searchParams.set('limit', String(params?.limit ?? 20));

  const res = await fetch(`${API_URL}/admin/measurements?${searchParams}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить замеры');
  return res.json();
}

export async function getMeasurement(id: string): Promise<Measurement> {
  const res = await fetch(`${API_URL}/admin/measurements/${id}`, {
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
  customerName: string;
  customerAddress?: string;
  customerPhone: string;
  comments?: string;
  status?: string;
  customerId?: string;
}): Promise<Measurement> {
  const res = await fetch(`${API_URL}/admin/measurements`, {
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
  data: Partial<Parameters<typeof createMeasurement>[0]>
): Promise<Measurement> {
  const res = await fetch(`${API_URL}/admin/measurements/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось обновить замер');
  return res.json();
}

export async function deleteMeasurement(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/measurements/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить замер');
}

export interface MeasurementHistoryEntry {
  id: string;
  action: 'UPDATE' | 'ROLLBACK';
  changedAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string };
  changedFields: string[];
  snapshot: Record<string, unknown>;
}

export async function getMeasurementHistory(
  measurementId: string
): Promise<MeasurementHistoryEntry[]> {
  const res = await fetch(`${API_URL}/admin/measurements/${measurementId}/history`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}

export async function rollbackMeasurement(
  measurementId: string,
  historyId: string
): Promise<Measurement> {
  const res = await fetch(`${API_URL}/admin/measurements/${measurementId}/rollback/${historyId}`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось откатить изменения');
  }
  return res.json();
}

// --- Contracts ---
export interface Contract {
  id: string;
  contractNumber: string;
  contractDate: string;
  validityEnd?: string | null;
  contractDurationDays?: number | null;
  contractDurationType?: string | null;
  status: string;
  directionId: string | null;
  managerId: string | null;
  officeId: string | null;
  complexObjectId: string | null;
  customerName: string;
  customerAddress: string | null;
  customerPhone: string | null;
  discount: string | number;
  totalAmount: string | number;
  advanceAmount: string | number;
  installationDate: string | null;
  installationDurationDays?: number | null;
  deliveryDate: string | null;
  actWorkStartDate: string | null;
  actWorkEndDate: string | null;
  actWorkStartImages?: string[];
  actWorkEndImages?: string[];
  manager?: { id: string; firstName: string | null; lastName: string | null } | null;
  surveyor?: { id: string; firstName: string | null; lastName: string | null } | null;
  direction?: { id: string; name: string; slug: string } | null;
  office?: { id: string; name: string; address: string | null } | null;
  complexObject?: {
    id: string;
    name: string;
    customerName: string | null;
    address: string | null;
  } | null;
  advances?: Array<{ id: string; amount: string | number; paidAt: string }>;
  amendments?: ContractAmendment[];
  payments?: Array<{
    id: string;
    amount: string | number;
    paymentDate: string;
    paymentForm: string;
    paymentType: string;
  }>;
}

export async function getContracts(params?: {
  status?: string;
  managerId?: string;
  directionId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: Contract[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.managerId) searchParams.set('managerId', params.managerId);
  if (params?.directionId) searchParams.set('directionId', params.directionId);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  searchParams.set('page', String(params?.page ?? 1));
  searchParams.set('limit', String(params?.limit ?? 20));

  const res = await fetch(`${API_URL}/admin/contracts?${searchParams}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить договоры');
  return res.json();
}

export async function getContract(id: string): Promise<Contract> {
  const res = await fetch(`${API_URL}/admin/contracts/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить договор');
  return res.json();
}

export async function createContract(data: Record<string, unknown>): Promise<Contract> {
  const res = await fetch(`${API_URL}/admin/contracts`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось создать договор');
  }
  return res.json();
}

export async function updateContract(id: string, data: Record<string, unknown>): Promise<Contract> {
  const res = await fetch(`${API_URL}/admin/contracts/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Не удалось обновить договор');
  return res.json();
}

export async function deleteContract(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/contracts/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить договор');
}

export interface ContractHistoryEntry {
  id: string;
  action: 'UPDATE' | 'ROLLBACK';
  changedAt: string;
  changedBy: { id: string; firstName: string | null; lastName: string | null; email: string };
  changedFields: string[];
  snapshot: Record<string, unknown>;
}

export async function getContractHistory(contractId: string): Promise<ContractHistoryEntry[]> {
  const res = await fetch(`${API_URL}/admin/contracts/${contractId}/history`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю');
  return res.json();
}

export async function rollbackContract(contractId: string, historyId: string): Promise<Contract> {
  const res = await fetch(`${API_URL}/admin/contracts/${contractId}/rollback/${historyId}`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось откатить изменения');
  }
  return res.json();
}

// --- Contract Advances ---
export interface ContractAdvance {
  id: string;
  amount: string | number;
  paidAt: string;
  notes?: string | null;
}

export async function addContractAdvance(
  contractId: string,
  data: { amount: number; paidAt: string; notes?: string }
): Promise<ContractAdvance> {
  const res = await fetch(`${API_URL}/admin/contracts/${contractId}/advances`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось добавить аванс');
  }
  return res.json();
}

export async function uploadContractActImage(
  contractId: string,
  file: File,
  type: 'start' | 'end'
): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const headers = getAdminAuthHeaders() as Record<string, string>;
  delete headers['Content-Type'];
  const res = await fetch(
    `${API_URL}/admin/contracts/${contractId}/upload-act-image?type=${type}`,
    {
      method: 'POST',
      headers: { ...headers, Accept: 'application/json' },
      body: formData,
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить фото');
  }
  return res.json();
}

// --- Contract Amendments (доп. соглашения) ---
export interface ContractAmendment {
  id: string;
  contractId: string;
  number?: number | null;
  amount: string | number;
  discount?: string | number | null;
  date: string;
  durationAdditionDays?: number | null;
  durationAdditionType?: string | null;
  notes?: string | null;
}

export async function addContractAmendment(
  contractId: string,
  data: {
    amount: number;
    date: string;
    discount?: number;
    durationAdditionDays?: number;
    durationAdditionType?: string;
    notes?: string;
  }
): Promise<ContractAmendment> {
  const res = await fetch(`${API_URL}/admin/contracts/${contractId}/amendments`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(msg || 'Не удалось добавить доп. соглашение');
  }
  return res.json();
}

export async function updateContractAmendment(
  contractId: string,
  amendmentId: string,
  data: {
    amount?: number;
    date?: string;
    discount?: number;
    durationAdditionDays?: number | null;
    durationAdditionType?: string | null;
    notes?: string | null;
  }
): Promise<ContractAmendment> {
  const res = await fetch(`${API_URL}/admin/contracts/${contractId}/amendments/${amendmentId}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string | string[] };
    const msg = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(msg || 'Не удалось обновить доп. соглашение');
  }
  return res.json();
}

export async function removeContractAmendment(
  contractId: string,
  amendmentId: string
): Promise<void> {
  const res = await fetch(`${API_URL}/admin/contracts/${contractId}/amendments/${amendmentId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить доп. соглашение');
}

export async function removeContractAdvance(contractId: string, advanceId: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/contracts/${contractId}/advances/${advanceId}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить аванс');
}

// --- ContractPayments ---
export interface ContractPayment {
  id: string;
  contractId: string;
  paymentDate: string;
  amount: string | number;
  paymentForm: string;
  paymentType: string;
  managerId: string | null;
  notes?: string | null;
  contract?: {
    id: string;
    contractNumber: string;
    customerName: string;
    totalAmount?: string | number;
  };
  manager?: { id: string; firstName: string | null; lastName: string | null } | null;
  /** Сумма всех оплат по договору (для расчёта %) */
  contractTotalPaid?: number;
}

export async function getContractPayments(params?: {
  contractId?: string;
  managerId?: string;
  paymentForm?: string;
  paymentType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: ContractPayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const searchParams = new URLSearchParams();
  if (params?.contractId) searchParams.set('contractId', params.contractId);
  if (params?.managerId) searchParams.set('managerId', params.managerId);
  if (params?.paymentForm) searchParams.set('paymentForm', params.paymentForm);
  if (params?.paymentType) searchParams.set('paymentType', params.paymentType);
  if (params?.dateFrom) searchParams.set('dateFrom', params.dateFrom);
  if (params?.dateTo) searchParams.set('dateTo', params.dateTo);
  searchParams.set('page', String(params?.page ?? 1));
  searchParams.set('limit', String(params?.limit ?? 20));

  const res = await fetch(`${API_URL}/admin/contract-payments?${searchParams}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить оплаты');
  return res.json();
}

export async function createContractPayment(data: {
  contractId: string;
  paymentDate: string;
  amount: number;
  paymentForm: 'CASH' | 'TERMINAL' | 'QR' | 'INVOICE';
  paymentType: 'PREPAYMENT' | 'ADVANCE' | 'FINAL' | 'AMENDMENT';
  managerId?: string;
  notes?: string;
}): Promise<ContractPayment> {
  const res = await fetch(`${API_URL}/admin/contract-payments`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось создать оплату');
  }
  return res.json();
}

export async function deleteContractPayment(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/contract-payments/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить оплату');
}
