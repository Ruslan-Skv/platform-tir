import { apiFetch } from '@/shared/lib/api-fetch';
import { serverFetch } from '@/shared/lib/fetch-with-timeout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Дополнительная характеристика изделия («название — значение»). */
export interface ProductCharacteristicItem {
  label: string;
  value: string;
}

/** Этап работы над заказом (блок «Этапы работы»). */
export interface BlindsStep {
  title: string;
  description: string;
}

/** Вопрос-ответ блока FAQ. */
export interface BlindsFaqItem {
  question: string;
  answer: string;
}

/** Система/модель изделия в категории (UNI-2, зебра MINI, ламели 89 мм и т.д.). */
export interface BlindsProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  /** Видео об изделии (Rutube/YouTube/VK или прямой файл) */
  videoUrl: string | null;
  /** Способ установки: «На створку», «На проём», «На стену / потолок» */
  mountType: string | null;
  /** Материал полотна или ламелей: «Ткань blackout», «Алюминий 25 мм», «Дерево» */
  material: string | null;
  /** Управление: «Цепочное», «Пружинное», «Электропривод», «Без сверления» */
  controlType: string | null;
  characteristics: ProductCharacteristicItem[] | null;
  advantages: string[];
  /** Цена «от», ₽/м² с монтажом */
  priceFrom: number | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Категория солнцезащитных изделий (Рулонные шторы, Зебра, Вертикальные...). */
export interface BlindsCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  products: BlindsProduct[];
}

/** Настройки публичной страницы «Жалюзи». */
export interface BlindsPageSettings {
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
  comparisonShowMount: boolean;
  comparisonShowMaterial: boolean;
  comparisonShowControl: boolean;
  comparisonShowPrice: boolean;
  calcShow: boolean;
  calcTitle: string | null;
  calcNote: string | null;
  calcMountPrice: number;
  calcMotorPrice: number;
  calcNoDrillPrice: number;
  calcMinOrder: number;
  steps: BlindsStep[] | null;
  faq: BlindsFaqItem[] | null;
  ctaBackgroundColor: string | null;
  ctaBackgroundImage: string | null;
  /** Вариант размещения фоновой картинки: cover | contain | tile */
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string | null;
  ctaShowButtons: boolean;
  updatedAt: string;
}

/** Полный набор данных раздела «Жалюзи» (GET /blinds). */
export interface BlindsSectionData {
  settings: BlindsPageSettings;
  categories: BlindsCategory[];
}

/**
 * Загружает раздел «Жалюзи» на сервере (page.tsx). При ошибке возвращает null,
 * чтобы страница отработала на встроенном фолбэке.
 */
export async function fetchBlindsSection(apiBaseUrl: string): Promise<BlindsSectionData | null> {
  try {
    const res = await serverFetch(`${apiBaseUrl}/blinds`, {
      next: { revalidate: 60 },
    } as RequestInit & { next?: { revalidate?: number } });
    if (!res.ok) return null;
    const data: BlindsSectionData = await res.json();
    if (!data || !Array.isArray(data.categories)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Загружает раздел «Жалюзи» на клиенте (обновление после SSR). */
export async function getBlindsSection(): Promise<BlindsSectionData> {
  const res = await apiFetch(`${API_URL}/blinds`);
  if (!res.ok) throw new Error('Не удалось загрузить раздел «Жалюзи»');
  return res.json();
}
