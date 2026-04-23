import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface CreateServiceOrderDto {
  customerEmail: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerNotes?: string;
  items: { itemId: string; quantity: number }[];
}

export async function canPlaceServiceOrder(): Promise<{ canPlace: boolean }> {
  const res = await apiFetch(`${API_URL}/orders/can-place-service-order`, {
    headers: getAuthHeaders(),
  });
  if (res.status === 401) {
    return { canPlace: false };
  }
  if (!res.ok) {
    throw new Error('Не удалось проверить права');
  }
  return res.json();
}

export async function createServiceOrder(
  dto: CreateServiceOrderDto
): Promise<{ id: string; orderNumber: string; total: number }> {
  const res = await apiFetch(`${API_URL}/admin/orders/service-order`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(dto),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? 'Не удалось оформить заказ');
  }
  return res.json();
}
