const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AdminSupportConversation {
  id: string;
  userId: string;
  status: string;
  updatedAt: string;
  user: { firstName: string | null; lastName: string | null; email: string };
  messages: { content: string; createdAt: string }[];
}

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('admin_token') || localStorage.getItem('user_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function getAdminSupportConversations(
  status?: string
): Promise<AdminSupportConversation[]> {
  const params = new URLSearchParams({ asSupport: 'true' });
  if (status) params.set('status', status);
  const res = await fetch(`${API_URL}/support/conversations?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить диалоги');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
