'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getAdminSidebarUiPrefs,
  updateAdminSidebarUiPrefs as patchAdminSidebarUiPrefsApi,
} from '@/shared/api/admin-sidebar-ui-prefs';

export type AdminSidebarMobileLayout = 'list' | 'grid3';
export type AdminSidebarDesktopLayout = 'list' | 'grid2';

export type AdminSidebarUiPrefs = {
  /** Скрыть эмодзи-иконки у пунктов меню (на свёрнутой десктопной рейке иконки остаются). */
  hideIcons: boolean;
  /** Вид мобильного меню: список (как сейчас) или сетка 3×. */
  mobileLayout: AdminSidebarMobileLayout;
  /** Вид десктопного меню: список или сетка 2×. */
  desktopLayout: AdminSidebarDesktopLayout;
};

export const ADMIN_SIDEBAR_UI_PREFS_KEY = 'admin.sidebar.uiPrefs';
export const ADMIN_SIDEBAR_UI_PREFS_EVENT = 'admin-sidebar-ui-prefs-change';

export const DEFAULT_ADMIN_SIDEBAR_UI_PREFS: AdminSidebarUiPrefs = {
  hideIcons: false,
  mobileLayout: 'list',
  desktopLayout: 'list',
};

export function syncAdminSidebarUiPrefsDom(prefs: AdminSidebarUiPrefs): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-admin-sidebar-desktop-layout', prefs.desktopLayout);
  document.documentElement.setAttribute('data-admin-sidebar-mobile-layout', prefs.mobileLayout);
}

export function readAdminSidebarUiPrefsFromDom(): Partial<AdminSidebarUiPrefs> {
  if (typeof document === 'undefined') return {};
  const root = document.documentElement;
  const desktopLayout = root.getAttribute('data-admin-sidebar-desktop-layout');
  const mobileLayout = root.getAttribute('data-admin-sidebar-mobile-layout');
  return {
    ...(desktopLayout === 'grid2' ? { desktopLayout: 'grid2' as const } : {}),
    ...(mobileLayout === 'grid3' ? { mobileLayout: 'grid3' as const } : {}),
  };
}

export function readAdminSidebarUiPrefs(): AdminSidebarUiPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_ADMIN_SIDEBAR_UI_PREFS };
  try {
    const raw = localStorage.getItem(ADMIN_SIDEBAR_UI_PREFS_KEY);
    const fromDom = readAdminSidebarUiPrefsFromDom();
    if (!raw) {
      return { ...DEFAULT_ADMIN_SIDEBAR_UI_PREFS, ...fromDom };
    }
    const parsed = JSON.parse(raw) as Partial<AdminSidebarUiPrefs>;
    return {
      hideIcons: Boolean(parsed.hideIcons),
      mobileLayout: parsed.mobileLayout === 'grid3' ? 'grid3' : 'list',
      desktopLayout: parsed.desktopLayout === 'grid2' ? 'grid2' : 'list',
      ...fromDom,
    };
  } catch {
    return { ...DEFAULT_ADMIN_SIDEBAR_UI_PREFS, ...readAdminSidebarUiPrefsFromDom() };
  }
}

export function writeAdminSidebarUiPrefs(prefs: AdminSidebarUiPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ADMIN_SIDEBAR_UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // квота / приватный режим
  }
  syncAdminSidebarUiPrefsDom(prefs);
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent(ADMIN_SIDEBAR_UI_PREFS_EVENT, { detail: prefs }));
  });
}

function prefsEqual(a: AdminSidebarUiPrefs, b: AdminSidebarUiPrefs): boolean {
  return (
    a.hideIcons === b.hideIcons &&
    a.mobileLayout === b.mobileLayout &&
    a.desktopLayout === b.desktopLayout
  );
}

