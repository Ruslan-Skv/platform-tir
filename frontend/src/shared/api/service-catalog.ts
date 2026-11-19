import { apiFetch } from '@/shared/lib/api-fetch';
import { serverFetch } from '@/shared/lib/fetch-with-timeout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string | null;
  unit: string;
  price?: number;
}

/** Преимущество hero-блока страницы «Ремонт квартир». */
export interface ServiceCatalogHeroNote {
  icon: string | null;
  text: string;
}

/** Этап секции «Этапы работы». */
export interface ServiceCatalogStep {
  title: string;
  description: string | null;
}

export interface ServiceCatalogBlockContent {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroImageUrl: string | null;
  heroNotes: ServiceCatalogHeroNote[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
  steps: ServiceCatalogStep[] | null;
  seoTextTitle: string | null;
  seoText: string | null;
  ctaTitle: string | null;
  ctaText: string | null;
  ctaBackgroundColor: string | null;
  ctaTextColor: string | null;
  ctaBackgroundImage: string | null;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaShowButtons: boolean;
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
  /** Не показывать плитку с иконкой/картинкой в карточке на странице каталога */
  iconDisabled?: boolean;
  /** Цвет строки «N видов работ» в карточке (HEX) */
  countTextColor?: string | null;
  items: ServiceCatalogItem[];
  children?: ServiceCatalogCategory[];
  totalWorkTypes?: number;
}

export interface ServiceCatalogData {
  block: ServiceCatalogBlockContent;
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
    iconDisabled?: boolean;
    countTextColor?: string | null;
    itemsCount: number;
  }>;
}

export async function getServiceCatalog(): Promise<ServiceCatalogData> {
  const res = await apiFetch(`${API_URL}/service-catalog`);
  if (!res.ok) throw new Error('Не удалось загрузить каталог услуг');
  return res.json();
}

/**
 * Загружает каталог услуг на сервере (SSR-страница «Ремонт квартир»).
 * При ошибке возвращает null, чтобы страница отработала без начальных данных.
 */
export async function fetchServiceCatalog(apiBaseUrl: string): Promise<ServiceCatalogData | null> {
  try {
    const res = await serverFetch(`${apiBaseUrl}/service-catalog`, {
      next: { revalidate: 60 },
    } as RequestInit & { next?: { revalidate?: number } });
    if (!res.ok) return null;
    const data: ServiceCatalogData = await res.json();
    if (!data || !Array.isArray(data.categories) || !data.block) return null;
    return data;
  } catch {
    return null;
  }
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
