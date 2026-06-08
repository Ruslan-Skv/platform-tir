'use client';

import { useQueryClient } from '@tanstack/react-query';

import { SERVICE_CATALOG_QUERY_KEY, useServiceCatalog } from '@/shared/lib/hooks/useServiceCatalog';

export interface ServiceCategoryForNav {
  id: string;
  name: string;
  slug: string;
  href: string;
  icon?: string | null;
  image?: string | null;
}

export function useDynamicServiceCategories() {
  const queryClient = useQueryClient();
  const { data } = useServiceCatalog();

  const serviceCategories: ServiceCategoryForNav[] = (data?.categories ?? []).map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    href: `/catalog/services/${cat.slug}`,
    icon: cat.icon ?? null,
    image: cat.image ?? null,
  }));

  return {
    serviceCategories,
    refetch: () => queryClient.invalidateQueries({ queryKey: SERVICE_CATALOG_QUERY_KEY }),
  };
}
