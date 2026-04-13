const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface AdminSitePublicSettings {
  id: string;
  /** Массив или объект { desktop?, mobile? } — см. parseRolesShowAdminLinkFromApi */
  rolesShowAdminLink: unknown;
  updatedAt: string;
}

export interface RolesShowAdminLinkByDevicePayload {
  desktop: string[] | null;
  mobile: string[] | null;
}

export async function getAdminSitePublicSettings(): Promise<AdminSitePublicSettings> {
  const res = await fetch(`${API_URL}/admin/site-public/settings`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminSitePublicSettings(data: {
  rolesShowAdminLink?: string[] | null;
  rolesShowAdminLinkByDevice?: RolesShowAdminLinkByDevicePayload | null;
}): Promise<AdminSitePublicSettings> {
  const res = await fetch(`${API_URL}/admin/site-public/settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка сохранения');
  }
  return res.json();
}
