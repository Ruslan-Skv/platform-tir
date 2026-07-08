/**
 * Миграция legacy ProductComponent → ComponentCatalogItem + catalogItemId.
 * Запуск: npx ts-node -r tsconfig-paths/register scripts/migrate-product-components-to-catalog.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  defaultKitQuantity,
  defaultQuantityStep,
  inferComponentKind,
} from '../src/products/utils/component-catalog-resolve.util';

const prisma = new PrismaClient();

function catalogKey(name: string, size: string | null, color: string | null, material: string | null) {
  return [name.trim().toLowerCase(), (size ?? '').trim().toLowerCase(), (color ?? '').trim().toLowerCase(), (material ?? '').trim().toLowerCase()].join('|');
}

async function ensureSlug(base: string, used: Set<string>): Promise<string> {
  const normalized = base
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  let slug = normalized || 'component';
  let n = 0;
  while (used.has(slug) || (await prisma.componentCatalogItem.findUnique({ where: { slug } }))) {
    n += 1;
    slug = `${normalized || 'component'}-${n}`;
  }
  used.add(slug);
  return slug;
}

async function main() {
  const components = await prisma.productComponent.findMany({
    where: { catalogItemId: null },
    orderBy: { createdAt: 'asc' },
  });

  const catalogByKey = new Map<string, string>();
  const existingCatalog = await prisma.componentCatalogItem.findMany();
  for (const row of existingCatalog) {
    catalogByKey.set(catalogKey(row.name, row.size, row.color, row.material), row.id);
  }

  const usedSlugs = new Set(existingCatalog.map((r) => r.slug));
  let created = 0;
  let linked = 0;

  for (const pc of components) {
    const size = pc.type?.trim() || null;
    const key = catalogKey(pc.name, size, null, null);
    let catalogId = catalogByKey.get(key);

    if (!catalogId) {
      const kind = inferComponentKind(pc.name, pc.type);
      const slug = await ensureSlug([pc.name, size].filter(Boolean).join('-'), usedSlugs);
      const catalog = await prisma.componentCatalogItem.create({
        data: {
          kind,
          name: pc.name.trim(),
          size,
          price: pc.price,
          slug,
          image: pc.image,
          stock: pc.stock,
          isActive: true,
          sortOrder: pc.sortOrder,
          kitQuantity: defaultKitQuantity(kind),
          quantityStep: defaultQuantityStep(kind),
        },
      });
      catalogId = catalog.id;
      catalogByKey.set(key, catalogId);
      created += 1;
    }

    await prisma.productComponent.update({
      where: { id: pc.id },
      data: { catalogItemId: catalogId },
    });
    linked += 1;
  }

  console.log(`Готово: создано ${created} позиций справочника, привязано ${linked} комплектующих товаров.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
