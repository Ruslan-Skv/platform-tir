/**
 * Наполнение раздела «Мебель»: настройки страницы (hero, калькулятор, материалы,
 * этапы, FAQ), категории изделий (кухни, шкафы-купе, гардеробные, прихожие,
 * детская, мебель для ванной) и их изделия. Контент — в prisma/data/furniture-section.json
 * (источники лучших практик: shkaf-kupe.ru, kuhni-smart.ru, deshevaya-mebel.ru).
 *
 * Запуск из каталога backend:
 *   npm run prisma:seed-furniture-section
 *
 * Режимы:
 *   по умолчанию — только создаёт недостающее (категории/изделия/настройки),
 *                  существующие записи НЕ трогает (защита правок, сделанных в админке);
 *                  пункт меню при этом обновляет на /furniture;
 *   FURNITURE_FORCE=1 — дополнительно обновляет контент существующих категорий
 *                  и изделий данными из JSON (настройки страницы
 *                  всё равно не перезаписывает).
 *
 * Идемпотентно: повторный запуск безопасен.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

import data from './data/furniture-section.json';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });
// Монорепозиторий: часто единственный .env в корне проекта (не в backend/)
config({ path: path.join(__dirname, '..', '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL не задан (см. backend/.env)');
}

const FORCE = process.env.FURNITURE_FORCE === '1';

const prisma = new PrismaClient();

type SeedProduct = {
  slug: string;
  name: string;
  tagline: string | null;
  videoUrl?: string | null;
  description: string;
  configuration: string | null;
  facadeMaterial: string | null;
  hardware: string | null;
  priceFrom: number | null;
  priceUnit: string | null;
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
    materialsTitle: string;
    materials: { name: string; description: string }[];
    steps: { title: string; description: string }[];
    faq: { question: string; answer: string }[];
  };
  categories: SeedCategory[];
};

async function seedPageSettings() {
  const existing = await prisma.furniturePageBlock.findUnique({
    where: { id: 'main' },
  });
  if (existing) {
    console.log('ℹ️ Мебель: настройки страницы уже существуют — не трогаем (правки админки)');
    return;
  }
  await prisma.furniturePageBlock.create({
    data: {
      id: 'main',
      title: seedSettings.title,
      subtitle: seedSettings.subtitle,
      description: seedSettings.description,
      seoTitle: seedSettings.seoTitle,
      seoDescription: seedSettings.seoDescription,
      calcTitle: seedSettings.calcTitle,
      calcNote: seedSettings.calcNote,
      materialsTitle: seedSettings.materialsTitle,
      materials: seedSettings.materials,
      steps: seedSettings.steps,
      faq: seedSettings.faq,
    },
  });
  console.log('✅ Мебель: созданы настройки страницы (hero, калькулятор, материалы, этапы, FAQ)');
}

async function seedCategoriesWithProducts() {
  let createdCategories = 0;
  let updatedCategories = 0;
  let createdProducts = 0;
  let updatedProducts = 0;

  for (const category of categories) {
    const existingCategory = await prisma.furnitureCategory.findUnique({
      where: { slug: category.slug },
    });
    let categoryId = existingCategory?.id;

    if (!existingCategory) {
      categoryId = (
        await prisma.furnitureCategory.create({
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
      await prisma.furnitureCategory.update({
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
        configuration: product.configuration,
        facadeMaterial: product.facadeMaterial,
        hardware: product.hardware,
        priceFrom: product.priceFrom,
        priceUnit: product.priceUnit,
        characteristics: product.characteristics,
        advantages: product.advantages,
        badge: product.badge,
        sortOrder: product.sortOrder,
      };
      const existingProduct = await prisma.furnitureProduct.findUnique({
        where: { slug: product.slug },
      });
      if (!existingProduct) {
        await prisma.furnitureProduct.create({ data: payload });
        createdProducts++;
      } else if (FORCE) {
        await prisma.furnitureProduct.update({ where: { slug: product.slug }, data: payload });
        updatedProducts++;
      }
    }
    console.log(
      `✅ Мебель: категория ${category.name} — изделий: ${category.products.length}` +
        (FORCE ? '' : ' (существующие записи не менялись)')
    );
  }

  console.log(
    `📊 Мебель: создано категорий ${createdCategories}, изделий ${createdProducts}` +
      (FORCE
        ? `, обновлено категорий ${updatedCategories}, изделий ${updatedProducts}`
        : '')
  );
}

/**
 * Пункт меню «Мебель на заказ» верхнего уровня ведёт на раздел /furniture
 * (раньше — на каталог товаров /catalog/products/custom-furniture).
 */
async function seedNavigationItem() {
  const existing = await prisma.navigationItem.findFirst({
    where: {
      OR: [
        { name: 'Мебель на заказ' },
        { name: 'Мебель' },
        { href: '/catalog/products/custom-furniture' },
      ],
    },
    orderBy: { sortOrder: 'asc' },
  });
  if (!existing) {
    const all = await prisma.navigationItem.findMany({ orderBy: { sortOrder: 'asc' } });
    // Ставим после «Жалюзи» (что найдётся), иначе перед «Акции»
    const anchor = all.find((n) => n.href === '/blinds') ?? all.find((n) => n.name === 'Акции');
    let sortOrder = all.length;
    if (anchor) {
      await prisma.navigationItem.updateMany({
        where: { sortOrder: { gt: anchor.sortOrder } },
        data: { sortOrder: { increment: 1 } },
      });
      sortOrder = anchor.sortOrder + 1;
    }
    await prisma.navigationItem.create({
      data: { name: 'Мебель на заказ', href: '/furniture', hasDropdown: false, sortOrder },
    });
    console.log('✅ Мебель: добавлен пункт меню «Мебель на заказ» → /furniture');
    return;
  }
  if (existing.href !== '/furniture' || !existing.isActive) {
    await prisma.navigationItem.update({
      where: { id: existing.id },
      data: { href: '/furniture', hasDropdown: false, isActive: true },
    });
    console.log(`✅ Мебель: пункт меню обновлён: ${existing.href} → /furniture`);
  }
}

/** Ссылка «Мебель» в футере ведёт на раздел /furniture. */
async function seedFooterLink() {
  const links = await prisma.footerSectionLink.findMany({
    where: { name: 'Мебель' },
  });
  for (const link of links) {
    if (link.href !== '/furniture') {
      await prisma.footerSectionLink.update({
        where: { id: link.id },
        data: { href: '/furniture' },
      });
      console.log(`✅ Мебель: ссылка футера «${link.name}» обновлена: ${link.href} → /furniture`);
    }
  }
}

async function main() {
  console.log(
    FORCE
      ? '⚡ Режим: FURNITURE_FORCE=1 (обновление контента)'
      : '🛡️ Режим: только недостающее (правки админки не трогаем)'
  );
  await seedPageSettings();
  await seedCategoriesWithProducts();
  await seedNavigationItem();
  await seedFooterLink();
  const [categoryCount, productCount] = await Promise.all([
    prisma.furnitureCategory.count(),
    prisma.furnitureProduct.count(),
  ]);
  console.log(`✅ Мебель: итого в БД категорий ${categoryCount}, изделий ${productCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
