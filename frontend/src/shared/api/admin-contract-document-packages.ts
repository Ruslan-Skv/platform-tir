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

export type ContractDocumentPackageKind =
  | 'REPAIR'
  | 'WINDOWS'
  | 'DOORS'
  | 'CEILINGS'
  | 'BLINDS'
  | 'FURNITURE';

export interface ContractDocumentPackageUserRef {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

/** Краткие поля связанного договора CRM (для списка и подписей). */
export interface ContractDocumentPackageCrmContract {
  id: string;
  contractNumber: string;
  contractDate: string;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  totalAmount: string | number;
}

export interface ContractDocumentPackage {
  id: string;
  kind: ContractDocumentPackageKind;
  title: string | null;
  formData: Record<string, unknown>;
  crmContractId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: ContractDocumentPackageUserRef | null;
  crmContract?: ContractDocumentPackageCrmContract | null;
}

export async function getContractDocumentPackages(
  kind?: ContractDocumentPackageKind
): Promise<ContractDocumentPackage[]> {
  const url = new URL(`${API_URL}/admin/contract-document-packages`);
  if (kind) url.searchParams.set('kind', kind);
  const res = await apiFetch(String(url), { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить список пакетов документов');
  return res.json();
}

export async function getContractDocumentPackage(id: string): Promise<ContractDocumentPackage> {
  const res = await apiFetch(`${API_URL}/admin/contract-document-packages/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить пакет документов');
  return res.json();
}

export async function createContractDocumentPackage(body: {
  kind: ContractDocumentPackageKind;
  title?: string;
  formData?: Record<string, unknown>;
  crmContractId?: string;
}): Promise<ContractDocumentPackage> {
  const res = await apiFetch(`${API_URL}/admin/contract-document-packages`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Не удалось создать пакет документов');
  return res.json();
}

export async function updateContractDocumentPackage(
  id: string,
  body: {
    title?: string | null;
    formData?: Record<string, unknown>;
    crmContractId?: string | null;
  }
): Promise<ContractDocumentPackage> {
  const res = await apiFetch(`${API_URL}/admin/contract-document-packages/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Не удалось сохранить пакет документов');
  return res.json();
}

export async function deleteContractDocumentPackage(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/contract-document-packages/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось удалить пакет документов');
}

/** Общий шаблон договора для направления (подставляется, если у пакета нет своего HTML). */
export async function getContractDocumentGlobalTemplate(
  kind: ContractDocumentPackageKind,
  tab: string
): Promise<{ html: string | null; updatedAt: string | null }> {
  const url = new URL(`${API_URL}/admin/contract-document-packages/global-templates`);
  url.searchParams.set('kind', kind);
  url.searchParams.set('tab', tab);
  const res = await apiFetch(String(url), { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error('Не удалось загрузить общий шаблон');
  return res.json();
}

export async function putContractDocumentGlobalTemplate(body: {
  kind: ContractDocumentPackageKind;
  tab: string;
  html: string;
}): Promise<{ id: string; kind: string; tab: string; updatedAt: string }> {
  const res = await apiFetch(`${API_URL}/admin/contract-document-packages/global-templates`, {
    method: 'PUT',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message || 'Не удалось сохранить общий шаблон');
  }
  return res.json();
}
