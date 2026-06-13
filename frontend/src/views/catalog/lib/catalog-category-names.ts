import { apiFetch } from '@/shared/lib/api-fetch';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

const API_URL = getServerApiBaseUrl();

export const CATALOG_CATEGORY_NAMES: Record<string, string> = {
  'entrance-doors': 'Входные двери',
  'interior-doors': 'Межкомнатные двери',
  'door-hardware': 'Фурнитура для дверей',
  windows: 'Окна',
  blinds: 'Жалюзи',
  'stretch-ceilings': 'Потолки натяжные',
  'upholstered-furniture': 'Мягкая мебель',
  'dining-groups': 'Обеденные группы',
  'sleep-products': 'Товары для сна',
  'custom-furniture': 'Мебель по индивидуальным размерам',
  lighting: 'Освещение',
};

export async function getCategoryNameBySlug(slug: string): Promise<string | null> {
  try {
    const res = await apiFetch(`${API_URL}/categories/slug/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.name ?? null;
  } catch {
    return null;
  }
}

export async function resolveCatalogCategoryName(
  slug: string,
  fallback = 'Каталог'
): Promise<string> {
  return CATALOG_CATEGORY_NAMES[slug] ?? (await getCategoryNameBySlug(slug)) ?? fallback;
}
