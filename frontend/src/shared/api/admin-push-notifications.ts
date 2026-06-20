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

export interface AdminPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function getAdminPushVapidPublicKey(): Promise<string | null> {
  const res = await apiFetch(`${API_URL}/admin/notifications/push/vapid-public-key`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { publicKey?: string | null };
  return data.publicKey ?? null;
}

export async function subscribeAdminPush(subscription: AdminPushSubscriptionPayload) {
  const res = await apiFetch(`${API_URL}/admin/notifications/push/subscribe`, {
    method: 'POST',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(subscription),
  });
  if (!res.ok) throw new Error('Не удалось подписаться на push-уведомления');
  return res.json();
}

export async function unsubscribeAdminPush(subscription: AdminPushSubscriptionPayload) {
  const res = await apiFetch(`${API_URL}/admin/notifications/push/subscribe`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(subscription),
  });
  if (!res.ok) throw new Error('Не удалось отписаться от push-уведомлений');
  return res.json();
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function serializePushSubscription(
  subscription: PushSubscription
): AdminPushSubscriptionPayload {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('Некорректная push-подписка');
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth },
  };
}
