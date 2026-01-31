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

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface UserNotificationHistoryResponse {
  data: UserNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getUserNotificationHistory(params?: {
  page?: number;
  limit?: number;
}): Promise<UserNotificationHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params?.page != null) searchParams.set('page', String(params.page));
  if (params?.limit != null) searchParams.set('limit', String(params.limit));
  const query = searchParams.toString();
  const url = `${API_URL}/users/me/notifications${query ? `?${query}` : ''}`;
  const res = await fetch(url, {
    headers: getUserAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить историю уведомлений');
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
