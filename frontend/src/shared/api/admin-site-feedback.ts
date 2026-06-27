import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export type SitePlatformFeedbackType = 'SUGGESTION' | 'BUG';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type SitePlatformFeedback = {
  id: string;
  type: SitePlatformFeedbackType;
  text: string;
  pageUrl: string | null;
  senderName: string | null;
  senderEmail: string | null;
  senderPhone: string | null;
  createdAt: string;
  readAt: string | null;
  author: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
};

export async function getSitePlatformFeedback(options?: {
  type?: SitePlatformFeedbackType;
  unreadOnly?: boolean;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.unreadOnly) params.set('unreadOnly', 'true');
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  const res = await apiFetch(`${API_URL}/admin/site-feedback${query ? `?${query}` : ''}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить обратную связь');
  return res.json() as Promise<{ items: SitePlatformFeedback[] }>;
}

const FEEDBACK_UNREAD_COUNT_CACHE_TTL_MS = 30_000;
let feedbackUnreadCountCache: { count: number; at: number } | null = null;
let feedbackUnreadCountInFlight: Promise<number> | null = null;

export function invalidateSitePlatformFeedbackUnreadCountCache(): void {
  feedbackUnreadCountCache = null;
}

export async function getSitePlatformFeedbackUnreadCount(): Promise<number> {
  const now = Date.now();
  if (
    feedbackUnreadCountCache &&
    now - feedbackUnreadCountCache.at < FEEDBACK_UNREAD_COUNT_CACHE_TTL_MS
  ) {
    return feedbackUnreadCountCache.count;
  }
  if (feedbackUnreadCountInFlight) {
    return feedbackUnreadCountInFlight;
  }

  feedbackUnreadCountInFlight = getSitePlatformFeedback({ unreadOnly: true, limit: 100 })
    .then((data) => {
      const count = data.items?.length ?? 0;
      feedbackUnreadCountCache = { count, at: Date.now() };
      return count;
    })
    .finally(() => {
      feedbackUnreadCountInFlight = null;
    });

  return feedbackUnreadCountInFlight;
}

export async function markSitePlatformFeedbackRead() {
  const res = await apiFetch(`${API_URL}/admin/site-feedback/mark-read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось отметить сообщения прочитанными');
  invalidateSitePlatformFeedbackUnreadCountCache();
  return res.json();
}
