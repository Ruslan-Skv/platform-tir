'use client';

import { useEffect, useState } from 'react';

import {
  PUBLIC_SITE_EDIT_MODE_EVENT,
  checkPublicSiteEditModeIdleAndMaybeDisable,
  getPublicSiteEditMode,
  setPublicSiteEditMode,
} from '@/shared/lib/admin';

const IDLE_CHECK_INTERVAL_MS = 60_000;

export function usePublicSiteEditMode(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getPublicSiteEditMode());

    const sync = () => setEnabled(getPublicSiteEditMode());

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'admin_token' || e.key === 'user_token') {
        if (!e.newValue && getPublicSiteEditMode()) {
          setPublicSiteEditMode(false);
        }
      }
      sync();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(PUBLIC_SITE_EDIT_MODE_EVENT, sync);

    checkPublicSiteEditModeIdleAndMaybeDisable();
    const idleTimer = window.setInterval(
      () => checkPublicSiteEditModeIdleAndMaybeDisable(),
      IDLE_CHECK_INTERVAL_MS
    );

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(PUBLIC_SITE_EDIT_MODE_EVENT, sync);
      window.clearInterval(idleTimer);
    };
  }, []);

  return enabled;
}
