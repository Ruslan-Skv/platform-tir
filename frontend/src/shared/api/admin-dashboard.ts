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

export interface CatalogActivityRow {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  countInPeriod: number;
  totalCreated: number;
}

export interface CatalogActivityResponse {
  from: string;
  to: string;
  products: CatalogActivityRow[];
  categories: CatalogActivityRow[];
}

export async function getCatalogActivity(from: Date, to: Date): Promise<CatalogActivityResponse> {
  const params = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  });
  const res = await apiFetch(`${API_URL}/admin/dashboard/catalog-activity?${params}`, {
    headers: getAdminAuthHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Не удалось загрузить статистику');
  }
  return res.json();
}
