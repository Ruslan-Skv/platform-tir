import { apiFetch } from '@/shared/lib/api-fetch';
import { serverFetch } from '@/shared/lib/fetch-with-timeout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/** Дополнительная характеристика профильной системы («название — значение»). */
export interface WindowCharacteristicItem {
  label: string;
  value: string;
}

/** Профильная система (Blitz New, Grazio, INTELIO 80, Softline 82 и т.д.). */
export interface WindowProfileSystem {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string;
  imageUrl: string | null;
  chambers: number | null;
  mountingDepth: number | null;
  glassUnitWidth: string | null;
  thermalResistance: string | null;
  soundInsulation: string | null;
  characteristics: WindowCharacteristicItem[] | null;
  advantages: string[];
  priceFrom: number | null;
  badge: string | null;
  sortOrder: number;
  isActive: boolean;
}

/** Производитель профильных систем (REHAU, VEKA, WHS). */
export interface WindowBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  systems: WindowProfileSystem[];
}

/** Настройки публичной страницы «Окна». */
export interface WindowsPageSettings {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: string;
}

/** Полный набор данных раздела «Окна» (GET /windows). */
export interface WindowsSectionData {
  settings: WindowsPageSettings;
  brands: WindowBrand[];
}

/**
 * Загружает раздел «Окна» на сервере (page.tsx). При ошибке возвращает null,
 * чтобы страница отработала на встроенном фолбэке.
 */
export async function fetchWindowsSection(apiBaseUrl: string): Promise<WindowsSectionData | null> {
  try {
    const res = await serverFetch(`${apiBaseUrl}/windows`, {
      next: { revalidate: 60 },
    } as RequestInit & { next?: { revalidate?: number } });
    if (!res.ok) return null;
    const data: WindowsSectionData = await res.json();
    if (!data || !Array.isArray(data.brands)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Загружает раздел «Окна» на клиенте (обновление после SSR). */
export async function getWindowsSection(): Promise<WindowsSectionData> {
  const res = await apiFetch(`${API_URL}/windows`);
  if (!res.ok) throw new Error('Не удалось загрузить раздел «Окна»');
  return res.json();
}
