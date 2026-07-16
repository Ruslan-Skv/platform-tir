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

export type AdminAttributeType =
  | 'TEXT'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'SELECT'
  | 'MULTI_SELECT'
  | 'COLOR';

export interface AdminAttributeValue {
  id: string;
  value: string;
  colorHex?: string | null;
  order?: number;
}

export interface AdminAttributeCategoryLink {
  categoryId: string;
  category: { id: string; name: string };
}

export interface AdminAttribute {
  id: string;
  name: string;
  slug: string;
  type: AdminAttributeType;
  unit?: string | null;
  isFilterable: boolean;
  isRequired: boolean;
  order: number;
  values: AdminAttributeValue[];
  categories?: AdminAttributeCategoryLink[];
  _count?: { categories: number };
}

export interface AdminAttributesListResponse {
  data: AdminAttribute[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type AdminAttributeWriteBody = {
  name: string;
  slug: string;
  type?: AdminAttributeType;
  unit?: string | null;
  isFilterable?: boolean;
  isRequired?: boolean;
  order?: number;
  values?: { value: string; colorHex?: string; order?: number }[];
};

export async function fetchAdminAttributesList(
  params?: {
    search?: string;
    type?: AdminAttributeType;
    limit?: number;
    page?: number;
  },
  headersOverride?: HeadersInit
): Promise<AdminAttributesListResponse> {
  const search = new URLSearchParams();
  search.set('limit', String(params?.limit ?? 200));
  search.set('page', String(params?.page ?? 1));
  if (params?.search?.trim()) search.set('search', params.search.trim());
  if (params?.type) search.set('type', params.type);

  const base = getAdminAuthHeaders() as Record<string, string>;
  const extra = headersOverride ? (headersOverride as Record<string, string>) : {};
  const res = await apiFetch(`${API_URL}/admin/catalog/attributes?${search}`, {
    headers: { ...base, ...extra },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить характеристики');
  }
  const json = (await res.json()) as AdminAttributesListResponse;
  return {
    data: Array.isArray(json.data) ? json.data : [],
    total: json.total ?? 0,
    page: json.page ?? 1,
    limit: json.limit ?? 200,
    totalPages: json.totalPages ?? 1,
  };
}

export async function createAdminAttribute(body: AdminAttributeWriteBody): Promise<AdminAttribute> {
  const res = await apiFetch(`${API_URL}/admin/catalog/attributes`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка создания характеристики');
  }
  return res.json();
}

export async function updateAdminAttribute(
  id: string,
  body: Partial<AdminAttributeWriteBody>
): Promise<AdminAttribute> {
  const res = await apiFetch(`${API_URL}/admin/catalog/attributes/${id}`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка сохранения характеристики');
  }
  return res.json();
}

export async function deleteAdminAttribute(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/catalog/attributes/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка удаления характеристики');
  }
}
