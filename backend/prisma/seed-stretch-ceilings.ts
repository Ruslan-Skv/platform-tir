/**
 * Наполнение раздела «Натяжные потолки»: настройки страницы (hero, калькулятор,
 * этапы, FAQ), производители полотен (MSD, Bauf, Pongs, Descor, Cerutti)
 * и их фактуры. Контент — в prisma/data/stretch-ceilings-section.json
 * (источники: 5element-potolki.ru, натяжные-потолки24.рф, fis51.ru).
 *
 * Запуск из каталога backend:
 *   npm run prisma:seed-stretch-ceilings-section
 *
 * Режимы:
 *   по умолчанию — только создаёт недостающее (производители/фактуры/настройки),
 *                  существующие записи НЕ трогает (защита правок, сделанных в админке);
 *                  пункты меню/футера при этом обновляет на /stretch-ceilings;
 *   STRETCH_CEILINGS_FORCE=1 — дополнительно обновляет контент существующих
 *                  производителей и фактур данными из JSON (настройки страницы
 *                  всё равно не перезаписывает).
 *
 * Идемпотентно: повторный запуск безопасен.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

import data from './data/stretch-ceilings-section.json';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });
// Монорепозиторий: часто единственный .env в корне проекта (не в backend/)
config({ path: path.join(__dirname, '..', '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL не задан (см. backend/.env)');
}

const FORCE = process.env.STRETCH_CEILINGS_FORCE === '1';

const prisma = new PrismaClient();

type SeedFabric = {
  slug: string;
  name: string;
  textureType: string | null;
  tagline: string | null;
  videoUrl?: string | null;
  description: string;
  width: string | null;
  priceFrom: number | null;
  advantages: string[];
  characteristics: { label: string; value: string }[];
  badge: string | null;
  sortOrder: number;
};

type SeedManufacturer = {
  slug: string;
  name: string;
  country: string | null;
  description: string;
  sortOrder: number;
  fabrics: SeedFabric[];
};

const { settings: seedSettings, manufacturers } = data as {
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
  manufacturers: SeedManufacturer[];
};

async function seedPageSettings() {
  const existing = await prisma.stretchCeilingsPageBlock.findUnique({
    where: { id: 'main' },
  });
  if (existing) {
    console.log('ℹ️ Потолки: настройки страницы уже существуют — не трогаем (правки админки)');
    return;
  }
  await prisma.stretchCeilingsPageBlock.create({
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
  console.log('✅ Потолки: созданы настройки страницы (hero, калькулятор, этапы, FAQ)');
}

async function seedManufacturersWithFabrics() {
  let createdManufacturers = 0;
  let updatedManufacturers = 0;
  let createdFabrics = 0;
  let updatedFabrics = 0;

  for (const manufacturer of manufacturers) {
    const existingManufacturer = await prisma.ceilingManufacturer.findUnique({
      where: { slug: manufacturer.slug },
    });
    let manufacturerId = existingManufacturer?.id;

    if (!existingManufacturer) {
      manufacturerId = (
        await prisma.ceilingManufacturer.create({
          data: {
            name: manufacturer.name,
            slug: manufacturer.slug,
            country: manufacturer.country,
            description: manufacturer.description,
            sortOrder: manufacturer.sortOrder,
          },
        })
      ).id;
      createdManufacturers++;
    } else if (FORCE) {
      await prisma.ceilingManufacturer.update({
        where: { id: manufacturerId },
        data: {
          name: manufacturer.name,
          country: manufacturer.country,
          description: manufacturer.description,
          sortOrder: manufacturer.sortOrder,
        },
      });
      updatedManufacturers++;
    }

    for (const fabric of manufacturer.fabrics) {
      const payload = {
        manufacturerId: manufacturerId!,
        slug: fabric.slug,
        name: fabric.name,
        textureType: fabric.textureType,
        tagline: fabric.tagline,
        videoUrl: fabric.videoUrl ?? null,
        description: fabric.description,
        width: fabric.width,
        priceFrom: fabric.priceFrom,
        characteristics: fabric.characteristics,
        advantages: fabric.advantages,
        badge: fabric.badge,
        sortOrder: fabric.sortOrder,
      };
      const existingFabric = await prisma.ceilingFabric.findUnique({
        where: { slug: fabric.slug },
      });
      if (!existingFabric) {
        await prisma.ceilingFabric.create({ data: payload });
        createdFabrics++;
      } else if (FORCE) {
        await prisma.ceilingFabric.update({ where: { slug: fabric.slug }, data: payload });
        updatedFabrics++;
      }
    }
    console.log(
      `✅ Потолки: производитель ${manufacturer.name} — фактур: ${manufacturer.fabrics.length}` +
        (FORCE ? '' : ' (существующие записи не менялись)')
    );
  }

  console.log(
    `📊 Потолки: создано производителей ${createdManufacturers}, фактур ${createdFabrics}` +
      (FORCE
        ? `, обновлено производителей ${updatedManufacturers}, фактур ${updatedFabrics}`
        : '')
  );
}

/** Пункт меню «Натяжные потолки» верхнего уровня ведёт на раздел /stretch-ceilings. */
async function seedNavigationItem() {
  const existing = await prisma.navigationItem.findFirst({
    where: { name: 'Натяжные потолки' },
  });
  if (!existing) {
    // Возможно, пункт назван «Потолки»
    const alt = await prisma.navigationItem.findFirst({ where: { name: 'Потолки' } });
    if (alt) {
      await prisma.navigationItem.update({
        where: { id: alt.id },
        data: { name: 'Натяжные потолки', href: '/stretch-ceilings', hasDropdown: false, isActive: true },
      });
      console.log('✅ Потолки: пункт меню «Потолки» переименован и ведёт на /stretch-ceilings');
      return;
    }
    const all = await prisma.navigationItem.findMany({ orderBy: { sortOrder: 'asc' } });
    const anchor = all.find((n) => n.href === '/windows') ?? all.find((n) => n.name === 'Акции');
    let sortOrder = all.length;
    if (anchor) {
      // Ставим сразу после «Окна» (или перед «Акции»)
      await prisma.navigationItem.updateMany({
        where: { sortOrder: { gt: anchor.sortOrder } },
        data: { sortOrder: { increment: 1 } },
      });
      sortOrder = anchor.sortOrder + 1;
    }
    await prisma.navigationItem.create({
      data: { name: 'Натяжные потолки', href: '/stretch-ceilings', hasDropdown: false, sortOrder },
    });
    console.log('✅ Потолки: добавлен пункт меню «Натяжные потолки» → /stretch-ceilings');
    return;
  }
  if (existing.href !== '/stretch-ceilings' || !existing.isActive) {
    await prisma.navigationItem.update({
      where: { id: existing.id },
      data: { href: '/stretch-ceilings', hasDropdown: false, isActive: true },
    });
    console.log(`✅ Потолки: пункт меню обновлён: ${existing.href} → /stretch-ceilings`);
  }
}

