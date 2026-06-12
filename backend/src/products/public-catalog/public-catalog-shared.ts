import type { Category } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { PublicCatalogListParams } from '../dto/public-catalog-list.dto';

export type CategoryWithChildren = Category & { children?: CategoryWithChildren[] };

export type CatalogFilterRow = {
  id: string;
  name: string;
  slug: string;
  price: Prisma.Decimal;
  stock: number;
  onOrder: boolean;
  sortOrder: number;
  createdAt: Date;
  isNew: boolean;
  manufacturerId: string | null;
  manufacturer?: { id: string; name: string; slug: string } | null;
  attributes: unknown;
  category: {
    slug: string;
    parent: { slug: string } | null;
  };
  doorThickness: { name: string } | null;
  weatherstrip: { name: string } | null;
};

export type CatalogContext = {
  category: CategoryWithChildren;
  effectiveSlug: string;
  allCategoryIds: string[];
};

export const MAX_LIMIT = 50;
export const DEFAULT_LIMIT = 15;
export const CATALOG_SEARCH_MAX = 10_000;

export function resolveEffectiveCategorySlug(params: PublicCatalogListParams): string | null {
  if (params.categorySlug && params.categorySlug !== 'all') {
    return params.categorySlug;
  }
  return params.branch?.trim() || null;
}

export function collectCategoryIds(category: CategoryWithChildren): string[] {
  const ids = [category.id];
  if (category.children?.length) {
    for (const child of category.children) {
      ids.push(...collectCategoryIds(child));
    }
  }
  return ids;
}
