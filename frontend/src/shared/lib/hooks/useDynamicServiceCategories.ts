'use client';

import { useCallback, useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ServiceCategoryForNav {
  id: string;
  name: string;
  slug: string;
  href: string;
  icon?: string | null;
  image?: string | null;
}

export function useDynamicServiceCategories() {
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryForNav[]>([]);

  const fetchServiceCategories = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/service-catalog`);
      if (!res.ok) return;
      const data = await res.json();
      const categories = data?.categories ?? [];
      setServiceCategories(
        categories.map(
          (cat: {
            id: string;
            name: string;
            slug: string;
            icon?: string | null;
            image?: string | null;
          }) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
            href: `/catalog/services/${cat.slug}`,
            icon: cat.icon ?? null,
            image: cat.image ?? null,
          })
        )
      );
    } catch {
      setServiceCategories([]);
    }
  }, []);

  useEffect(() => {
    fetchServiceCategories();
  }, [fetchServiceCategories]);

  return {
    serviceCategories,
    refetch: fetchServiceCategories,
  };
}
