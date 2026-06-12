import { Prisma, ServiceCatalogCategory } from '@prisma/client';
import { serviceCatalogPriceWithMarkup } from '../../common/utils/service-catalog-price';
import {
  categoryRowsToMarkupMap,
  effectiveServiceCatalogMarkupPercent,
} from '../../common/utils/service-catalog-markup-effective';

export type CategoryWithIncludes = ServiceCatalogCategory & {
  items: { price: Prisma.Decimal; [key: string]: unknown }[];
  _count: { items: number };
};

export type CategoryTreeNode = CategoryWithIncludes & { children: CategoryTreeNode[] };

export type MarkupById = ReturnType<typeof categoryRowsToMarkupMap>;

export function buildCategoryTree(flat: CategoryWithIncludes[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>();
  for (const c of flat) {
    map.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryTreeNode[] = [];
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: CategoryTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

export function countActiveItemsInCategorySubtree(node: CategoryTreeNode): number {
  let n = node.items?.length ?? 0;
  for (const ch of node.children ?? []) {
    n += countActiveItemsInCategorySubtree(ch);
  }
  return n;
}

export type PublicCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  sortOrder: number;
  price?: number;
};

export function mapPublicItems(
  showPrices: boolean,
  items: {
    id: string;
    name: string;
    description: string | null;
    unit: string;
    sortOrder: number;
    price: Prisma.Decimal;
  }[],
  categoryMarkupPercent: Prisma.Decimal,
): PublicCatalogItem[] {
  return items.map((item) => {
    const base = {
      id: item.id,
      name: item.name,
      description: item.description,
      unit: item.unit,
      sortOrder: item.sortOrder,
    };
    if (showPrices) {
      return {
        ...base,
        price: serviceCatalogPriceWithMarkup(item.price, categoryMarkupPercent),
      };
    }
    return base;
  });
}

export function mapPublicCategoryTree(
  nodes: CategoryTreeNode[],
  markupById: MarkupById,
): Record<string, unknown>[] {
  return nodes.map((c) => {
    const childMaps = mapPublicCategoryTree(c.children, markupById);
    const effectiveMarkup = effectiveServiceCatalogMarkupPercent(c.id, markupById);
    const ownItems = mapPublicItems(
      c.showPricesInPublic,
      c.items as Parameters<typeof mapPublicItems>[1],
      effectiveMarkup,
    );
    const childTotal = childMaps.reduce(
      (s, ch) => s + (typeof ch.totalWorkTypes === 'number' ? ch.totalWorkTypes : 0),
      0,
    );
    const totalWorkTypes = ownItems.length + childTotal;
    const out: Record<string, unknown> = {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      image: c.image,
      cardBackgroundImage: c.cardBackgroundImage,
      cardBackgroundTransparent: c.cardBackgroundTransparent,
      showPricesInPublic: c.showPricesInPublic,
      items: ownItems,
      totalWorkTypes,
    };
    if (childMaps.length > 0) {
      out.children = childMaps;
    }
    return out;
  });
}
