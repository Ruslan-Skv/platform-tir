import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AdminAuthSettings {
  id: string;
  sberAuthEnabled: boolean;
  updatedAt?: string | null;
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

export async function getAdminAuthSettings(): Promise<AdminAuthSettings> {
  const res = await apiFetch(`${API_URL}/admin/auth-settings`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки авторизации');
  return res.json();
}

export async function updateAdminAuthSettings(
  data: Partial<Pick<AdminAuthSettings, 'sberAuthEnabled'>>
): Promise<AdminAuthSettings> {
  const res = await apiFetch(`${API_URL}/admin/auth-settings`, {
    method: 'PATCH',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ sberAuthEnabled: data.sberAuthEnabled }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.message ||
      (Array.isArray(err?.message) ? err.message.join(', ') : null) ||
      'Не удалось сохранить настройки';
    throw new Error(message);
  }
  return res.json();
}
