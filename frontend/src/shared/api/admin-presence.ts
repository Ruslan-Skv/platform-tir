import { apiFetch } from '@/shared/lib/api-fetch';

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

export interface AdminOnlineUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  avatar: string | null;
}

export async function postAdminPresenceHeartbeat(): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/presence/heartbeat`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error('presence heartbeat failed');
  }
}

export async function getAdminOnlineAdmins(): Promise<AdminOnlineUser[]> {
  const res = await apiFetch(`${API_URL}/admin/presence/online`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить список онлайн');
  return res.json();
}
