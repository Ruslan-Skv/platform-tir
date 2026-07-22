'use client';

import { useEffect } from 'react';

import { setFaviconBadge } from '@/shared/lib/favicon-badge';

/** Показывает число непрочитанных на фавиконке вкладки; при размонтировании сбрасывает. */
export function useFaviconBadge(count: number): void {
  const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;

  useEffect(() => {
    void setFaviconBadge(safeCount);
  }, [safeCount]);

  useEffect(() => {
    return () => {
      void setFaviconBadge(0);
    };
  }, []);
}
