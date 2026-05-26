import { apiFetch } from '@/shared/lib/api-fetch';

import type { ContractDocumentPackageUserRef } from './admin-contract-document-packages';

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

async function readAdminContractPackagesError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(j.message)) return j.message.join('; ');
    if (typeof j.message === 'string') return j.message;
  } catch {
    /* ignore */
  }
  return `Запрос не выполнен (HTTP ${res.status})`;
}

export interface ContractTemplatePresetTrashRow {
  id: string;
  title: string;
  tabId: string;
  tabLabel: string;
  deletedAt: string;
  permanentDeleteAt: string | null;
  deletedBy: ContractDocumentPackageUserRef | null;
}

export async function getContractDocumentTemplatePresetsTrash(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: ContractTemplatePresetTrashRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  trashRetentionDays?: number;
}> {
  const search = new URLSearchParams({ kind: 'REPAIR' });
  if (params?.search?.trim()) search.set('search', params.search.trim());
  search.set('page', String(params?.page ?? 1));
  search.set('limit', String(Math.min(params?.limit ?? 25, 100)));
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/contract-templates/trash?${search}`,
    { headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
  return res.json();
}

export async function trashContractTemplatePreset(presetId: string): Promise<void> {
  const qs = new URLSearchParams({ kind: 'REPAIR' });
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/contract-templates/${encodeURIComponent(presetId)}?${qs}`,
    { method: 'DELETE', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
}

export async function restoreContractTemplatePreset(presetId: string): Promise<void> {
  const qs = new URLSearchParams({ kind: 'REPAIR' });
  const res = await apiFetch(
    `${getApiBaseUrl()}/admin/contract-document-packages/contract-templates/${encodeURIComponent(presetId)}/restore?${qs}`,
    { method: 'POST', headers: getAdminAuthHeaders() }
  );
  if (!res.ok) throw new Error(await readAdminContractPackagesError(res));
}
