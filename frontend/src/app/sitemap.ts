import type { MetadataRoute } from 'next';

import { apiFetch } from '@/shared/lib/api-fetch';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://territory-interior.ru';
const API_URL = getServerApiBaseUrl();

interface SitemapCategoryRow {
  slug: string;
  parentSlug: string | null;
  updatedAt?: string;
}

interface SitemapProductRow {
  slug: string;
  updatedAt?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_ORIGIN}/catalog/products`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  try {
    const res = await apiFetch(`${API_URL}/products/catalog/sitemap-data`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        categories?: SitemapCategoryRow[];
        products?: SitemapProductRow[];
      };

      for (const cat of data.categories ?? []) {
        const path = cat.parentSlug
          ? `/catalog/products/${cat.parentSlug}/${cat.slug}`
          : `/catalog/products/${cat.slug}`;
        entries.push({
          url: `${SITE_ORIGIN}${path}`,
          lastModified: cat.updatedAt ? new Date(cat.updatedAt) : undefined,
          changeFrequency: 'daily',
          priority: cat.parentSlug ? 0.75 : 0.85,
        });
      }

      for (const product of data.products ?? []) {
        if (!product.slug) continue;
        entries.push({
          url: `${SITE_ORIGIN}/product/${product.slug}`,
          lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch {
    // частичный sitemap
  }

  return entries;
}
