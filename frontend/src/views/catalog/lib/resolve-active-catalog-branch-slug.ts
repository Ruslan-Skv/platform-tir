import type { CategoryFilterOption } from '@/views/catalog/lib/buildCategoryFilterOptions';

/** Активный корневой раздел для радио в фильтрах на /catalog/products/[slug]. */
export function resolveActiveCatalogBranchSlug(
  categorySlug: string | undefined,
  parentCategorySlug: string | undefined,
  hubOptions: CategoryFilterOption[]
): string | null {
  if (parentCategorySlug?.trim()) return parentCategorySlug.trim();
  const slug = categorySlug?.trim();
  if (!slug) return null;

  const roots = hubOptions.filter((o) => o.depth !== 1);
  if (roots.some((r) => r.slug === slug)) return slug;

  let lastRoot: string | null = null;
  for (const opt of hubOptions) {
    if (opt.depth === 0) lastRoot = opt.slug;
    if (opt.slug === slug && lastRoot) return lastRoot;
  }

  return slug;
}
