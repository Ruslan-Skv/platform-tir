'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

import { type NavItemFromApi, mapApiItemToNavItem } from '@/shared/api/navigation';
import { navigation as defaultNavigation } from '@/shared/constants/navigation';
import type { NavigationItem } from '@/shared/types/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const NAV_FALLBACK_STORAGE_KEY = 'platform-tir:navigation-fallback';

function getStoredFallback(): NavigationItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(NAV_FALLBACK_STORAGE_KEY);
    if (!raw) return null;
    const data: NavItemFromApi[] = JSON.parse(raw);
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map(mapApiItemToNavItem);
  } catch {
    return null;
  }
}

function setStoredFallback(data: NavItemFromApi[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NAV_FALLBACK_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

const NavigationContext = createContext<NavigationItem[] | undefined>(undefined);

export interface NavigationProviderProps {
  children: React.ReactNode;
  /** Навигация, загруженная на сервере (layout). При перезагрузке первый кадр уже с правильным порядком. */
  initialItems?: NavigationItem[] | null;
}

export function NavigationProvider({ children, initialItems }: NavigationProviderProps) {
  // Когда бэкенд доступен — initialItems с сервера, перескока нет. Когда недоступен — остаёмся на defaultNavigation и не подставляем localStorage, чтобы не было перескока через ~0.5 с.
  const [items, setItems] = useState<NavigationItem[]>(() => {
    if (initialItems != null && initialItems.length > 0) return initialItems;
    return defaultNavigation;
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/navigation`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to fetch'))))
      .then((data: NavItemFromApi[]) => {
        if (cancelled) return;
        if (Array.isArray(data) && data.length > 0) {
          setStoredFallback(data);
          setItems(data.map(mapApiItemToNavItem));
        } else {
          const stored = getStoredFallback();
          setItems(stored ?? defaultNavigation);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Бэкенд недоступен: не подставляем stored, чтобы порядок не менялся после первого кадра (остаётся defaultNavigation).
          setItems(defaultNavigation);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <NavigationContext.Provider value={items}>{children}</NavigationContext.Provider>;
}

export function useNavigationItems(): NavigationItem[] {
  const value = useContext(NavigationContext);
  if (value === undefined) {
    throw new Error('useNavigationItems must be used within NavigationProvider');
  }
  return value;
}
