'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Promotion } from '@/shared/api/promotions';
import { getPromotions } from '@/shared/api/promotions';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

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

  const getImageUrl = (url: string) => publicUploadUrl(url);

  return {
    promotions,
    loading,
    getImageUrl,
  };
}

export type PromotionsPageModel = ReturnType<typeof usePromotionsPage>;
