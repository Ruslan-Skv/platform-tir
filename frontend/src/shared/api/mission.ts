import { apiFetch } from '@/shared/lib/api-fetch';
import type { MissionPageInfo } from '@/shared/lib/mission';

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

export type { MissionPageInfo };

export async function getAdminMissionPage(): Promise<MissionPageInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/mission/page`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminMissionPage(
  data: Partial<MissionPageInfo>
): Promise<MissionPageInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/mission/page`, {
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
