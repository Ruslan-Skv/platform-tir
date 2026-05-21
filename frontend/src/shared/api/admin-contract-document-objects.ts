import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { apiFetch } from '@/shared/lib/api-fetch';

const API_FALLBACK = 'http://localhost:3001/api/v1';

function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
  if (!raw) return API_FALLBACK;
  if (raw.startsWith('/')) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${raw.replace(/\/$/, '')}`;
    }
    return API_FALLBACK;
  }
  if (!/^https?:\/\//i.test(raw)) {
    return `https://${raw.replace(/\/$/, '')}`;
  }
  return raw.replace(/\/$/, '');
}

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(j.message)) return j.message.join('; ');
    if (typeof j.message === 'string') return j.message;
  } catch {
    /* ignore */
  }
  return `Запрос не выполнен (HTTP ${res.status})`;
}

export interface ContractDocumentObjectPackageSummary {
  id: string;
  kind: ContractDocumentPackageKind;
  kindLabel: string;
  contractNumber: string;
  customerName: string;
  objectAddress: string;
  normalizedAddress: string;
  documentObjectId: string | null;
}

export interface ContractDocumentObject {
  id: string;
  name: string;
  customerName: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  packageCount: number;
  packages: ContractDocumentObjectPackageSummary[];
}

export interface ContractDocumentObjectSuggestMerge {
  normalizedAddress: string;
  matchingPackages: ContractDocumentObjectPackageSummary[];
  existingObjects: Array<{
    id: string;
    name: string;
    customerName: string | null;
    address: string | null;
    packageCount: number;
    packages: ContractDocumentObjectPackageSummary[];
  }>;
}

export async function getContractDocumentObjects(): Promise<ContractDocumentObject[]> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-objects`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function getContractDocumentObject(id: string): Promise<ContractDocumentObject> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-objects/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function createContractDocumentObject(data: {
  name: string;
  customerName?: string;
  address?: string;
  notes?: string;
  packageIds?: string[];
}): Promise<ContractDocumentObject> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-objects`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function updateContractDocumentObject(
  id: string,
  data: Partial<{ name: string; customerName: string; address: string; notes: string }>
): Promise<ContractDocumentObject> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-objects/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function deleteContractDocumentObject(id: string): Promise<void> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-objects/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res));
}

export async function attachContractDocumentObjectMembers(
  objectId: string,
  packageIds: string[]
): Promise<ContractDocumentObject> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-objects/${objectId}/members`,
    {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      body: JSON.stringify({ packageIds }),
    }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function detachContractDocumentObjectMember(
  objectId: string,
  packageId: string
): Promise<ContractDocumentObject> {
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-objects/${objectId}/members/${packageId}`,
    {
      method: 'DELETE',
      headers: getAdminAuthHeaders(),
    }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export interface ContractDocumentObjectAutoSyncResult {
  createdObjects: number;
  mergedObjects: number;
  attachedPackages: number;
}

export async function autoSyncContractDocumentObjects(): Promise<ContractDocumentObjectAutoSyncResult> {
  const res = await apiFetch(`${getApiBaseUrl()}/admin/contract-document-objects/auto-sync`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function suggestContractDocumentObjectMerge(
  address: string,
  excludeObjectId?: string
): Promise<ContractDocumentObjectSuggestMerge> {
  const qs = new URLSearchParams();
  qs.set('address', address);
  if (excludeObjectId) qs.set('excludeObjectId', excludeObjectId);
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-objects/suggest-merge?${qs}`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
