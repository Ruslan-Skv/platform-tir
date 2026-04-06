import type { PrismaClient } from '@prisma/client';

/** Фиксированный список бэйджей (слева от фото). Картинки загружаются в админке. */
export const PRODUCT_CARD_BADGE_ROWS: ReadonlyArray<{ key: string; label: string; sortOrder: number }> =
  [
    { key: 'eco_high', label: 'Высокая экологичность', sortOrder: 1 },
    { key: 'safety_high', label: 'Высокий уровень безопасности', sortOrder: 2 },
    { key: 'quality_guarantee', label: 'Гарантия качества', sortOrder: 3 },
    { key: 'warm_door', label: 'Тёплая дверь', sortOrder: 4 },
    { key: 'seal_double', label: 'Двойной контур уплотнения', sortOrder: 5 },
    { key: 'seal_triple', label: 'Тройной контур уплотнения', sortOrder: 6 },
    { key: 'magnetic_seal', label: 'Магнитный уплотнитель', sortOrder: 7 },
    { key: 'telescopic_trim', label: 'Телескопический погонаж', sortOrder: 8 },
    { key: 'thick_leaf_40', label: 'Толстое полотно (40мм)', sortOrder: 9 },
    { key: 'thick_door_80', label: 'Толстая дверь (>80мм)', sortOrder: 10 },
    { key: 'thick_door_90', label: 'Толстая дверь (>90мм)', sortOrder: 11 },
    { key: 'thick_door_100', label: 'Толстая дверь (>100мм)', sortOrder: 12 },
    { key: 'thick_door_110', label: 'Толстая дверь (>110мм)', sortOrder: 13 },
    { key: 'heavy_door_20', label: 'Тяжёлая дверь (>20кг)', sortOrder: 14 },
    { key: 'heavy_door_25', label: 'Тяжёлая дверь (>25кг)', sortOrder: 15 },
    { key: 'heavy_door_80', label: 'Тяжёлая дверь (>80кг)', sortOrder: 16 },
    { key: 'heavy_door_90', label: 'Тяжёлая дверь (>90кг)', sortOrder: 17 },
    { key: 'heavy_door_100', label: 'Тяжёлая дверь (>100кг)', sortOrder: 18 },
    { key: 'heavy_door_110', label: 'Тяжёлая дверь (>110кг)', sortOrder: 19 },
    { key: 'lock_class_3', label: 'Класс замка 3', sortOrder: 20 },
    { key: 'lock_class_4', label: 'Класс замка 4', sortOrder: 21 },
    { key: 'sales_hit', label: 'Хит продаж', sortOrder: 22 },
    { key: 'noise_insulation', label: 'Высокий уровень шумоизоляции', sortOrder: 23 },
    { key: 'novelty_badge', label: 'Новинка', sortOrder: 24 },
  ];

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
