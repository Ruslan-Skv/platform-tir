import {
  Prisma,
  ServiceCatalogBlock,
  ServiceCatalogCategory,
  ServiceCatalogWorkGroup,
} from '@prisma/client';
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
  /** Группа работ (демонтаж/черновые/чистовые) — для группировки в расчётах; null — не задана. */
  workGroup?: ServiceCatalogWorkGroup | null;
  price?: number;
};

/** Преимущество hero-блока страницы «Ремонт квартир». */
export type PublicCatalogHeroNote = {
  icon: string | null;
  text: string;
};

/** Этап секции «Этапы работы». */
export type PublicCatalogStep = {
  title: string;
  description: string | null;
};

export type PublicCatalogBlock = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  heroImageUrl: string | null;
  heroNotes: PublicCatalogHeroNote[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
  steps: PublicCatalogStep[] | null;
  seoTextTitle: string | null;
  seoText: string | null;
  ctaTitle: string | null;
  ctaText: string | null;
  ctaBackgroundColor: string | null;
  ctaTextColor: string | null;
  ctaBackgroundImage: string | null;
  ctaBackgroundFit: string;
  ctaBackgroundImageOpacity: number;
  ctaShowButtons: boolean;
};

function mapHeroNotes(value: Prisma.JsonValue | null): PublicCatalogHeroNote[] | null {
  if (!Array.isArray(value)) return null;
  const notes = value.flatMap((entry): PublicCatalogHeroNote[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.text !== 'string' || record.text.trim() === '') return [];
    const icon =
      typeof record.icon === 'string' && record.icon.trim() !== '' ? record.icon.trim() : null;
    return [{ icon, text: record.text.trim() }];
  });
  return notes.length > 0 ? notes : null;
}

function mapSteps(value: Prisma.JsonValue | null): PublicCatalogStep[] | null {
  if (!Array.isArray(value)) return null;
  const steps = value.flatMap((entry): PublicCatalogStep[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.title !== 'string' || record.title.trim() === '') return [];
    return [
      {
        title: record.title.trim(),
        description: typeof record.description === 'string' ? record.description : null,
      },
    ];
  });
  return steps.length > 0 ? steps : null;
}

export function mapPublicCatalogBlock(block: ServiceCatalogBlock): PublicCatalogBlock {
  return {
    id: block.id,
    title: block.title,
    subtitle: block.subtitle,
    description: block.description,
    heroImageUrl: block.heroImageUrl,
    heroNotes: mapHeroNotes(block.heroNotes),
    seoTitle: block.seoTitle,
    seoDescription: block.seoDescription,
    steps: mapSteps(block.steps),
    seoTextTitle: block.seoTextTitle,
    seoText: block.seoText,
    ctaTitle: block.ctaTitle,
    ctaText: block.ctaText,
    ctaBackgroundColor: block.ctaBackgroundColor,
    ctaTextColor: block.ctaTextColor,
    ctaBackgroundImage: block.ctaBackgroundImage,
    ctaBackgroundFit: block.ctaBackgroundFit,
    ctaBackgroundImageOpacity: block.ctaBackgroundImageOpacity,
    ctaShowButtons: block.ctaShowButtons,
  };
}

export function mapPublicItems(
  showPrices: boolean,
  items: {
    id: string;
    name: string;
    description: string | null;
    unit: string;
    sortOrder: number;
    workGroup?: ServiceCatalogWorkGroup | null;
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
      workGroup: item.workGroup ?? null,
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
      iconDisabled: c.iconDisabled,
      countTextColor: c.countTextColor,
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
