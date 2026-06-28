import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface NotifyChannelsSettings {
  notifyEmails: string[];
  notifyTelegramIds: string[];
  notifyMaxIds: string[];
  updatedAt: string | null;
}

export async function getAdminCallbackFormSettings(
  getAuthHeaders: () => Record<string, string>
): Promise<NotifyChannelsSettings> {
  const res = await apiFetch(`${API_URL}/admin/forms/callback-form-settings`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminCallbackFormSettings(
  data: {
    notifyEmails?: string[];
    notifyTelegramIds?: string[];
    notifyMaxIds?: string[];
  },
  getAuthHeaders: () => Record<string, string>
): Promise<NotifyChannelsSettings> {
  const res = await apiFetch(`${API_URL}/admin/forms/callback-form-settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Не удалось сохранить настройки');
  }
  return res.json();
}
