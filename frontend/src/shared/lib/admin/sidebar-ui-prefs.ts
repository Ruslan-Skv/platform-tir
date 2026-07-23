'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getAdminSidebarUiPrefs,
  updateAdminSidebarUiPrefs as patchAdminSidebarUiPrefsApi,
} from '@/shared/api/admin-sidebar-ui-prefs';

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

function prefsEqual(a: AdminSidebarUiPrefs, b: AdminSidebarUiPrefs): boolean {
  return a.hideIcons === b.hideIcons && a.mobileLayout === b.mobileLayout;
}

export function useAdminSidebarUiPrefs() {
  const [prefs, setPrefs] = useState<AdminSidebarUiPrefs>(() => readAdminSidebarUiPrefs());
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  useEffect(() => {
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

    let cancelled = false;
    (async () => {
      try {
        const remote = await getAdminSidebarUiPrefs();
        if (cancelled) return;
        const local = readAdminSidebarUiPrefs();
        const remoteIsDefault = prefsEqual(remote, DEFAULT_ADMIN_SIDEBAR_UI_PREFS);
        const localHasCustom = !prefsEqual(local, DEFAULT_ADMIN_SIDEBAR_UI_PREFS);

        // Если в браузере уже выбраны настройки, а в аккаунте ещё дефолт —
        // переносим локальный выбор на сервер (миграция со старых установок).
        if (remoteIsDefault && localHasCustom) {
          const saved = await patchAdminSidebarUiPrefsApi(local);
          if (cancelled) return;
          setPrefs(saved);
          writeAdminSidebarUiPrefs(saved);
          return;
        }

        // Иначе сервер — источник истины между устройствами.
        if (!prefsEqual(remote, local)) {
          writeAdminSidebarUiPrefs(remote);
        }
        setPrefs(remote);
      } catch {
        // офлайн / нет прав — остаёмся на localStorage
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
    };
    setPrefs(next);
    writeAdminSidebarUiPrefs(next);

    void patchAdminSidebarUiPrefsApi(next)
      .then((saved) => {
        if (!prefsEqual(saved, prefsRef.current)) {
          setPrefs(saved);
          writeAdminSidebarUiPrefs(saved);
        }
      })
      .catch(() => {
        // локальный кэш уже обновлён; при следующем заходе подтянется с сервера
      });
  }, []);

  return { prefs, updatePrefs };
}
