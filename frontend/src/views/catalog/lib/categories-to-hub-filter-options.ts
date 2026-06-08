import type { CategoryFilterOption } from '@/views/catalog/lib/buildCategoryFilterOptions';

/** Минимальная форма ответа GET /categories для хаба каталога */
export interface CatalogHubCategoryNode {
  name: string;
  slug: string;
  isActive?: boolean;
  children?: CatalogHubCategoryNode[];
  _count?: {
    products?: number;
    totalProducts?: number;
  };
}

function categoryProductCount(node: CatalogHubCategoryNode): number {
  return node._count?.totalProducts ?? node._count?.products ?? 0;
}

/** Опции фильтра «Категории» на хабе /catalog/products (?branch=). */
export function categoriesToHubFilterOptions(
  categories: CatalogHubCategoryNode[]
): CategoryFilterOption[] {
  const out: CategoryFilterOption[] = [];

  for (const root of categories) {
    if (root.isActive === false) continue;
    const rootCount = categoryProductCount(root);
    const activeChildren = (root.children ?? []).filter((c) => c.isActive !== false);
    const childrenWithProducts = activeChildren.filter((c) => categoryProductCount(c) > 0);

    if (rootCount <= 0 && childrenWithProducts.length === 0) continue;

    out.push({
      slug: root.slug,
      label: root.name,
      count: rootCount,
      depth: 0,
    });

    for (const child of childrenWithProducts) {
      out.push({
        slug: child.slug,
        label: child.name,
        count: categoryProductCount(child),
        depth: 1,
      });
    }
  }

  return out;
}
