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

export interface HomeSectionsVisibility {
  heroVisible: boolean;
  directionsVisible: boolean;
  advantagesVisible: boolean;
  servicesVisible: boolean;
  featuredProductsVisible: boolean;
  contactFormVisible: boolean;
}

export async function getHomeSectionsVisibility(): Promise<HomeSectionsVisibility> {
  const res = await fetch(`${API_URL}/home/sections`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки секций');
  return res.json();
}

export async function getAdminHomeSectionsVisibility(): Promise<HomeSectionsVisibility> {
  const res = await fetch(`${API_URL}/admin/home/sections`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки секций');
  return res.json();
}

export async function updateAdminHomeSectionsVisibility(
  data: Partial<HomeSectionsVisibility>
): Promise<HomeSectionsVisibility> {
  const res = await fetch(`${API_URL}/admin/home/sections`, {
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
