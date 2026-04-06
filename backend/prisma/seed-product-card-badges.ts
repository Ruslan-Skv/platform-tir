import type { PrismaClient } from '@prisma/client';

import rows from './data/product-card-badge-definitions.json';

/** Фиксированный список бэйджей (слева от фото). Картинки загружаются в админке. */
export const PRODUCT_CARD_BADGE_ROWS: ReadonlyArray<{
  key: string;
  label: string;
  sortOrder: number;
}> = rows;

export async function seedProductCardBadges(prisma: PrismaClient): Promise<void> {
  for (const row of PRODUCT_CARD_BADGE_ROWS) {
    await prisma.productCardBadgeDefinition.upsert({
      where: { key: row.key },
      create: {
        key: row.key,
        label: row.label,
        sortOrder: row.sortOrder,
      },
      update: {
        label: row.label,
        sortOrder: row.sortOrder,
      },
    });
  }
}
