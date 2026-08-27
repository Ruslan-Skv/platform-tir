import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function parseJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.message === 'string'
        ? err.message
        : Array.isArray(err.message)
          ? err.message.join(', ')
          : fallbackMessage
    );
  }
  return res.json() as Promise<T>;
}

export type MessengerConversationType = 'DIRECT' | 'CHANNEL' | 'KANBAN_CARD';

export interface MessengerUserRef {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar?: string | null;
  role?: string;
}

export interface MessengerMember {
  id: string;
  userId: string;
  joinedAt: string;
  lastReadAt?: string | null;
  user: MessengerUserRef;
}

export interface MessengerMessage {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  author: MessengerUserRef;
}

export interface MessengerConversationSummary {
  id: string;
  type: MessengerConversationType;
  title: string;
  isGeneral: boolean;
  kanbanCardId: string | null;
  createdAt: string;
  updatedAt: string;
  lastReadAt: string | null;
  unreadCount: number;
  lastMessage: {
    id: string;
    body: string;
    createdAt: string;
    authorId: string;
    author: MessengerUserRef;
  } | null;
  members: MessengerMember[];
}

export interface MessengerConversationDetail {
  id: string;
  type: MessengerConversationType;
  title: string;
  isGeneral: boolean;
  kanbanCardId: string | null;
  kanbanCard?: { id: string; title: string } | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lastReadAt: string | null;
  members: MessengerMember[];
}

export async function listMessengerUsers(): Promise<MessengerUserRef[]> {
  const res = await apiFetch(`${API_URL}/admin/messenger/users`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return parseJson(res, 'Не удалось загрузить пользователей');
}

export async function listMessengerConversations(): Promise<MessengerConversationSummary[]> {
  const res = await apiFetch(`${API_URL}/admin/messenger/conversations`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return parseJson(res, 'Не удалось загрузить чаты');
}

export async function getMessengerConversation(id: string): Promise<MessengerConversationDetail> {
  const res = await apiFetch(`${API_URL}/admin/messenger/conversations/${id}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return parseJson(res, 'Не удалось загрузить чат');
}

export async function createMessengerDirect(userId: string): Promise<MessengerConversationDetail> {
  const res = await apiFetch(`${API_URL}/admin/messenger/conversations/direct`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });
  return parseJson(res, 'Не удалось создать личный чат');
}

export async function createMessengerChannel(payload: {
  title: string;
  memberIds?: string[];
}): Promise<MessengerConversationDetail> {
  const res = await apiFetch(`${API_URL}/admin/messenger/conversations/channels`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return parseJson(res, 'Не удалось создать канал');
}

export async function listMessengerMessages(
  conversationId: string,
  opts?: { cursor?: string; limit?: number }
): Promise<{ items: MessengerMessage[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.limit) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const res = await apiFetch(
    `${API_URL}/admin/messenger/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`,
    {
      headers: getAuthHeaders(),
      cache: 'no-store',
    }
  );
  return parseJson(res, 'Не удалось загрузить сообщения');
}

export async function sendMessengerMessage(
  conversationId: string,
  body: string
): Promise<MessengerMessage> {
  const res = await apiFetch(
    `${API_URL}/admin/messenger/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ body }),
    }
  );
  return parseJson(res, 'Не удалось отправить сообщение');
}

export async function markMessengerRead(conversationId: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`${API_URL}/admin/messenger/conversations/${conversationId}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseJson(res, 'Не удалось отметить прочитанным');
}

export async function addMessengerMembers(
  conversationId: string,
  memberIds: string[]
): Promise<MessengerConversationDetail> {
  const res = await apiFetch(`${API_URL}/admin/messenger/conversations/${conversationId}/members`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ memberIds }),
  });
  return parseJson(res, 'Не удалось добавить участников');
}

export async function getKanbanCardThread(cardId: string): Promise<MessengerConversationDetail> {
  const res = await apiFetch(`${API_URL}/admin/messenger/kanban-cards/${cardId}/thread`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });
  return parseJson(res, 'Не удалось открыть чат задачи');
}
