import { Prisma, type PrismaClient } from '@prisma/client';

export type ServiceCatalogCategoryMarkupRow = {
  id: string;
  parentId: string | null;
  priceMarkupPercent: Prisma.Decimal;
};

type MarkupMap = Map<string, { parentId: string | null; priceMarkupPercent: Prisma.Decimal }>;

const ZERO = new Prisma.Decimal(0);

/**
 * Эффективная наценка для категории: собственное ненулевое `priceMarkupPercent` имеет приоритет,
 * иначе поднимаемся к родителю (0% у категории означает «наследовать у родителя»).
 */
export function effectiveServiceCatalogMarkupPercent(
  categoryId: string,
  byId: MarkupMap,
): Prisma.Decimal {
  let current: string | null = categoryId;
  for (let d = 0; d < 512 && current; d++) {
    const row = byId.get(current);
    if (!row) {
      return ZERO;
    }
    if (!row.priceMarkupPercent.equals(ZERO)) {
      return row.priceMarkupPercent;
    }
    current = row.parentId;
  }
  return ZERO;
}

/**
 * Подгружает категории и всех предков по цепочке parentId (для расчёта наследуемой наценки).
 */
export async function loadServiceCatalogCategoryMarkupMap(
  prisma: Pick<PrismaClient, 'serviceCatalogCategory'>,
  seedCategoryIds: string[],
): Promise<MarkupMap> {
  const map: MarkupMap = new Map();
  const pending = new Set(seedCategoryIds.filter((id) => typeof id === 'string' && id.length > 0));

  for (let depth = 0; depth < 512 && pending.size > 0; depth++) {
    const batch = [...pending];
    pending.clear();
    const rows = await prisma.serviceCatalogCategory.findMany({
      where: { id: { in: batch } },
      select: { id: true, parentId: true, priceMarkupPercent: true },
    });
    for (const r of rows) {
      map.set(r.id, r);
      if (r.parentId != null && !map.has(r.parentId)) {
        pending.add(r.parentId);
      }
    }
  }
  return map;
}

export function categoryRowsToMarkupMap(rows: ServiceCatalogCategoryMarkupRow[]): MarkupMap {
  return new Map(rows.map((r) => [r.id, r]));
}
