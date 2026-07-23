'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AdminSidebarMobileLayout = 'list' | 'grid3';

export type AdminSidebarUiPrefs = {
  /** Скрыть эмодзи-иконки у пунктов меню (на свёрнутой десктопной рейке иконки остаются). */
  hideIcons: boolean;
  /** Вид мобильного меню: список (как сейчас) или сетка 3×. */
  mobileLayout: AdminSidebarMobileLayout;
};

export const ADMIN_SIDEBAR_UI_PREFS_KEY = 'admin.sidebar.uiPrefs';
export const ADMIN_SIDEBAR_UI_PREFS_EVENT = 'admin-sidebar-ui-prefs-change';

export const DEFAULT_ADMIN_SIDEBAR_UI_PREFS: AdminSidebarUiPrefs = {
  hideIcons: false,
  mobileLayout: 'list',
};

export function readAdminSidebarUiPrefs(): AdminSidebarUiPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_ADMIN_SIDEBAR_UI_PREFS };
  try {
    const raw = localStorage.getItem(ADMIN_SIDEBAR_UI_PREFS_KEY);
    if (!raw) return { ...DEFAULT_ADMIN_SIDEBAR_UI_PREFS };
    const parsed = JSON.parse(raw) as Partial<AdminSidebarUiPrefs>;
    return {
      hideIcons: Boolean(parsed.hideIcons),
      mobileLayout: parsed.mobileLayout === 'grid3' ? 'grid3' : 'list',
    };
  } catch {
    return { ...DEFAULT_ADMIN_SIDEBAR_UI_PREFS };
  }
}

export function writeAdminSidebarUiPrefs(prefs: AdminSidebarUiPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_SIDEBAR_UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // квота / приватный режим
  }
  // Откладываем notify, чтобы подписчики (сайдбар) не делали setState
  // во время обновления другого компонента (страница настроек).
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent(ADMIN_SIDEBAR_UI_PREFS_EVENT, { detail: prefs }));
  });
}

export function useAdminSidebarUiPrefs() {
  const [prefs, setPrefs] = useState<AdminSidebarUiPrefs>(DEFAULT_ADMIN_SIDEBAR_UI_PREFS);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    setPrefs(readAdminSidebarUiPrefs());

    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<AdminSidebarUiPrefs>).detail;
      if (detail) {
        setPrefs(detail);
        return;
      }
      setPrefs(readAdminSidebarUiPrefs());
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_SIDEBAR_UI_PREFS_KEY) {
        setPrefs(readAdminSidebarUiPrefs());
      }
    };

    window.addEventListener(ADMIN_SIDEBAR_UI_PREFS_EVENT, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(ADMIN_SIDEBAR_UI_PREFS_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const updatePrefs = useCallback((patch: Partial<AdminSidebarUiPrefs>) => {
    const next: AdminSidebarUiPrefs = {
      hideIcons: patch.hideIcons ?? prefsRef.current.hideIcons,
      mobileLayout: patch.mobileLayout ?? prefsRef.current.mobileLayout,
    };
    setPrefs(next);
    writeAdminSidebarUiPrefs(next);
  }, []);

  return { prefs, updatePrefs };
}
