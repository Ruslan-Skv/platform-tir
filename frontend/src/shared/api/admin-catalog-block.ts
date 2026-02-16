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

export interface CatalogBlockSettings {
  id: string;
  defaultMobileCatalogColumns: 1 | 2;
  updatedAt: string;
}

export async function getAdminCatalogBlockSettings(): Promise<CatalogBlockSettings> {
  const res = await fetch(`${API_URL}/admin/catalog-block/settings`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Не удалось загрузить настройки каталога');
  return res.json();
}

export async function updateAdminCatalogBlockSettings(data: {
  defaultMobileCatalogColumns?: 1 | 2;
}): Promise<CatalogBlockSettings> {
  const res = await fetch(`${API_URL}/admin/catalog-block/settings`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Не удалось сохранить настройки');
  }
  return res.json();
}
