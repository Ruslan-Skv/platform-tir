import { apiFetch } from '@/shared/lib/api-fetch';
import type { SiteDisclaimerInfo } from '@/shared/lib/site-disclaimer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type { SiteDisclaimerInfo };

export async function getSiteDisclaimer(): Promise<SiteDisclaimerInfo | null> {
  const res = await apiFetch(`${API_URL}/site-disclaimer`);
  if (res.status === 404 || res.status === 204) return null;
  if (!res.ok) return null;
  const data = await res.json();
  if (!data) return null;
  return data;
}

export async function getAdminSiteDisclaimer(): Promise<SiteDisclaimerInfo> {
  const res = await apiFetch(`${API_URL}/admin/settings/site-disclaimer`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminSiteDisclaimer(
  data: Partial<SiteDisclaimerInfo>
): Promise<SiteDisclaimerInfo> {
  const res = await apiFetch(`${API_URL}/admin/settings/site-disclaimer`, {
    method: 'PATCH',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка сохранения');
  }
  return res.json();
}
