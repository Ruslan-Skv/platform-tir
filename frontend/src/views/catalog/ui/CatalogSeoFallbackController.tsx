'use client';

import { useLayoutEffect } from 'react';

/** Держит SSR SEO-сетку скрытой; контент остаётся в DOM для краулеров. */
export function CatalogSeoFallbackController({
  syncKey,
}: {
  /** При смене URL в DOM может появиться новая SSR-сетка — снова скрыть. */
  syncKey: string;
}) {
  useLayoutEffect(() => {
    const el = document.getElementById('catalog-seo-fallback');
    if (!el) return;
    el.setAttribute('hidden', '');
  }, [syncKey]);

  return null;
}
