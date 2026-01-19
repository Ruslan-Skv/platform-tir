/**
 * Скрипт для импорта дверей серии "М" из HTML-файла экспорта Битрикс
 * Использование: npx ts-node scripts/import-doors-m.ts
 */

import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DoorData {
  name: string;
  slug: string;
  sku: string;
  price: number;
  description: string;
  images: string[];
  attributes: {
    sizes?: string;
    manufacturer?: string;
    color?: string;
    coating?: string;
    thickness?: string;
    isHit?: boolean;
    isNew?: boolean;
  };
}

function parseHtmlTable(html: string): DoorData[] {
  const doors: DoorData[] = [];

  // Простой парсинг: разбиваем по </tr>
  const rows = html.split('</tr>');

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.includes('<td>')) continue;

    // Извлекаем ячейки
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let match;

    while ((match = cellRegex.exec(row)) !== null) {
      // Очищаем HTML-теги и &nbsp;
      let value = match[1]
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      cells.push(value);
    }

    if (cells.length < 22) continue;

    // Пропускаем заголовок
    if (cells[0] === 'Название') continue;

    // Извлекаем данные
    const name = cells[0];
    const isActive = cells[1] === 'Да';
    const slug = cells[3] || '';
    const externalId = cells[4] || '';
    const previewImage = cells[16] || '';
    const detailImage = cells[18] || '';
    const description = cells[19] || '';
    const priceStr = cells[21] || '0';
    const sizes = cells[22] || '';
    const manufacturer = cells[23] || '';
    const color = cells[24] || '';
    const additionalImage = cells[25] || '';
    const coating = cells[26] || '';
    const isHit = cells[28] === 'Да';
    const isNew = cells[29] === 'Да';
    const thickness = cells[30] || '';

    // Парсим цену
    const price = parseInt(priceStr.replace(/[^\d]/g, ''), 10) || 0;

    if (!name || !isActive || price === 0) continue;

    // Собираем изображения
    const images: string[] = [];
    if (detailImage) images.push(detailImage);
    if (previewImage && previewImage !== detailImage) images.push(previewImage);
    if (additionalImage && !images.includes(additionalImage)) images.push(additionalImage);

    doors.push({
      name,
      slug: slug || name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-|-$/g, ''),
      sku: `M-${externalId}`,
      price,
      description,
      images,
      attributes: {
        sizes,
        manufacturer,
        color,
        coating,
        thickness,
        isHit,
        isNew,
      },
    });
  }

  return doors;
}

async function importDoors() {
  const filePath = 'import-bitriks/iblock_list_admin(6)-1.xls';
  
  console.log(`📖 Читаю файл: ${filePath}`);

  // Читаем HTML файл
  const html = fs.readFileSync(filePath, 'utf-8');

  console.log(`📊 Размер файла: ${(html.length / 1024).toFixed(2)} KB`);

  // Парсим HTML таблицу
  const doors = parseHtmlTable(html);

  console.log(`\n📋 Найдено дверей: ${doors.length}`);

  if (doors.length === 0) {
    console.log('❌ Не удалось найти данные в файле');
    return;
  }

  // Выводим первые 3 двери для проверки
  console.log('\n📋 Примеры найденных дверей:');
  doors.slice(0, 3).forEach((door, i) => {
    console.log(`${i + 1}. ${door.name}`);
    console.log(`   Цена: ${door.price} руб.`);
    console.log(`   Slug: ${door.slug}`);
    console.log(`   Изображений: ${door.images.length}`);
  });

  // Находим родительскую категорию "Двери входные"
  const parentCategory = await prisma.category.upsert({
    where: { slug: 'entrance-doors' },
    update: {},
    create: {
      name: 'Двери входные',
      slug: 'entrance-doors',
      description: 'Входные двери различных типов и размеров',
      order: 1,
    },
  });

  // Находим или создаём подкатегорию "Входные двери М"
  const category = await prisma.category.upsert({
    where: { slug: 'entrance-doors-m' },
    update: {
      parentId: parentCategory.id,
    },
    create: {
      name: 'Входные двери М',
      slug: 'entrance-doors-m',
      description: 'Входные двери серии М',
      parentId: parentCategory.id,
      order: 2,
    },
  });

  console.log(`\n✅ Категория готова: ${category.name} (ID: ${category.id})`);

  // Удаляем старые товары из этой категории
  const deleted = await prisma.product.deleteMany({
    where: {
      categoryId: category.id,
      sku: { startsWith: 'M-' },
    },
  });
  console.log(`🗑️ Удалено старых товаров: ${deleted.count}`);

  // Импортируем двери
  let imported = 0;
  let errors = 0;

  for (const door of doors) {
    try {
      await prisma.product.upsert({
        where: { slug: door.slug },
        update: {
          name: door.name,
          description: door.description,
          price: door.price,
          images: door.images,
          attributes: door.attributes,
          isActive: true,
          isFeatured: door.attributes.isHit || door.attributes.isNew || false,
        },
        create: {
          name: door.name,
          slug: door.slug,
          sku: door.sku,
          description: door.description,
          price: door.price,
          stock: 10,
          categoryId: category.id,
          images: door.images,
          attributes: door.attributes,
          isActive: true,
          isFeatured: door.attributes.isHit || door.attributes.isNew || false,
        },
      });
      imported++;
    } catch (error) {
      errors++;
      if (errors <= 3) {
        console.error(`❌ Ошибка импорта "${door.name}":`, error);
      }
    }
  }

  console.log(`\n✅ Импортировано: ${imported} дверей`);
  if (errors > 0) {
    console.log(`❌ Ошибок: ${errors}`);
  }
  console.log('\n🎉 Импорт завершён!');
}

// Главная функция
async function main() {
  try {
    await importDoors();
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
