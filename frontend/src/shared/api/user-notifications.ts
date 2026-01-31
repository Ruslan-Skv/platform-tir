const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface UserNotificationSettings {
  id: string | null;
  userId: string;
  notifyOnSupportChatReply: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

function getUserAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getUserNotificationSettings(): Promise<UserNotificationSettings> {
  const res = await fetch(`${API_URL}/users/me/notification-settings`, {
    headers: getUserAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateUserNotificationSettings(
  data: Partial<Pick<UserNotificationSettings, 'notifyOnSupportChatReply'>>
): Promise<UserNotificationSettings> {
  const res = await fetch(`${API_URL}/users/me/notification-settings`, {
    method: 'PATCH',
    headers: getUserAuthHeaders(),
    body: JSON.stringify(data),
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

export async function checkNewSupportReplies(
  since: string
): Promise<{ conversationIds: string[] }> {
  const params = new URLSearchParams({ since });
  const res = await fetch(`${API_URL}/support/conversations/check-new-replies?${params}`, {
    headers: getUserAuthHeaders(),
  });
  if (!res.ok) return { conversationIds: [] };
  return res.json();
}
