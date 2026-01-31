const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface AdminFormSubmission {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  preferredDate: string | null;
  preferredTime: string;
  productType: string | null;
  comment: string | null;
  createdAt: string;
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

export async function getAdminFormSubmissions(
  page = 1,
  limit = 20,
  type?: 'measurement' | 'callback'
): Promise<{
  data: AdminFormSubmission[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (type) params.set('type', type);
  const res = await fetch(`${API_URL}/admin/forms?${params}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить заявки');
  return res.json();
}
