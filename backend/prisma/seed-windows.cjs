/**
 * Прод-версия сида раздела «Окна» (CommonJS, без ts-node).
 * Контент — в prisma/data/windows-section.json.
 *
 * Создаёт недостающее: настройки страницы, бренды (REHAU/VEKA/WHS),
 * профильные системы, пункт меню «Окна» → /windows.
 * Существующие записи не трогает (правки админки сохраняются).
 * WINDOWS_SECTION_FORCE=1 — обновить контент существующих брендов/систем из JSON.
 *
 * Usage:
 *   локально:  cd backend && node prisma/seed-windows.cjs
 *   Docker:    docker compose exec backend node prisma/seed-windows.cjs
 *   Docker c обновлением контента:
 *              docker compose exec -e WINDOWS_SECTION_FORCE=1 backend node prisma/seed-windows.cjs
 *
 * Env: DATABASE_URL (обязательно на проде)
 */

const path = require('path');

// Порядок важен: сначала backend/.env (локальный localhost), затем корень репозитория.
// В Docker-контейнере переменные задаёт docker-compose, файла может не быть — это нормально.
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env') });

const { PrismaClient } = require('@prisma/client');
const data = require('./data/windows-section.json');

const FORCE = process.env.WINDOWS_SECTION_FORCE === '1';
const prisma = new PrismaClient();

async function seedPageSettings() {
  const existing = await prisma.windowsPageBlock.findUnique({ where: { id: 'main' } });
  if (existing) {
    console.log('ℹ️ Окна: настройки страницы уже существуют — не трогаем (правки админки)');
    return;
  }
  await prisma.windowsPageBlock.create({
    data: {
      id: 'main',
      title: data.settings.title,
      subtitle: data.settings.subtitle,
      description: data.settings.description,
      seoTitle: data.settings.seoTitle,
      seoDescription: data.settings.seoDescription,
    },
  });
  console.log('✅ Окна: созданы настройки страницы');
}

async function seedBrandsWithSystems() {
  let createdBrands = 0;
  let updatedBrands = 0;
  let createdSystems = 0;
  let updatedSystems = 0;

  for (const brand of data.brands) {
    const existingBrand = await prisma.windowBrand.findUnique({ where: { slug: brand.slug } });
    let brandId = existingBrand && existingBrand.id;

    if (!existingBrand) {
      brandId = (
        await prisma.windowBrand.create({
          data: {
            name: brand.name,
            slug: brand.slug,
            country: brand.country,
            description: brand.description,
            sortOrder: brand.sortOrder,
          },
        })
      ).id;
      createdBrands += 1;
    } else if (FORCE) {
      await prisma.windowBrand.update({
        where: { id: brandId },
        data: {
          name: brand.name,
          country: brand.country,
          description: brand.description,
          sortOrder: brand.sortOrder,
        },
      });
      updatedBrands += 1;
    }

    for (const system of brand.systems) {
      const payload = {
        brandId,
        slug: system.slug,
        name: system.name,
        tagline: system.tagline,
        videoUrl: system.videoUrl ?? null,
        description: system.description,
        chambers: system.chambers,
        mountingDepth: system.mountingDepth,
        glassUnitWidth: system.glassUnitWidth,
        thermalResistance: system.thermalResistance,
        soundInsulation: system.soundInsulation,
        characteristics: system.characteristics,
        advantages: system.advantages,
        badge: system.badge,
        sortOrder: system.sortOrder,
      };
      const existingSystem = await prisma.windowProfileSystem.findUnique({
        where: { slug: system.slug },
      });
      if (!existingSystem) {
        await prisma.windowProfileSystem.create({ data: payload });
        createdSystems += 1;
      } else if (FORCE) {
        await prisma.windowProfileSystem.update({ where: { slug: system.slug }, data: payload });
        updatedSystems += 1;
      }
    }
    console.log(
      `✅ Окна: бренд ${brand.name} — систем: ${brand.systems.length}` +
        (FORCE ? '' : ' (существующие записи не менялись)')
    );
  }

  console.log(
    `📊 Окна: создано брендов ${createdBrands}, систем ${createdSystems}` +
      (FORCE
        ? `, обновлено брендов ${updatedBrands}, систем ${updatedSystems}`
        : '')
  );
}

async function seedNavigationItem() {
  const existing = await prisma.navigationItem.findFirst({ where: { name: 'Окна' } });
  if (existing) {
    if (existing.href !== '/windows') {
      await prisma.navigationItem.update({
        where: { id: existing.id },
        data: { href: '/windows', hasDropdown: false },
      });
      console.log('✅ Окна: пункт меню обновлён на /windows');
    }
    return;
  }

  const all = await prisma.navigationItem.findMany({ orderBy: { sortOrder: 'asc' } });
  const anchor = all.find((n) => n.name === 'Акции') || all.find((n) => n.name === 'Блог');
  let sortOrder = all.length;
  if (anchor) {
    await prisma.navigationItem.updateMany({
      where: { sortOrder: { gte: anchor.sortOrder } },
      data: { sortOrder: { increment: 1 } },
    });
    sortOrder = anchor.sortOrder;
  }
  await prisma.navigationItem.create({
    data: { name: 'Окна', href: '/windows', hasDropdown: false, sortOrder },
  });
  console.log('✅ Окна: добавлен пункт меню «Окна» → /windows');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL не задан (на проде передайте переменные окружения контейнера)');
  }
  console.log(
    FORCE
      ? '⚡ Режим: WINDOWS_SECTION_FORCE=1 (обновление контента)'
      : '🛡️ Режим: только недостающее (правки админки не трогаем)'
  );
  await seedPageSettings();
  await seedBrandsWithSystems();
  await seedNavigationItem();
  const [brandCount, systemCount] = await Promise.all([
    prisma.windowBrand.count(),
    prisma.windowProfileSystem.count(),
  ]);
  console.log(`✅ Окна: итого в БД брендов ${brandCount}, профильных систем ${systemCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
