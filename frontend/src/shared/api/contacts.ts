import { apiFetch } from '@/shared/lib/api-fetch';
import type {
  ContactSalonInfo,
  ContactSalonInput,
  ContactsPageInfo,
  PublicContactsData,
} from '@/shared/lib/contacts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getAdminAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  const headers: HeadersInit = {};
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export type { ContactSalonInfo, ContactSalonInput, ContactsPageInfo, PublicContactsData };

export async function getPublicContacts(): Promise<PublicContactsData> {
  const res = await apiFetch(`${API_URL}/contacts`);
  if (!res.ok) throw new Error('Не удалось загрузить контакты');
  return res.json();
}

export async function getAdminContactsPage(): Promise<ContactsPageInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/contacts/page`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки');
  return res.json();
}

export async function updateAdminContactsPage(
  data: Partial<ContactsPageInfo>
): Promise<ContactsPageInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/contacts/page`, {
    method: 'PATCH',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка сохранения');
  }
  return res.json();
}

export async function listAdminContactSalons(): Promise<ContactSalonInfo[]> {
  const res = await apiFetch(`${API_URL}/admin/content/contacts/salons`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить салоны');
  return res.json();
}

export async function getAdminContactSalon(id: string): Promise<ContactSalonInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/contacts/salons/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error('Салон не найден');
  return res.json();
}

export async function createAdminContactSalon(data: ContactSalonInput): Promise<ContactSalonInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/contacts/salons`, {
    method: 'POST',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка создания');
  }
  return res.json();
}

export async function updateAdminContactSalon(
  id: string,
  data: Partial<ContactSalonInput>
): Promise<ContactSalonInfo> {
  const res = await apiFetch(`${API_URL}/admin/content/contacts/salons/${id}`, {
    method: 'PATCH',
    headers: { ...getAdminAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка сохранения');
  }
  return res.json();
}

export async function deleteAdminContactSalon(id: string): Promise<void> {
  const res = await apiFetch(`${API_URL}/admin/content/contacts/salons/${id}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка удаления');
  }
}

export async function uploadContactSalonImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await apiFetch(`${API_URL}/admin/content/contacts/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Ошибка загрузки');
  }
  return res.json();
}
