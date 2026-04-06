/**
 * Локальная разработка: заполнить только справочник бэйджей карточки товара.
 * npm run prisma:seed-product-card-badges
 */
import { PrismaClient } from '@prisma/client';

import { seedProductCardBadges } from './seed-product-card-badges';

const prisma = new PrismaClient();

seedProductCardBadges(prisma)
  .then(() => {
    console.log('✅ Готово. На проде используйте: node prisma/seed-product-card-badges.cjs');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
