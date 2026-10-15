import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AuthSettings {
  sberAuthEnabled: boolean;
}

/** Публичные настройки авторизации (для страницы входа). */
export async function getAuthSettings(): Promise<AuthSettings> {
  const res = await apiFetch(`${API_URL}/auth/settings`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки авторизации');
  return res.json();
}