/** Если API не сохранил grid-режим, не откатываем локальный выбор. */
export function mergeSidebarUiPrefsSaved(
  requested: AdminSidebarUiPrefs,
  saved: AdminSidebarUiPrefs
): AdminSidebarUiPrefs {
  return {
    hideIcons: saved.hideIcons,
    mobileLayout:
      requested.mobileLayout === 'grid3' && saved.mobileLayout !== 'grid3'
        ? requested.mobileLayout
        : saved.mobileLayout,
    desktopLayout:
      requested.desktopLayout === 'grid2' && saved.desktopLayout !== 'grid2'
        ? requested.desktopLayout
        : saved.desktopLayout,
  };
}

export function useAdminSidebarUiPrefs() {
  const [prefs, setPrefs] = useState<AdminSidebarUiPrefs>(DEFAULT_ADMIN_SIDEBAR_UI_PREFS);
  const [ready, setReady] = useState(false);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<AdminSidebarUiPrefs>).detail;
      if (detail) {
        setPrefs(detail);
        syncAdminSidebarUiPrefsDom(detail);
        return;
      }
      const local = readAdminSidebarUiPrefs();
      setPrefs(local);
      syncAdminSidebarUiPrefsDom(local);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key === ADMIN_SIDEBAR_UI_PREFS_KEY) {
        const local = readAdminSidebarUiPrefs();
        setPrefs(local);
        syncAdminSidebarUiPrefsDom(local);
      }
    };

    window.addEventListener(ADMIN_SIDEBAR_UI_PREFS_EVENT, onCustom);
    window.addEventListener('storage', onStorage);

    let cancelled = false;

    const applyLocal = () => {
      const local = readAdminSidebarUiPrefs();
      syncAdminSidebarUiPrefsDom(local);
      if (!cancelled) {
        setPrefs(local);
        setReady(true);
      }
      return local;
    };

    (async () => {
      const local = applyLocal();

      try {
        const remote = await getAdminSidebarUiPrefs();
        if (cancelled) return;

        const remoteIsDefault = prefsEqual(remote, DEFAULT_ADMIN_SIDEBAR_UI_PREFS);
        const localHasCustom = !prefsEqual(local, DEFAULT_ADMIN_SIDEBAR_UI_PREFS);

        if (remoteIsDefault && localHasCustom) {
          try {
            const saved = await patchAdminSidebarUiPrefsApi(local);
            if (cancelled) return;
            const merged = mergeSidebarUiPrefsSaved(local, saved);
            setPrefs(merged);
            writeAdminSidebarUiPrefs(merged);
          } catch {
            if (!cancelled) setPrefs(local);
          }
          return;
        }

        if (!remoteIsDefault) {
          if (!prefsEqual(remote, local)) {
            writeAdminSidebarUiPrefs(remote);
          } else {
            syncAdminSidebarUiPrefsDom(remote);
          }
          if (!cancelled) setPrefs(remote);
          return;
        }

        if (!cancelled) setPrefs(local);
      } catch {
        if (!cancelled) applyLocal();
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(ADMIN_SIDEBAR_UI_PREFS_EVENT, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const updatePrefs = useCallback((patch: Partial<AdminSidebarUiPrefs>) => {
    const next: AdminSidebarUiPrefs = {
      hideIcons: patch.hideIcons ?? prefsRef.current.hideIcons,
      mobileLayout: patch.mobileLayout ?? prefsRef.current.mobileLayout,
      desktopLayout: patch.desktopLayout ?? prefsRef.current.desktopLayout,
    };
    setPrefs(next);
    writeAdminSidebarUiPrefs(next);

    void patchAdminSidebarUiPrefsApi(next)
      .then((saved) => {
        const merged = mergeSidebarUiPrefsSaved(next, saved);
        if (!prefsEqual(merged, prefsRef.current)) {
          setPrefs(merged);
          writeAdminSidebarUiPrefs(merged);
        }
      })
      .catch(() => {
        // локальный кэш уже обновлён
      });
  }, []);

  return { prefs, updatePrefs, ready };
}
