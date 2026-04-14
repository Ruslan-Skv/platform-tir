/**
 * Полное заполнение каталога «Ремонт квартир»: 12 групп → подкатегории → позиции.
 *
 * Запуск из каталога backend:
 *   npm run prisma:seed-remont-kvartir
 * Подхватывается .env из backend/, затем из корня репозитория (если в проде .env только там).
 *
 * Полная замена каталога (удаляет все категории и позиции услуг, затем создаёт заново):
 *   REMONT_KVARTIR_RESEED=1 npx ts-node -r tsconfig-paths/register prisma/seed-remont-kvartir-catalog.ts
 *
 * Без REMONT_KVARTIR_RESEED: только upsert категорий и добавление недостающих позиций (идемпотентно).
 *
 * Важно: при наличии заказов, ссылающихся на позиции каталога, удаление может быть запрещено БД
 * — тогда не используйте REMONT_KVARTIR_RESEED=1 или сначала перенесите заказы.
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

import { REMONT_KVARTIR_GROUPS } from './remont-kvartir/groups';
import { normalizeUnit } from './remont-kvartir/normalize-unit';
import { slugifySegment } from './remont-kvartir/slugify';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });
// Монорепозиторий: часто единственный .env в корне проекта (не в backend/)
config({ path: path.join(__dirname, '..', '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL не задан. Добавьте его в .env в корне репозитория или в backend/.env, либо экспортируйте в окружение.',
  );
}
process.env.DATABASE_URL = databaseUrl;

const LEGACY_CATEGORY_SLUGS = [
  'painting',
  'electrical',
  'floors',
  'ceilings',
  'plumbing',
  'tiling',
  'door-installation',
  'window-installation',
  'stretch-ceiling-installation',
  'blinds-installation',
] as const;

async function removeLegacyFlatCategories(tx: Prisma.TransactionClient) {
  const legacy = await tx.serviceCatalogCategory.findMany({
    where: { slug: { in: [...LEGACY_CATEGORY_SLUGS] } },
    select: { id: true },
  });
  if (legacy.length === 0) return;

  const ids = legacy.map((c) => c.id);
  await tx.serviceCatalogItem.deleteMany({
    where: { categoryId: { in: ids } },
  });
  await tx.serviceCatalogCategory.deleteMany({
    where: { id: { in: ids } },
  });
  console.log(`🗑️ Удалены устаревшие плоские категории (демо): ${ids.length}`);
}

async function clearEntireServiceCatalog(tx: Prisma.TransactionClient) {
  const orderItems = await tx.serviceOrderItem.count();
  const orderLegacyItems = await tx.orderServiceItem.count();
  if (orderItems > 0 || orderLegacyItems > 0) {
    throw new Error(
      `Нельзя очистить каталог: есть заказы (service_order_items: ${orderItems}, order_service_items: ${orderLegacyItems}). ` +
        'Удалите или перенесите связанные заказы, либо не используйте REMONT_KVARTIR_RESEED=1.'
    );
  }

  await tx.serviceCatalogItem.deleteMany({});
  await tx.serviceCatalogCategory.deleteMany({
    where: { parentId: { not: null } },
  });
  await tx.serviceCatalogCategory.deleteMany({
    where: { parentId: null },
  });
  console.log('🗑️ Каталог услуг «Ремонт квартир» очищен (позиции и категории).');
}

function makeSubSlug(groupSlug: string, subIndex: number, subName: string): string {
  const base = `${groupSlug}-sub${subIndex}-${slugifySegment(subName)}`;
  return base.length > 96 ? base.slice(0, 96) : base;
}

export async function seedRemontKvartirCatalog(
  client: PrismaClient,
  options?: { fullReseed?: boolean; dropLegacyFlat?: boolean }
) {
  const fullReseed = options?.fullReseed ?? process.env.REMONT_KVARTIR_RESEED === '1';
  const dropLegacyFlat =
    options?.dropLegacyFlat ?? process.env.REMONT_KVARTIR_DROP_LEGACY === '1';

  await client.serviceCatalogBlock.upsert({
    where: { id: 'main' },
    update: { title: 'Ремонт квартир', showPricesInPublic: true },
    create: {
      id: 'main',
      title: 'Ремонт квартир',
      showPricesInPublic: true,
    },
  });

  await client.$transaction(async (tx) => {
    if (fullReseed) {
      await clearEntireServiceCatalog(tx);
    } else if (dropLegacyFlat) {
      await removeLegacyFlatCategories(tx);
    }

    for (let gi = 0; gi < REMONT_KVARTIR_GROUPS.length; gi++) {
      const g = REMONT_KVARTIR_GROUPS[gi];
      const groupSlug = g.slug;

      const root = await tx.serviceCatalogCategory.upsert({
        where: { slug: groupSlug },
        create: {
          name: g.name,
          slug: groupSlug,
          description: g.description ?? null,
          icon: g.icon,
          sortOrder: gi,
          isActive: true,
          showPricesInPublic: true,
          parentId: null,
        },
        update: {
          name: g.name,
          description: g.description ?? null,
          icon: g.icon,
          sortOrder: gi,
          isActive: true,
          showPricesInPublic: true,
          parentId: null,
        },
      });

      for (let si = 0; si < g.subcategories.length; si++) {
        const sub = g.subcategories[si];
        const subSlug = makeSubSlug(groupSlug, si, sub.name);

        const subCat = await tx.serviceCatalogCategory.upsert({
          where: { slug: subSlug },
          create: {
            name: sub.name,
            slug: subSlug,
            parentId: root.id,
            sortOrder: si,
            isActive: true,
            showPricesInPublic: true,
          },
          update: {
            name: sub.name,
            parentId: root.id,
            sortOrder: si,
            isActive: true,
            showPricesInPublic: true,
          },
        });

        for (let ii = 0; ii < sub.items.length; ii++) {
          const it = sub.items[ii];
          const unit = normalizeUnit(it.unit);
          const price = it.price !== undefined ? new Prisma.Decimal(it.price) : new Prisma.Decimal(0);

          const existing = await tx.serviceCatalogItem.findFirst({
            where: { categoryId: subCat.id, name: it.name },
          });

          if (!existing) {
            await tx.serviceCatalogItem.create({
              data: {
                categoryId: subCat.id,
                name: it.name,
                unit,
                price,
                sortOrder: ii,
                isActive: true,
              },
            });
          }
        }
      }
    }
  });

  const catCount = await client.serviceCatalogCategory.count();
  const itemCount = await client.serviceCatalogItem.count();
  console.log(`✅ Каталог «Ремонт квартир»: ${catCount} категорий, ${itemCount} позиций.`);
}

async function runCli() {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  try {
    await seedRemontKvartirCatalog(prisma, {
      fullReseed: process.env.REMONT_KVARTIR_RESEED === '1',
      dropLegacyFlat: process.env.REMONT_KVARTIR_DROP_LEGACY === '1',
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runCli().catch((e) => {
    console.error('❌ Ошибка seed-remont-kvartir-catalog:', e);
    process.exit(1);
  });
}
