'use client';

import { useEffect, useState } from 'react';

import { navigation as defaultNavigation } from '@/shared/constants/navigation';
import type { NavigationItem } from '@/shared/types/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface NavItemFromApi {
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

function mapApiItemToNavItem(item: NavItemFromApi): NavigationItem {
  return {
    name: item.name,
    href: item.href || '#',
    hasDropdown: item.hasDropdown === true,
    dropdownItems: item.dropdownItems?.length ? item.dropdownItems : undefined,
  };
}

/**
 * Возвращает список пунктов меню: из API, если есть, иначе из констант.
 */
export function useNavigationItems(): NavigationItem[] {
  const [items, setItems] = useState<NavigationItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/navigation`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to fetch'))))
      .then((data: NavItemFromApi[]) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setItems(data.map(mapApiItemToNavItem));
        } else {
          setItems(defaultNavigation);
        }
      })
      .catch(() => {
        if (!cancelled) setItems(defaultNavigation);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return items ?? defaultNavigation;
}
