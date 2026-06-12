'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Promotion } from '@/shared/api/promotions';
import { getPromotions } from '@/shared/api/promotions';

const UPLOADS_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1').replace(
  /\/api\/v1\/?$/,
  ''
);

export function usePromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPromotions();
      setPromotions(data);
    } catch {
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) {
      return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return url;
  };

  return {
    promotions,
    loading,
    getImageUrl,
  };
}

export type PromotionsPageModel = ReturnType<typeof usePromotionsPage>;
