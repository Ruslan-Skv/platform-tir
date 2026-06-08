import { apiFetch } from '@/shared/lib/api-fetch';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string | null;
  unit: string;
  price?: number;
}

export interface ServiceCatalogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  cardBackgroundImage?: string | null;
  cardBackgroundTransparent?: boolean;
  items: ServiceCatalogItem[];
  children?: ServiceCatalogCategory[];
  totalWorkTypes?: number;
}

export interface ServiceCatalogData {
  block: { title: string };
  categories: ServiceCatalogCategory[];
}

export interface ServiceCatalogCategorySection {
  name: string;
  slug: string;
  items: ServiceCatalogItem[];
}

export interface ServiceCatalogCategoryDetail {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  items: ServiceCatalogItem[];
  itemSections?: ServiceCatalogCategorySection[];
  showPricesInPublic: boolean;
  parent?: { id: string; name: string; slug: string } | null;
  children?: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    icon?: string | null;
    image?: string | null;
    itemsCount: number;
  }>;
}

export async function getServiceCatalog(): Promise<ServiceCatalogData> {
  const res = await apiFetch(`${API_URL}/service-catalog`);
  if (!res.ok) throw new Error('Не удалось загрузить каталог услуг');
  return res.json();
}

export async function getServiceCatalogCategory(
  slug: string
): Promise<ServiceCatalogCategoryDetail> {
  const res = await apiFetch(`${API_URL}/service-catalog/categories/${slug}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Категория не найдена');
    throw new Error('Не удалось загрузить категорию');
  }
  return res.json();
}
