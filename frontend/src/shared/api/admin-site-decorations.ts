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

export interface AdminSiteDecorationVariant {
  value: string;
  label: string;
}

export interface AdminSiteDecoration {
  code: string;
  title: string;
  description: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  /** Вариант из БД; null = первый вариант реестра. */
  variant: string | null;
  /** Доступные варианты из реестра (пусто — у украшения нет вариантов). */
  variants: AdminSiteDecorationVariant[];
  updatedAt: string;
}

export interface UpdateAdminSiteDecorationPayload {
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  variant?: string | null;
}

export async function getAdminSiteDecorations(): Promise<AdminSiteDecoration[]> {
  const res = await apiFetch(`${API_URL}/admin/site-decorations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить украшения');
  return res.json();
}

export async function updateAdminSiteDecoration(
  code: string,
  data: UpdateAdminSiteDecorationPayload
): Promise<AdminSiteDecoration> {
  const res = await apiFetch(`${API_URL}/admin/site-decorations/${encodeURIComponent(code)}`, {
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
