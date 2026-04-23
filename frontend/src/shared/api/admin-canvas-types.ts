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

export interface AdminCanvasType {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  order: number;
  _count?: { products: number };
}

export interface AdminCanvasTypesListResponse {
  data: AdminCanvasType[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchAdminCanvasTypesList(
  params?: {
    limit?: number;
    isActive?: boolean;
  },
  headersOverride?: HeadersInit
): Promise<AdminCanvasType[]> {
  const search = new URLSearchParams();
  search.set('limit', String(params?.limit ?? 500));
  search.set('page', '1');
  if (params?.isActive !== undefined) {
    search.set('isActive', params.isActive ? 'true' : 'false');
  }
  const base = getAdminAuthHeaders() as Record<string, string>;
  const extra = headersOverride ? (headersOverride as Record<string, string>) : {};
  const res = await apiFetch(`${API_URL}/admin/catalog/canvas-types?${search}`, {
    headers: { ...base, ...extra },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить типы полотна');
  }
  const json = (await res.json()) as AdminCanvasTypesListResponse;
  return Array.isArray(json.data) ? json.data : [];
}

export async function createAdminCanvasType(body: {
  name: string;
  slug: string;
  isActive?: boolean;
}): Promise<AdminCanvasType> {
  const res = await apiFetch(`${API_URL}/admin/catalog/canvas-types`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка создания');
  }
  return res.json();
}

export async function updateAdminCanvasType(
  id: string,
  body: Partial<{ name: string; slug: string; isActive: boolean }>
): Promise<AdminCanvasType> {
  const res = await apiFetch(`${API_URL}/admin/catalog/canvas-types/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка сохранения');
  }
  return res.json();
}

export async function deleteAdminCanvasType(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/catalog/canvas-types/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка удаления');
  }
}
