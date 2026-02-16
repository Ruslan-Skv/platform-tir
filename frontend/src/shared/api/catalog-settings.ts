const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface CatalogSettings {
  id: string;
  defaultMobileCatalogColumns: 1 | 2;
  updatedAt: string;
}

export async function getCatalogSettings(): Promise<CatalogSettings> {
  const res = await fetch(`${API_URL}/catalog/settings`);
  if (!res.ok) throw new Error('Не удалось загрузить настройки каталога');
  return res.json();
}
