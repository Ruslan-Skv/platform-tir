/**
 * Наполнение раздела «Окна»: настройки страницы, бренды (REHAU, VEKA, WHS)
 * и их профильные системы. Контент — в prisma/data/windows-section.json
 * (источники: oknaaries.ru, veka.ru, whshalo.ru).
 *
 * Запуск из каталога backend:
 *   npm run prisma:seed-windows-section
 * На проде используйте скомпилированную версию:
 *   docker compose exec backend node prisma/seed-windows.cjs
 *
 * Режимы:
 *   по умолчанию — только создаёт недостающее (бренды/системы/настройки/пункт меню),
 *                  существующие записи НЕ трогает (защита правок, сделанных в админке);
 *   WINDOWS_SECTION_FORCE=1 — дополнительно обновляет контент существующих брендов
 *                  и систем данными из JSON (настройки страницы всё равно не перезаписывает).
 *
 * Идемпотентно: повторный запуск безопасен.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

import data from './data/windows-section.json';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });
// Монорепозиторий: часто единственный .env в корне проекта (не в backend/)
config({ path: path.join(__dirname, '..', '..', '.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL не задан (см. backend/.env)');
}

const FORCE = process.env.WINDOWS_SECTION_FORCE === '1';

const prisma = new PrismaClient();

type SeedSystem = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  chambers: number | null;
  mountingDepth: number | null;
  glassUnitWidth: string | null;
  thermalResistance: string | null;
  soundInsulation: string | null;
  advantages: string[];
  characteristics: { label: string; value: string }[];
  badge: string | null;
  sortOrder: number;
};

type SeedBrand = {
  slug: string;
  name: string;
  country: string | null;
  description: string;
  sortOrder: number;
  systems: SeedSystem[];
};

const { settings: seedSettings, brands } = data as {
  settings: {
    title: string;
    subtitle: string;
    description: string;
    seoTitle: string;
    seoDescription: string;
  };
  brands: SeedBrand[];
};

async function seedPageSettings() {
  const existing = await prisma.windowsPageBlock.findUnique({ where: { id: 'main' } });
  if (existing) {
    console.log('ℹ️ Окна: настройки страницы уже существуют — не трогаем (правки админки)');
    return;
  }
  await prisma.windowsPageBlock.create({
    data: {
      id: 'main',
      title: seedSettings.title,
      subtitle: seedSettings.subtitle,
      description: seedSettings.description,
      seoTitle: seedSettings.seoTitle,
      seoDescription: seedSettings.seoDescription,
    },
  });
  console.log('✅ Окна: созданы настройки страницы');
}

async function seedBrandsWithSystems() {
  let createdBrands = 0;
  let updatedBrands = 0;
  let createdSystems = 0;
  let updatedSystems = 0;

  for (const brand of brands) {
    const existingBrand = await prisma.windowBrand.findUnique({ where: { slug: brand.slug } });
    let brandId = existingBrand?.id;

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
      createdBrands++;
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
      updatedBrands++;
    }

    for (const system of brand.systems) {
      const payload = {
        brandId: brandId!,
        slug: system.slug,
        name: system.name,
        tagline: system.tagline,
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
        createdSystems++;
      } else if (FORCE) {
        await prisma.windowProfileSystem.update({ where: { slug: system.slug }, data: payload });
        updatedSystems++;
      }
    }
    console.log(
      `✅ Окна: бренд ${brand.name} — систем: ${brand.systems.length}` +
        (FORCE ? '' : ' (существующие записи не менялись)')
    );
  }

  console.log(
    `📊 Окна: создано брендов ${createdBrands}, систем ${createdSystems}` +
      (FORCE ? `, обновлено брендов ${updatedBrands}, систем ${updatedSystems}` : '')
  );
}

/** Пункт меню «Окна» → /windows верхнего уровня (перед «Акции»). */
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
  const anchor = all.find((n) => n.name === 'Акции') ?? all.find((n) => n.name === 'Блог');
  let sortOrder = all.length;
  if (anchor) {
    // Освобождаем место перед якорем, чтобы «Окна» встало туда же
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
  console.log(FORCE ? '⚡ Режим: WINDOWS_SECTION_FORCE=1 (обновление контента)' : '🛡️ Режим: только недостающее (правки админки не трогаем)');
  await seedPageSettings();
  await seedBrandsWithSystems();
  await seedNavigationItem();
  const [brandCount, systemCount] = await Promise.all([
    prisma.windowBrand.count(),
    prisma.windowProfileSystem.count(),
  ]);
  console.log(`✅ Окна: итого в БД брендов ${brandCount}, профильных систем ${systemCount}`);
  console.log('ℹ️ На проде: docker compose exec backend node prisma/seed-windows.cjs');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
