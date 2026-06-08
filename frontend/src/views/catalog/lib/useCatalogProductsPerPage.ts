'use client';

import { useSyncExternalStore } from 'react';

const PRODUCTS_PER_PAGE_DESKTOP = 15;
const PRODUCTS_PER_PAGE_MOBILE = 16;
const MOBILE_CATALOG_MEDIA = '(max-width: 768px)';

function subscribeMobileCatalogViewport(cb: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(MOBILE_CATALOG_MEDIA);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getMobileCatalogViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_CATALOG_MEDIA).matches;
}

export function useCatalogProductsPerPage(): number {
  const isMobile = useSyncExternalStore(
    subscribeMobileCatalogViewport,
    getMobileCatalogViewport,
    () => false
  );
  return isMobile ? PRODUCTS_PER_PAGE_MOBILE : PRODUCTS_PER_PAGE_DESKTOP;
}
