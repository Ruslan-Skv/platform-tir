'use client';

import { useEffect, useState } from 'react';

import {
  PUBLIC_SITE_EDIT_MODE_EVENT,
  getPublicSiteEditMode,
} from '@/shared/lib/public-site-edit-mode';

export function usePublicSiteEditMode(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(getPublicSiteEditMode());

    const sync = () => setEnabled(getPublicSiteEditMode());
    window.addEventListener('storage', sync);
    window.addEventListener(PUBLIC_SITE_EDIT_MODE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(PUBLIC_SITE_EDIT_MODE_EVENT, sync);
    };
  }, []);

  return enabled;
}
