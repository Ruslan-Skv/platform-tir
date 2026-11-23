import { apiFetch } from '@/shared/lib/api-fetch';
import { serverFetch } from '@/shared/lib/fetch-with-timeout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Дополнительная характеристика фактуры («название — значение»). */
export interface FabricCharacteristicItem {
  label: string;
  value: string;
}

/** Этап работы над заказом (блок «Этапы работы»). */
export interface StretchCeilingsStep {
  title: string;
  description: string;
}

/** Вопрос-ответ блока FAQ. */
export interface StretchCeilingsFaqItem {
  question: string;
  answer: string;
}

/** Фактура полотна производителя (MSD Classic Mat, Descor Silk и т.д.). */
export interface CeilingFabric {
  id: string;
  manufacturerId: string;
  name: string;
  slug: string;
  /** Тип фактуры: «Матовая», «Глянцевая», «Сатиновая», «Тканевая» и т.д. */
  textureType: string | null;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  /** Видео о фактуре (Rutube/YouTube/VK или прямой файл) */
  videoUrl: string | null;
  /** Ширина полотна («до 3,2 м», «до 5,1 м бесшовное») */
  width: string | null;
  characteristics: FabricCharacteristicItem[] | null;
  advantages: string[];
  /** Цена «от», ₽/м² */
  priceFrom: number | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Производитель полотен (MSD, Bauf, Pongs, Descor, Cerutti). */
export interface CeilingManufacturer {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  fabrics: CeilingFabric[];
}

/** Настройки публичной страницы «Натяжные потолки». */
export interface StretchCeilingsPageSettings {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  comparisonShow: boolean;
  comparisonTitle: string | null;
  comparisonNote: string | null;
  comparisonShowTexture: boolean;
  comparisonShowWidth: boolean;
  comparisonShowPrice: boolean;
  comparisonShowCountry: boolean;
  calcShow: boolean;
  calcTitle: string | null;
  calcNote: string | null;
  calcPricePerMeterBaget: number;
  calcPricePerCorner: number;
  calcPricePerLight: number;
  calcPricePerPipe: number;
  calcLightOptionPrice: number;
  calcCorniceOptionPrice: number;
  calcMinOrder: number;
  steps: StretchCeilingsStep[] | null;
  faq: StretchCeilingsFaqItem[] | null;
  ctaBackgroundColor: string | null;
  ctaBackgroundImage: string | null;
  /** Вариант размещения фоновой картинки: cover | contain | tile */
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string | null;
  ctaShowButtons: boolean;
  updatedAt: string;
}

/** Полный набор данных раздела «Натяжные потолки» (GET /stretch-ceilings). */
export interface StretchCeilingsSectionData {
  settings: StretchCeilingsPageSettings;
  manufacturers: CeilingManufacturer[];
}

/**
 * Загружает раздел «Натяжные потолки» на сервере (page.tsx). При ошибке возвращает null,
 * чтобы страница отработала на встроенном фолбэке.
 */
export async function fetchStretchCeilingsSection(
  apiBaseUrl: string
): Promise<StretchCeilingsSectionData | null> {
  try {
    const res = await serverFetch(`${apiBaseUrl}/stretch-ceilings`, {
      next: { revalidate: 60 },
    } as RequestInit & { next?: { revalidate?: number } });
    if (!res.ok) return null;
    const data: StretchCeilingsSectionData = await res.json();
    if (!data || !Array.isArray(data.manufacturers)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Загружает раздел «Натяжные потолки» на клиенте (обновление после SSR). */
export async function getStretchCeilingsSection(): Promise<StretchCeilingsSectionData> {
  const res = await apiFetch(`${API_URL}/stretch-ceilings`);
  if (!res.ok) throw new Error('Не удалось загрузить раздел «Натяжные потолки»');
  return res.json();
}
