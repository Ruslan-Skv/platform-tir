'use client';

import { useLayoutEffect } from 'react';

/** Скрывает SSR SEO-сетку после загрузки клиентского каталога. */
export function CatalogSeoFallbackController({
  ready,
  syncKey,
}: {
  ready: boolean;
  /** При смене URL (ветка, фильтры) в DOM может появиться новая SSR-сетка — пересинхронизировать hidden. */
  syncKey: string;
}) {
  useLayoutEffect(() => {
    const el = document.getElementById('catalog-seo-fallback');
    if (!el) return;
    if (ready) {
      el.setAttribute('hidden', '');
    } else {
      el.removeAttribute('hidden');
    }
  }, [ready, syncKey]);

  return null;
}
