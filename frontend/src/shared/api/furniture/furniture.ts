import { apiFetch } from '@/shared/lib/api-fetch';
import { serverFetch } from '@/shared/lib/fetch-with-timeout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Дополнительная характеристика изделия («название — значение»). */
export interface ProductCharacteristicItem {
  label: string;
  value: string;
}

/** Этап работы над заказом (блок «Этапы работы»). */
export interface FurnitureStep {
  title: string;
  description: string;
}

/** Вопрос-ответ блока FAQ. */
export interface FurnitureFaqItem {
  question: string;
  answer: string;
}

/** Карточка блока «Материалы и фурнитура». */
export interface FurnitureMaterialItem {
  name: string;
  description: string;
}

/** Изделие в категории (прямая кухня, угловой шкаф-купе, модульная гардеробная и т.д.). */
export interface FurnitureProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  /** Видео об изделии (Rutube/YouTube/VK или прямой файл) */
  videoUrl: string | null;
  /** Конфигурация: «Прямая», «Угловая», «П-образная», «Встроенная», «Корпусная» */
  configuration: string | null;
  /** Материал фасадов: «ЛДСП Egger», «МДФ в плёнке ПВХ», «МДФ эмаль», «Шпон» */
  facadeMaterial: string | null;
  /** Фурнитура: «Blum», «Hettich», «Boyard», «GTV» */
  hardware: string | null;
  characteristics: ProductCharacteristicItem[] | null;
  advantages: string[];
  /** Цена «от», ₽ */
  priceFrom: number | null;
  /** Единица цены: «пог. м» (кухни), «м²», null — за изделие целиком */
  priceUnit: string | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Категория мебельных изделий (Кухни, Шкафы-купе, Гардеробные...). */
export interface FurnitureCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  products: FurnitureProduct[];
}

/** Настройки публичной страницы «Мебель». */
export interface FurniturePageSettings {
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
  comparisonShowConfiguration: boolean;
  comparisonShowFacade: boolean;
  comparisonShowHardware: boolean;
  comparisonShowPrice: boolean;
  materialsShow: boolean;
  materialsTitle: string | null;
  materials: FurnitureMaterialItem[] | null;
  calcShow: boolean;
  calcTitle: string | null;
  calcNote: string | null;
  calcAssemblyPrice: number;
  calcDeliveryPrice: number;
  calcPremiumHardwarePrice: number;
  calcMinOrder: number;
  steps: FurnitureStep[] | null;
  faq: FurnitureFaqItem[] | null;
  ctaBackgroundColor: string | null;
  ctaBackgroundImage: string | null;
  /** Вариант размещения фоновой картинки: cover | contain | tile */
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaTextColor: string | null;
  ctaShowButtons: boolean;
  updatedAt: string;
}

/** Полный набор данных раздела «Мебель» (GET /furniture). */
export interface FurnitureSectionData {
  settings: FurniturePageSettings;
  categories: FurnitureCategory[];
}

/**
 * Загружает раздел «Мебель» на сервере (page.tsx). При ошибке возвращает null,
 * чтобы страница отработала на встроенном фолбэке.
 */
export async function fetchFurnitureSection(
  apiBaseUrl: string
): Promise<FurnitureSectionData | null> {
  try {
    const res = await serverFetch(`${apiBaseUrl}/furniture`, {
      next: { revalidate: 60 },
    } as RequestInit & { next?: { revalidate?: number } });
    if (!res.ok) return null;
    const data: FurnitureSectionData = await res.json();
    if (!data || !Array.isArray(data.categories)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Загружает раздел «Мебель» на клиенте (обновление после SSR). */
export async function getFurnitureSection(): Promise<FurnitureSectionData> {
  const res = await apiFetch(`${API_URL}/furniture`);
  if (!res.ok) throw new Error('Не удалось загрузить раздел «Мебель»');
  return res.json();
}
