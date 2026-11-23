/**
 * Прод-версия сида раздела «Натяжные потолки» (CommonJS, без ts-node).
 * Контент — в prisma/data/stretch-ceilings-section.json.
 *
 * Создаёт недостающее: настройки страницы (hero, калькулятор, этапы, FAQ),
 * производителей полотен (MSD/Bauf/Pongs/Descor/Cerutti), фактуры,
 * пункт меню «Натяжные потолки» → /stretch-ceilings и ссылку футера.
 * Существующие записи не трогает (правки админки сохраняются).
 * STRETCH_CEILINGS_FORCE=1 — обновить контент существующих
 * производителей/фактур из JSON (настройки страницы не перезаписывает).
 *
 * Usage:
 *   локально:  cd backend && node prisma/seed-stretch-ceilings.cjs
 *   Docker:    docker compose exec backend node prisma/seed-stretch-ceilings.cjs
 *   Docker c обновлением контента:
 *              docker compose exec -e STRETCH_CEILINGS_FORCE=1 backend node prisma/seed-stretch-ceilings.cjs
 *
 * Env: DATABASE_URL (обязательно на проде)
 */

const path = require('path');

// Порядок важен: сначала backend/.env (локальный localhost), затем корень репозитория.
// В Docker-контейнере переменные задаёт docker-compose, файла может не быть — это нормально.
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env') });

const { PrismaClient } = require('@prisma/client');
const data = require('./data/stretch-ceilings-section.json');

const FORCE = process.env.STRETCH_CEILINGS_FORCE === '1';
const prisma = new PrismaClient();

async function seedPageSettings() {
  const existing = await prisma.stretchCeilingsPageBlock.findUnique({ where: { id: 'main' } });
  if (existing) {
    console.log('ℹ️ Потолки: настройки страницы уже существуют — не трогаем (правки админки)');
    return;
  }
  await prisma.stretchCeilingsPageBlock.create({
    data: {
      id: 'main',
      title: data.settings.title,
      subtitle: data.settings.subtitle,
      description: data.settings.description,
      seoTitle: data.settings.seoTitle,
      seoDescription: data.settings.seoDescription,
      calcTitle: data.settings.calcTitle,
      calcNote: data.settings.calcNote,
      steps: data.settings.steps,
      faq: data.settings.faq,
    },
  });
  console.log('✅ Потолки: созданы настройки страницы (hero, калькулятор, этапы, FAQ)');
}

async function seedManufacturersWithFabrics() {
  let createdManufacturers = 0;
  let updatedManufacturers = 0;
  let createdFabrics = 0;
  let updatedFabrics = 0;

  for (const manufacturer of data.manufacturers) {
    const existingManufacturer = await prisma.ceilingManufacturer.findUnique({
      where: { slug: manufacturer.slug },
    });
    let manufacturerId = existingManufacturer && existingManufacturer.id;

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
      createdManufacturers += 1;
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
      updatedManufacturers += 1;
    }

    for (const fabric of manufacturer.fabrics) {
      const payload = {
        manufacturerId,
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
        createdFabrics += 1;
      } else if (FORCE) {
        await prisma.ceilingFabric.update({ where: { slug: fabric.slug }, data: payload });
        updatedFabrics += 1;
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

async function seedNavigationItem() {
  const existing = await prisma.navigationItem.findFirst({
    where: { name: 'Натяжные потолки' },
  });
  if (existing) {
    if (existing.href !== '/stretch-ceilings' || !existing.isActive) {
      await prisma.navigationItem.update({
        where: { id: existing.id },
        data: { href: '/stretch-ceilings', hasDropdown: false, isActive: true },
      });
      console.log(`✅ Потолки: пункт меню обновлён: ${existing.href} → /stretch-ceilings`);
    }
    return;
  }

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
  const anchor = all.find((n) => n.href === '/windows') || all.find((n) => n.name === 'Акции');
  let sortOrder = all.length;
  if (anchor) {
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
}

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
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL не задан (на проде передайте переменные окружения контейнера)');
  }
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
