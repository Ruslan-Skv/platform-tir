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

export async function createSitePlatformFeedback(data: {
  type: SitePlatformFeedbackType;
  text: string;
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  pageUrl?: string;
  consentAccepted: boolean;
}) {
  const res = await apiFetch(`${API_URL}/site-feedback`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось отправить сообщение');
  }
  return res.json();
}
