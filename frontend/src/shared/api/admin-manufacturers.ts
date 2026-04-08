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

export interface AdminManufacturer {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  country?: string | null;
  isActive: boolean;
  order: number;
  _count?: { products: number };
}

export interface AdminManufacturersListResponse {
  data: AdminManufacturer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchAdminManufacturersList(
  params?: {
    limit?: number;
    isActive?: boolean;
  },
  /** Дополнительные заголовки (например Authorization из AuthContext); перекрывают локальное хранилище. */
  headersOverride?: HeadersInit
): Promise<AdminManufacturer[]> {
  const search = new URLSearchParams();
  search.set('limit', String(params?.limit ?? 500));
  search.set('page', '1');
  if (params?.isActive !== undefined) {
    search.set('isActive', params.isActive ? 'true' : 'false');
  }
  const base = getAdminAuthHeaders() as Record<string, string>;
  const extra = headersOverride ? (headersOverride as Record<string, string>) : {};
  const res = await fetch(`${API_URL}/admin/catalog/manufacturers?${search}`, {
    headers: { ...base, ...extra },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить производителей');
  }
  const json = (await res.json()) as AdminManufacturersListResponse;
  return Array.isArray(json.data) ? json.data : [];
}

export async function createAdminManufacturer(body: {
  name: string;
  slug: string;
  country?: string;
  isActive?: boolean;
}): Promise<AdminManufacturer> {
  const res = await fetch(`${API_URL}/admin/catalog/manufacturers`, {
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

export async function updateAdminManufacturer(
  id: string,
  body: Partial<{ name: string; slug: string; country: string | null; isActive: boolean }>
): Promise<AdminManufacturer> {
  const res = await fetch(`${API_URL}/admin/catalog/manufacturers/${id}`, {
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

export async function deleteAdminManufacturer(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/catalog/manufacturers/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка удаления');
  }
}
