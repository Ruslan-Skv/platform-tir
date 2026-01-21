/**
 * Скрипт для добавления атрибутов к категориям дверей
 * Использование: npx ts-node scripts/add-category-attributes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Функция транслитерации для генерации slug
function transliterate(text: string): string {
  const ru: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  };

  return text
    .toLowerCase()
    .split('')
    .map((char) => ru[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

// Атрибуты для межкомнатных дверей
const interiorDoorAttributes = [
  { name: 'Модель', slug: 'model' },
  { name: 'Цвет двери', slug: 'door-color' },
  { name: 'Размер полотна', slug: 'canvas-size' },
  { name: 'Толщина полотна', slug: 'canvas-thickness' },
  { name: 'Конструкция', slug: 'construction' },
  { name: 'Тип полотна', slug: 'canvas-type' },
  { name: 'Вес двери', slug: 'door-weight' },
  { name: 'Материал покрытия', slug: 'coating-material' },
  { name: 'Погонаж', slug: 'linear-meter' },
  { name: 'Производитель', slug: 'manufacturer' },
];

// Атрибуты для входных дверей
const entranceDoorAttributes = [
  { name: 'Серия', slug: 'series' },
  { name: 'Размеры по коробке', slug: 'frame-dimensions' },
  { name: 'Сторона открывания', slug: 'opening-side' },
  { name: 'Внутренняя отделка', slug: 'interior-finish' },
  { name: 'Покрытие', slug: 'coating' },
  { name: 'Полотно', slug: 'canvas' },
  { name: 'Коробка', slug: 'frame' },
  { name: 'Уплотнители', slug: 'seals' },
  { name: 'Наличие глазка', slug: 'peephole' },
  { name: 'Петли', slug: 'hinges' },
  { name: 'Покраска металла', slug: 'metal-painting' },
  { name: 'Утепление / шумоизоляция', slug: 'insulation-soundproofing' },
  { name: 'Противосъемные штыри', slug: 'anti-removal-pins' },
  { name: 'Толщина полотна', slug: 'entrance-canvas-thickness' },
  { name: 'Толщина стали', slug: 'steel-thickness' },
  { name: 'Замок основной', slug: 'main-lock' },
  { name: 'Замок дополнительный', slug: 'additional-lock' },
  { name: 'Ручка', slug: 'handle' },
  { name: 'Производитель', slug: 'entrance-manufacturer' },
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
  console.log('🚀 Добавление атрибутов к категориям дверей...\n');

  // === Межкомнатные двери ===
  console.log('📦 Поиск категории "Межкомнатные двери"...');
  const interiorDoorsCategory = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: 'interior-doors' },
        { slug: 'mezhkomnatnye-dveri' },
        { slug: 'dveri-mezhkomnatnye' },
        { name: { contains: 'межкомнатн', mode: 'insensitive' } },
      ],
    },
  });

  if (interiorDoorsCategory) {
    console.log(`✅ Найдена категория: ${interiorDoorsCategory.name} (ID: ${interiorDoorsCategory.id})`);
    
    // Получаем все дочерние категории
    const childCategoryIds = await getAllChildCategories(interiorDoorsCategory.id);
    
    // Если дочерних нет, добавляем атрибуты к самой категории
    const targetCategoryIds = childCategoryIds.length > 0 
      ? childCategoryIds 
      : [interiorDoorsCategory.id];
    
    console.log(`   Целевых категорий: ${targetCategoryIds.length} ${childCategoryIds.length === 0 ? '(сама категория)' : '(дочерние)'}\n`);

    // Создаём/получаем атрибуты
    console.log('📝 Создание атрибутов для межкомнатных дверей:');
    const interiorAttributeIds: string[] = [];
    for (const attr of interiorDoorAttributes) {
      const attribute = await getOrCreateAttribute(attr.name, attr.slug);
      interiorAttributeIds.push(attribute.id);
    }

    // Добавляем атрибуты к категориям
    await addAttributesToCategories(targetCategoryIds, interiorAttributeIds, 'Межкомнатные двери');
  } else {
    console.log('⚠️  Категория "Межкомнатные двери" не найдена');
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // === Входные двери ===
  console.log('📦 Поиск категории "Входные двери"...');
  // Ищем именно родительскую категорию (без parentId)
  const entranceDoorsCategory = await prisma.category.findFirst({
    where: {
      AND: [
        { parentId: null },
        {
          OR: [
            { slug: 'entrance-doors' },
            { slug: 'vhodnye-dveri' },
            { slug: 'dveri-vhodnye' },
            { name: { contains: 'входн', mode: 'insensitive' } },
          ],
        },
      ],
    },
  });

  if (entranceDoorsCategory) {
    console.log(`✅ Найдена категория: ${entranceDoorsCategory.name} (ID: ${entranceDoorsCategory.id})`);
    
    // Получаем все дочерние категории
    const childCategoryIds = await getAllChildCategories(entranceDoorsCategory.id);
    
    // Если дочерних нет, добавляем атрибуты к самой категории
    const targetCategoryIds = childCategoryIds.length > 0 
      ? childCategoryIds 
      : [entranceDoorsCategory.id];
    
    console.log(`   Целевых категорий: ${targetCategoryIds.length} ${childCategoryIds.length === 0 ? '(сама категория)' : '(дочерние)'}\n`);

    // Создаём/получаем атрибуты
    console.log('📝 Создание атрибутов для входных дверей:');
    const entranceAttributeIds: string[] = [];
    for (const attr of entranceDoorAttributes) {
      const attribute = await getOrCreateAttribute(attr.name, attr.slug);
      entranceAttributeIds.push(attribute.id);
    }

    // Добавляем атрибуты к категориям
    await addAttributesToCategories(targetCategoryIds, entranceAttributeIds, 'Входные двери');
  } else {
    console.log('⚠️  Категория "Входные двери" не найдена');
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
