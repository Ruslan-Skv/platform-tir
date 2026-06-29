import { apiFetch } from '@/shared/lib/api-fetch';
import type { SellerLegalInfo } from '@/shared/lib/legal/seller-legal';

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

export async function getSellerLegal(): Promise<SellerLegalInfo | null> {
  const res = await apiFetch(`${API_URL}/seller-legal`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Не удалось загрузить информацию о продавце');
  return res.json();
}

export async function getAdminSellerLegal(): Promise<SellerLegalInfo> {
  const res = await apiFetch(`${API_URL}/admin/settings/seller-legal`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить информацию о продавце');
  return res.json();
}

export async function updateAdminSellerLegal(
  data: Partial<SellerLegalInfo>
): Promise<SellerLegalInfo> {
  const res = await apiFetch(`${API_URL}/admin/settings/seller-legal`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка сохранения');
  }
  return res.json();
}
