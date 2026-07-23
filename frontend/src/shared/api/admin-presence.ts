import { apiFetch } from '@/shared/lib/api-fetch';
import {
  ensureFreshAccessToken,
  getApiBaseUrl,
  getStoredAccessToken,
} from '@/shared/lib/auth-session';

export interface AdminOnlineUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  jobTitle?: string | null;
  avatar: string | null;
}

export async function postAdminPresenceHeartbeat(): Promise<void> {
  await ensureFreshAccessToken(0);
  const token = getStoredAccessToken();
  if (!token) return;
  const res = await apiFetch(`${getApiBaseUrl()}/admin/presence/heartbeat`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error('presence heartbeat failed');
  }
}

export async function getAdminOnlineAdmins(): Promise<AdminOnlineUser[]> {
  await ensureFreshAccessToken(0);
  const token = getStoredAccessToken();
  if (!token) return [];
  const res = await apiFetch(`${getApiBaseUrl()}/admin/presence/online`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Не удалось загрузить список онлайн');
  return res.json();
}
