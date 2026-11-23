/**
 * Наполнение раздела «Жалюзи»: настройки страницы (hero, калькулятор, этапы,
 * FAQ), категории изделий (рулонные, зебра, вертикальные, горизонтальные,
 * плиссе) и их системы. Контент — в prisma/data/blinds-section.json
 * (источники: kapri51.ru, foroom.ru, fis51.ru).
 *
 * Запуск из каталога backend:
 *   npm run prisma:seed-blinds-section
 *
 * Режимы:
 *   по умолчанию — только создаёт недостающее (категории/изделия/настройки),
 *                  существующие записи НЕ трогает (защита правок, сделанных в админке);
 *                  пункт меню при этом обновляет на /blinds;
 *   BLINDS_FORCE=1 — дополнительно обновляет контент существующих категорий
 *                  и изделий данными из JSON (настройки страницы
 *                  всё равно не перезаписывает).
 *
 * Идемпотентно: повторный запуск безопасен.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

import data from './data/blinds-section.json';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });
// Монорепозиторий: часто единственный .env в корне проекта (не в backend/)
config({ path: path.join(__dirname, '..', '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL не задан (см. backend/.env)');
}

const FORCE = process.env.BLINDS_FORCE === '1';

const prisma = new PrismaClient();

type SeedProduct = {
  slug: string;
  name: string;
  tagline: string | null;
  videoUrl?: string | null;
  description: string;
  mountType: string | null;
  material: string | null;
  controlType: string | null;
  priceFrom: number | null;
  advantages: string[];
  characteristics: { label: string; value: string }[];
  badge: string | null;
  sortOrder: number;
};

type SeedCategory = {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  products: SeedProduct[];
};

const { settings: seedSettings, categories } = data as {
  settings: {
    title: string;
    subtitle: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
    calcTitle: string;
    calcNote: string;
    steps: { title: string; description: string }[];
    faq: { question: string; answer: string }[];
  };
  categories: SeedCategory[];
};

async function seedPageSettings() {
  const existing = await prisma.blindsPageBlock.findUnique({
    where: { id: 'main' },
  });
  if (existing) {
    console.log('ℹ️ Жалюзи: настройки страницы уже существуют — не трогаем (правки админки)');
    return;
  }
  await prisma.blindsPageBlock.create({
    data: {
      id: 'main',
      title: seedSettings.title,
      subtitle: seedSettings.subtitle,
      description: seedSettings.description,
      seoTitle: seedSettings.seoTitle,
      seoDescription: seedSettings.seoDescription,
      calcTitle: seedSettings.calcTitle,
      calcNote: seedSettings.calcNote,
      steps: seedSettings.steps,
      faq: seedSettings.faq,
    },
  });
  console.log('✅ Жалюзи: созданы настройки страницы (hero, калькулятор, этапы, FAQ)');
}

async function seedCategoriesWithProducts() {
  let createdCategories = 0;
  let updatedCategories = 0;
  let createdProducts = 0;
  let updatedProducts = 0;

  for (const category of categories) {
    const existingCategory = await prisma.blindsCategory.findUnique({
      where: { slug: category.slug },
    });
    let categoryId = existingCategory?.id;

    if (!existingCategory) {
      categoryId = (
        await prisma.blindsCategory.create({
          data: {
            name: category.name,
            slug: category.slug,
            description: category.description,
            sortOrder: category.sortOrder,
          },
        })
      ).id;
      createdCategories++;
    } else if (FORCE) {
      await prisma.blindsCategory.update({
        where: { id: categoryId },
        data: {
          name: category.name,
          description: category.description,
          sortOrder: category.sortOrder,
        },
      });
      updatedCategories++;
    }

    for (const product of category.products) {
      const payload = {
        categoryId: categoryId!,
        slug: product.slug,
        name: product.name,
        tagline: product.tagline,
        videoUrl: product.videoUrl ?? null,
        description: product.description,
        mountType: product.mountType,
        material: product.material,
        controlType: product.controlType,
        priceFrom: product.priceFrom,
        characteristics: product.characteristics,
        advantages: product.advantages,
        badge: product.badge,
        sortOrder: product.sortOrder,
      };
      const existingProduct = await prisma.blindsProduct.findUnique({
        where: { slug: product.slug },
      });
      if (!existingProduct) {
        await prisma.blindsProduct.create({ data: payload });
        createdProducts++;
      } else if (FORCE) {
        await prisma.blindsProduct.update({ where: { slug: product.slug }, data: payload });
        updatedProducts++;
      }
    }
    console.log(
      `✅ Жалюзи: категория ${category.name} — изделий: ${category.products.length}` +
        (FORCE ? '' : ' (существующие записи не менялись)')
    );
  }

  console.log(
    `📊 Жалюзи: создано категорий ${createdCategories}, изделий ${createdProducts}` +
      (FORCE
        ? `, обновлено категорий ${updatedCategories}, изделий ${updatedProducts}`
        : '')
  );
}

/** Пункт меню «Жалюзи» верхнего уровня ведёт на раздел /blinds. */
async function seedNavigationItem() {
  const existing = await prisma.navigationItem.findFirst({
    where: { name: 'Жалюзи' },
  });
  if (!existing) {
    const all = await prisma.navigationItem.findMany({ orderBy: { sortOrder: 'asc' } });
    // Ставим после «Натяжные потолки» или «Окна» (что найдётся), иначе перед «Акции»
    const anchor =
      all.find((n) => n.href === '/stretch-ceilings') ??
      all.find((n) => n.href === '/windows') ??
      all.find((n) => n.name === 'Акции');
    let sortOrder = all.length;
    if (anchor) {
      await prisma.navigationItem.updateMany({
        where: { sortOrder: { gt: anchor.sortOrder } },
        data: { sortOrder: { increment: 1 } },
      });
      sortOrder = anchor.sortOrder + 1;
    }
    await prisma.navigationItem.create({
      data: { name: 'Жалюзи', href: '/blinds', hasDropdown: false, sortOrder },
    });
    console.log('✅ Жалюзи: добавлен пункт меню «Жалюзи» → /blinds');
    return;
  }
  if (existing.href !== '/blinds' || !existing.isActive) {
    await prisma.navigationItem.update({
      where: { id: existing.id },
      data: { href: '/blinds', hasDropdown: false, isActive: true },
    });
    console.log(`✅ Жалюзи: пункт меню обновлён: ${existing.href} → /blinds`);
  }
}

/** Ссылка «Жалюзи» в футере ведёт на раздел /blinds. */
async function seedFooterLink() {
  const links = await prisma.footerSectionLink.findMany({
    where: { name: 'Жалюзи' },
  });
  for (const link of links) {
    if (link.href !== '/blinds') {
      await prisma.footerSectionLink.update({
        where: { id: link.id },
        data: { href: '/blinds' },
      });
      console.log(`✅ Жалюзи: ссылка футера «${link.name}» обновлена: ${link.href} → /blinds`);
    }
  }
}

async function main() {
  console.log(
    FORCE
      ? '⚡ Режим: BLINDS_FORCE=1 (обновление контента)'
      : '🛡️ Режим: только недостающее (правки админки не трогаем)'
  );
  await seedPageSettings();
  await seedCategoriesWithProducts();
  await seedNavigationItem();
  await seedFooterLink();
  const [categoryCount, productCount] = await Promise.all([
    prisma.blindsCategory.count(),
    prisma.blindsProduct.count(),
  ]);
  console.log(`✅ Жалюзи: итого в БД категорий ${categoryCount}, изделий ${productCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
