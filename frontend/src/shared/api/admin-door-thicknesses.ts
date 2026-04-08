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

export interface AdminDoorThickness {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  order: number;
  _count?: { products: number };
}

export interface AdminDoorThicknessesListResponse {
  data: AdminDoorThickness[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchAdminDoorThicknessesList(
  params?: {
    limit?: number;
    isActive?: boolean;
  },
  headersOverride?: HeadersInit
): Promise<AdminDoorThickness[]> {
  const search = new URLSearchParams();
  search.set('limit', String(params?.limit ?? 500));
  search.set('page', '1');
  if (params?.isActive !== undefined) {
    search.set('isActive', params.isActive ? 'true' : 'false');
  }
  const base = getAdminAuthHeaders() as Record<string, string>;
  const extra = headersOverride ? (headersOverride as Record<string, string>) : {};
  const res = await fetch(`${API_URL}/admin/catalog/door-thicknesses?${search}`, {
    headers: { ...base, ...extra },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить толщины двери');
  }
  const json = (await res.json()) as AdminDoorThicknessesListResponse;
  return Array.isArray(json.data) ? json.data : [];
}

export async function createAdminDoorThickness(body: {
  name: string;
  slug: string;
  isActive?: boolean;
}): Promise<AdminDoorThickness> {
  const res = await fetch(`${API_URL}/admin/catalog/door-thicknesses`, {
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

export async function updateAdminDoorThickness(
  id: string,
  body: Partial<{ name: string; slug: string; isActive: boolean }>
): Promise<AdminDoorThickness> {
  const res = await fetch(`${API_URL}/admin/catalog/door-thicknesses/${id}`, {
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

export async function deleteAdminDoorThickness(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/catalog/door-thicknesses/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка удаления');
  }
}
