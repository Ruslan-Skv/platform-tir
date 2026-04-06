/**
 * Заполняет справочник бэйджей карточки товара (идемпотентно, upsert по key).
 * Нужен на проде после migrate deploy — полный prisma/seed.ts там обычно не запускают.
 *
 * Usage (локально):
 *   cd backend && node prisma/seed-product-card-badges.cjs
 *
 * Docker:
 *   docker compose exec backend node prisma/seed-product-card-badges.cjs
 *
 * Env: DATABASE_URL (обязательно на проде)
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');
const rows = require('./data/product-card-badge-definitions.json');

const prisma = new PrismaClient();

async function main() {
  for (const row of rows) {
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
  console.log(`✅ Product card badges: upsert ${rows.length} definitions (key + label + sortOrder).`);
  console.log('   Дальше: админка → Настройки → Бэйджи карточек — загрузите JPEG для каждого бэйджа.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
