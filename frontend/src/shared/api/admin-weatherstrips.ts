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

export interface AdminWeatherstrip {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  order: number;
  _count?: { products: number };
}

export interface AdminWeatherstripsListResponse {
  data: AdminWeatherstrip[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function fetchAdminWeatherstripsList(
  params?: {
    limit?: number;
    isActive?: boolean;
  },
  headersOverride?: HeadersInit
): Promise<AdminWeatherstrip[]> {
  const search = new URLSearchParams();
  search.set('limit', String(params?.limit ?? 500));
  search.set('page', '1');
  if (params?.isActive !== undefined) {
    search.set('isActive', params.isActive ? 'true' : 'false');
  }
  const base = getAdminAuthHeaders() as Record<string, string>;
  const extra = headersOverride ? (headersOverride as Record<string, string>) : {};
  const res = await fetch(`${API_URL}/admin/catalog/weatherstrips?${search}`, {
    headers: { ...base, ...extra },
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Не удалось загрузить уплотнители');
  }
  const json = (await res.json()) as AdminWeatherstripsListResponse;
  return Array.isArray(json.data) ? json.data : [];
}

export async function createAdminWeatherstrip(body: {
  name: string;
  slug: string;
  isActive?: boolean;
}): Promise<AdminWeatherstrip> {
  const res = await fetch(`${API_URL}/admin/catalog/weatherstrips`, {
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

export async function updateAdminWeatherstrip(
  id: string,
  body: Partial<{ name: string; slug: string; isActive: boolean }>
): Promise<AdminWeatherstrip> {
  const res = await fetch(`${API_URL}/admin/catalog/weatherstrips/${id}`, {
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

export async function deleteAdminWeatherstrip(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/admin/catalog/weatherstrips/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Ошибка удаления');
  }
}
