import { apiFetch } from '@/shared/lib/api-fetch';
import {
  ensureFreshAccessToken,
  getApiBaseUrl,
  getAuthHeaders,
  getStoredAccessToken,
} from '@/shared/lib/auth-session';

export interface AdminOnlineUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  avatar: string | null;
}

export async function postAdminPresenceHeartbeat(): Promise<void> {
  await ensureFreshAccessToken();
  if (!getStoredAccessToken()) return;
  const res = await apiFetch(`${getApiBaseUrl()}/admin/presence/heartbeat`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error('presence heartbeat failed');
  }
}

export async function getAdminOnlineAdmins(): Promise<AdminOnlineUser[]> {
  await ensureFreshAccessToken();
  if (!getStoredAccessToken()) return [];
  const res = await apiFetch(`${getApiBaseUrl()}/admin/presence/online`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список онлайн');
  return res.json();
}
