'use client';

import { useEffect, useState } from 'react';

import { canEditCatalogOnPublicSite } from '@/shared/lib/catalog-public-edit';

export function useCanEditCatalogOnPublic(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setAllowed(canEditCatalogOnPublicSite());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('auth-token-changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('auth-token-changed', sync);
    };
  }, []);

  return allowed;
}
