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

export interface ContactFormBlock {
  title: string;
  subtitle: string;
}

export async function getContactFormBlock(): Promise<ContactFormBlock> {
  const res = await fetch(`${API_URL}/home/contact-form`);
  if (!res.ok) throw new Error('Не удалось загрузить блок');
  return res.json();
}

export async function getAdminContactFormBlock(): Promise<ContactFormBlock> {
  const res = await fetch(`${API_URL}/admin/home/contact-form`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить блок');
  return res.json();
}

export async function updateAdminContactFormBlock(
  data: Partial<ContactFormBlock>
): Promise<ContactFormBlock> {
  const res = await fetch(`${API_URL}/admin/home/contact-form`, {
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
