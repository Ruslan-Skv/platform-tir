/**
 * Скрипт для добавления атрибутов к категории "Мягкая мебель"
 * Использование: npx ts-node scripts/add-soft-furniture-attributes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Атрибуты для мягкой мебели
const softFurnitureAttributes = [
  { name: 'Размеры', slug: 'dimensions' },
  { name: 'Спальное место', slug: 'sleeping-area' },
  { name: 'Механизм трансформации', slug: 'transformation-mechanism' },
  { name: 'Независимый пружинный блок', slug: 'independent-spring-block' },
  { name: 'Каркас', slug: 'frame-material' },
  { name: 'Бельевой ящик', slug: 'linen-box' },
  { name: 'Материал обивки', slug: 'upholstery-material' },
  { name: 'Наполнитель', slug: 'filler' },
  { name: 'Съёмный чехол', slug: 'removable-cover' },
  { name: 'Подушки', slug: 'pillows' },
  { name: 'Цвет декора', slug: 'decor-color' },
  { name: 'Ортопедическое основание', slug: 'orthopedic-base' },
  { name: 'Подлокотники', slug: 'armrests' },
];

async function getOrCreateAttribute(name: string, slug: string) {
  // Пытаемся найти существующий атрибут
  let attribute = await prisma.attribute.findUnique({
    where: { slug },
  });

  if (!attribute) {
    // Создаём новый атрибут
    attribute = await prisma.attribute.create({
      data: {
        name,
        slug,
        type: 'TEXT',
        isFilterable: true,
      },
    });
    console.log(`  ✅ Создан атрибут: ${name} (${slug})`);
  } else {
    console.log(`  ℹ️  Атрибут уже существует: ${name} (${slug})`);
  }

  return attribute;
}

async function addAttributeToCategory(categoryId: string, attributeId: string, order: number) {
  // Проверяем, не добавлен ли уже этот атрибут к категории
  const existing = await prisma.categoryAttribute.findUnique({
    where: {
      categoryId_attributeId: {
        categoryId,
        attributeId,
      },
    },
  });

  if (!existing) {
    await prisma.categoryAttribute.create({
      data: {
        categoryId,
        attributeId,
        isRequired: false,
        order,
      },
    });
    return true;
  }
  return false;
}

async function getAllChildCategories(parentId: string): Promise<string[]> {
  const children = await prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });

  const allIds: string[] = [];
  for (const child of children) {
    allIds.push(child.id);
    // Рекурсивно получаем дочерние категории
    const grandChildren = await getAllChildCategories(child.id);
    allIds.push(...grandChildren);
  }

  return allIds;
}

async function addAttributesToCategories(
  categoryIds: string[],
  attributeIds: string[],
  categoryName: string
) {
  console.log(`\n🔗 Привязка атрибутов к категориям (${categoryName}):`);
  
  for (const categoryId of categoryIds) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });
    
    let addedCount = 0;
    for (let i = 0; i < attributeIds.length; i++) {
      const added = await addAttributeToCategory(categoryId, attributeIds[i], i);
      if (added) addedCount++;
    }
    
    if (addedCount > 0) {
      console.log(`   ✅ ${category?.name}: добавлено ${addedCount} атрибутов`);
    } else {
      console.log(`   ℹ️  ${category?.name}: атрибуты уже привязаны`);
    }
  }
}

async function main() {
  console.log('🚀 Добавление атрибутов к категории "Мягкая мебель"...\n');

  // Поиск категории "Мягкая мебель"
  console.log('📦 Поиск категории "Мягкая мебель"...');
  const softFurnitureCategory = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: 'myagkaya-mebel' },
        { slug: 'soft-furniture' },
        { name: { equals: 'Мягкая мебель', mode: 'insensitive' } },
        { name: { contains: 'мягкая мебель', mode: 'insensitive' } },
      ],
    },
  });

  if (softFurnitureCategory) {
    console.log(`✅ Найдена категория: ${softFurnitureCategory.name} (ID: ${softFurnitureCategory.id})`);
    
    // Получаем все дочерние категории
    const childCategoryIds = await getAllChildCategories(softFurnitureCategory.id);
    
    // Добавляем атрибуты к самой категории и всем дочерним
    const targetCategoryIds = [softFurnitureCategory.id, ...childCategoryIds];
    
    console.log(`   Целевых категорий: ${targetCategoryIds.length} (включая дочерние)\n`);

    // Создаём/получаем атрибуты
    console.log('📝 Создание атрибутов для мягкой мебели:');
    const attributeIds: string[] = [];
    for (const attr of softFurnitureAttributes) {
      const attribute = await getOrCreateAttribute(attr.name, attr.slug);
      attributeIds.push(attribute.id);
    }

    // Добавляем атрибуты к категориям
    await addAttributesToCategories(targetCategoryIds, attributeIds, 'Мягкая мебель');
  } else {
    console.log('⚠️  Категория "Мягкая мебель" не найдена');
    
    // Показываем все доступные категории для помощи
    console.log('\n📋 Доступные категории:');
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
    
    for (const cat of categories) {
      console.log(`   - ${cat.name} (slug: ${cat.slug})`);
    }
  }

  console.log('\n✨ Готово!');
}

main()
  .catch((error) => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
