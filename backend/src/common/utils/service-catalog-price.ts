import { Prisma } from '@prisma/client';

/**
 * Итоговая цена за единицу: база × (1 + наценка% / 100).
 * Наценка задаётся на категорию (группу); может быть отрицательной.
 */
export function serviceCatalogPriceWithMarkup(
  base: Prisma.Decimal | number | string | null | undefined,
  markupPercent: Prisma.Decimal | number | string | null | undefined,
): number {
  const b = new Prisma.Decimal(base ?? 0);
  const m = new Prisma.Decimal(markupPercent ?? 0);
  const factor = new Prisma.Decimal(1).add(m.div(100));
  const v = b.mul(factor);
  return Math.round(v.toNumber() * 100) / 100;
}
