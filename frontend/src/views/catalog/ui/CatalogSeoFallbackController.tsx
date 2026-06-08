'use client';

import { useEffect } from 'react';

/** Скрывает SSR SEO-сетку после загрузки клиентского каталога. */
export function CatalogSeoFallbackController({ ready }: { ready: boolean }) {
  useEffect(() => {
    const el = document.getElementById('catalog-seo-fallback');
    if (!el) return;
    if (ready) {
      el.setAttribute('hidden', '');
    } else {
      el.removeAttribute('hidden');
    }
  }, [ready]);

  return null;
}