/** Ссылка «Потолки»/«Натяжные потолки» в футере ведёт на раздел (чинит битый /ceilings). */
async function seedFooterLink() {
  const links = await prisma.footerSectionLink.findMany({
    where: { name: { in: ['Потолки', 'Натяжные потолки'] } },
  });
  for (const link of links) {
    if (link.href !== '/stretch-ceilings') {
      await prisma.footerSectionLink.update({
        where: { id: link.id },
        data: { href: '/stretch-ceilings' },
      });
      console.log(`✅ Потолки: ссылка футера «${link.name}» обновлена: ${link.href} → /stretch-ceilings`);
    }
  }
}

async function main() {
  console.log(
    FORCE
      ? '⚡ Режим: STRETCH_CEILINGS_FORCE=1 (обновление контента)'
      : '🛡️ Режим: только недостающее (правки админки не трогаем)'
  );
  await seedPageSettings();
  await seedManufacturersWithFabrics();
  await seedNavigationItem();
  await seedFooterLink();
  const [manufacturerCount, fabricCount] = await Promise.all([
    prisma.ceilingManufacturer.count(),
    prisma.ceilingFabric.count(),
  ]);
  console.log(
    `✅ Потолки: итого в БД производителей ${manufacturerCount}, фактур ${fabricCount}`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
