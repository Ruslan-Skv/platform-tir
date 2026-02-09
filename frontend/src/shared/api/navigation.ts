import type { NavigationItem } from '@/shared/types/navigation';

/** Формат пункта навигации с бэкенда (GET /navigation) */
export interface NavItemFromApi {
  id: string;
  name: string;
  href: string;
  sortOrder: number;
  hasDropdown: boolean;
  dropdownItems?: Array<{
    id: string;
    name: string;
    href: string;
    sortOrder: number;
    icon: string | null;
    submenu: Array<{ id: string; name: string; href: string; sortOrder: number }>;
  }>;
}

export function mapApiItemToNavItem(item: NavItemFromApi): NavigationItem {
  return {
    name: item.name,
    href: item.href || '#',
    hasDropdown: item.hasDropdown === true,
    dropdownItems: item.dropdownItems?.length ? item.dropdownItems : undefined,
  };
}

/**
 * Загружает навигацию с бэкенда. Используется на сервере (layout) и при клиентском обновлении.
 * При ошибке или пустом ответе возвращает null.
 */
export async function fetchNavigation(apiUrl: string): Promise<NavigationItem[] | null> {
  try {
    const res = await fetch(`${apiUrl}/navigation`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data: NavItemFromApi[] = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map(mapApiItemToNavItem);
  } catch {
    return null;
  }
}
