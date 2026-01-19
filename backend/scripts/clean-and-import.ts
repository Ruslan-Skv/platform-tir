/**
 * Скрипт для очистки БД от моковых данных и повторного импорта дверей Аргус
 * Использование: npx ts-node scripts/clean-and-import.ts
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
      sku: `ARGUS-${externalId}`,
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

async function cleanDatabase() {
  console.log('🧹 Очистка базы данных...\n');

  // Удаляем данные в правильном порядке (с учетом зависимостей)
  
  // 1. Удаляем данные аналитики
  try {
    const marketingMetrics = await prisma.marketingMetric.deleteMany({});
    console.log(`  - Удалено marketingMetrics: ${marketingMetrics.count}`);
  } catch (e) { console.log('  - marketingMetrics: таблица пуста или не существует'); }

  try {
    const marketingChannels = await prisma.marketingChannel.deleteMany({});
    console.log(`  - Удалено marketingChannels: ${marketingChannels.count}`);
  } catch (e) { console.log('  - marketingChannels: таблица пуста или не существует'); }

  try {
    const salesMetrics = await prisma.salesMetric.deleteMany({});
    console.log(`  - Удалено salesMetrics: ${salesMetrics.count}`);
  } catch (e) { console.log('  - salesMetrics: таблица пуста или не существует'); }

  // 2. Удаляем CRM данные
  try {
    const interactions = await prisma.interaction.deleteMany({});
    console.log(`  - Удалено interactions: ${interactions.count}`);
  } catch (e) { console.log('  - interactions: таблица пуста или не существует'); }

  try {
    const deals = await prisma.deal.deleteMany({});
    console.log(`  - Удалено deals: ${deals.count}`);
  } catch (e) { console.log('  - deals: таблица пуста или не существует'); }

  try {
    const tasks = await prisma.task.deleteMany({});
    console.log(`  - Удалено tasks: ${tasks.count}`);
  } catch (e) { console.log('  - tasks: таблица пуста или не существует'); }

  try {
    const customers = await prisma.customer.deleteMany({});
    console.log(`  - Удалено customers: ${customers.count}`);
  } catch (e) { console.log('  - customers: таблица пуста или не существует'); }

  // 3. Удаляем CMS данные
  try {
    const comments = await prisma.comment.deleteMany({});
    console.log(`  - Удалено comments: ${comments.count}`);
  } catch (e) { console.log('  - comments: таблица пуста или не существует'); }

  try {
    const blogPosts = await prisma.blogPost.deleteMany({});
    console.log(`  - Удалено blogPosts: ${blogPosts.count}`);
  } catch (e) { console.log('  - blogPosts: таблица пуста или не существует'); }

  try {
    const blogCategories = await prisma.blogCategory.deleteMany({});
    console.log(`  - Удалено blogCategories: ${blogCategories.count}`);
  } catch (e) { console.log('  - blogCategories: таблица пуста или не существует'); }

  try {
    const pages = await prisma.page.deleteMany({});
    console.log(`  - Удалено pages: ${pages.count}`);
  } catch (e) { console.log('  - pages: таблица пуста или не существует'); }

  // 4. Удаляем данные поставщиков
  try {
    const syncLogs = await prisma.supplierSyncLog.deleteMany({});
    console.log(`  - Удалено supplierSyncLogs: ${syncLogs.count}`);
  } catch (e) { console.log('  - supplierSyncLogs: таблица пуста или не существует'); }

  try {
    const productSuppliers = await prisma.productSupplier.deleteMany({});
    console.log(`  - Удалено productSuppliers: ${productSuppliers.count}`);
  } catch (e) { console.log('  - productSuppliers: таблица пуста или не существует'); }

  try {
    const suppliers = await prisma.supplier.deleteMany({});
    console.log(`  - Удалено suppliers: ${suppliers.count}`);
  } catch (e) { console.log('  - suppliers: таблица пуста или не существует'); }

  // 5. Удаляем атрибуты
  try {
    const attributeValues = await prisma.attributeValue.deleteMany({});
    console.log(`  - Удалено attributeValues: ${attributeValues.count}`);
  } catch (e) { console.log('  - attributeValues: таблица пуста или не существует'); }

  try {
    const attributes = await prisma.attribute.deleteMany({});
    console.log(`  - Удалено attributes: ${attributes.count}`);
  } catch (e) { console.log('  - attributes: таблица пуста или не существует'); }

  // 6. Удаляем производителей
  try {
    const manufacturers = await prisma.manufacturer.deleteMany({});
    console.log(`  - Удалено manufacturers: ${manufacturers.count}`);
  } catch (e) { console.log('  - manufacturers: таблица пуста или не существует'); }

  // 7. Удаляем данные заказов
  try {
    const payments = await prisma.payment.deleteMany({});
    console.log(`  - Удалено payments: ${payments.count}`);
  } catch (e) { console.log('  - payments: таблица пуста или не существует'); }

  try {
    const orderItems = await prisma.orderItem.deleteMany({});
    console.log(`  - Удалено orderItems: ${orderItems.count}`);
  } catch (e) { console.log('  - orderItems: таблица пуста или не существует'); }

  try {
    const orders = await prisma.order.deleteMany({});
    console.log(`  - Удалено orders: ${orders.count}`);
  } catch (e) { console.log('  - orders: таблица пуста или не существует'); }

  try {
    const shippingMethods = await prisma.shippingMethod.deleteMany({});
    console.log(`  - Удалено shippingMethods: ${shippingMethods.count}`);
  } catch (e) { console.log('  - shippingMethods: таблица пуста или не существует'); }

  try {
    const paymentMethods = await prisma.paymentMethod.deleteMany({});
    console.log(`  - Удалено paymentMethods: ${paymentMethods.count}`);
  } catch (e) { console.log('  - paymentMethods: таблица пуста или не существует'); }

  // 8. Удаляем корзины и wishlist
  try {
    const cartItems = await prisma.cartItem.deleteMany({});
    console.log(`  - Удалено cartItems: ${cartItems.count}`);
  } catch (e) { console.log('  - cartItems: таблица пуста или не существует'); }

  try {
    const wishlistItems = await prisma.wishlistItem.deleteMany({});
    console.log(`  - Удалено wishlistItems: ${wishlistItems.count}`);
  } catch (e) { console.log('  - wishlistItems: таблица пуста или не существует'); }

  // 9. Удаляем отзывы
  try {
    const reviews = await prisma.review.deleteMany({});
    console.log(`  - Удалено reviews: ${reviews.count}`);
  } catch (e) { console.log('  - reviews: таблица пуста или не существует'); }

  // 10. Удаляем товары
  const products = await prisma.product.deleteMany({});
  console.log(`  - Удалено products: ${products.count}`);

  // 11. Удаляем категории
  const categories = await prisma.category.deleteMany({});
  console.log(`  - Удалено categories: ${categories.count}`);

  // 12. Удаляем адреса
  try {
    const addresses = await prisma.address.deleteMany({});
    console.log(`  - Удалено addresses: ${addresses.count}`);
  } catch (e) { console.log('  - addresses: таблица пуста или не существует'); }

  console.log('\n✅ База данных очищена!');
}

async function importDoors() {
  const filePath = 'import-bitriks/iblock_list_admin(6)-2.xls';
  
  console.log(`\n📖 Читаю файл: ${filePath}`);

  // Читаем HTML файл
  const html = fs.readFileSync(filePath, 'utf-8');

  console.log(`📊 Размер файла: ${(html.length / 1024).toFixed(2)} KB`);

  // Парсим HTML таблицу
  const doors = parseHtmlTable(html);

  console.log(`📋 Найдено дверей: ${doors.length}`);

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

  // Создаём родительскую категорию "Двери входные"
  const parentCategory = await prisma.category.create({
    data: {
      name: 'Двери входные',
      slug: 'entrance-doors',
      description: 'Входные двери различных типов и размеров',
      order: 1,
    },
  });

  console.log(`\n✅ Создана родительская категория: ${parentCategory.name}`);

  // Создаём подкатегорию "Входные двери Аргус"
  const category = await prisma.category.create({
    data: {
      name: 'Входные двери Аргус',
      slug: 'entrance-doors-argus',
      description: 'Входные двери серии Аргус',
      parentId: parentCategory.id,
      order: 1,
    },
  });

  console.log(`✅ Создана подкатегория: ${category.name} (ID: ${category.id})`);

  // Импортируем двери
  let imported = 0;
  let errors = 0;

  for (const door of doors) {
    try {
      await prisma.product.create({
        data: {
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
    } catch (error: any) {
      errors++;
      if (errors <= 5) {
        console.error(`❌ Ошибка импорта "${door.name}": ${error.message}`);
      }
    }
  }

  console.log(`\n✅ Импортировано: ${imported} дверей`);
  if (errors > 0) {
    console.log(`❌ Ошибок: ${errors}`);
  }
}

// Главная функция
async function main() {
  console.log('🚀 Запуск очистки БД и импорта товаров\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Очищаем БД
    await cleanDatabase();

    // 2. Импортируем двери
    await importDoors();

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Готово! Проверьте товары в админке.');

  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
