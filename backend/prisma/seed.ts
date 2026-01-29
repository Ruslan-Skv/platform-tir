import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TEST_PASSWORD = 'Test123!';

// Супер-администратора не создаём — его создаёте вы сами.
const TEST_USERS = [
  { email: 'admin@example.com', firstName: 'Админ', lastName: 'Системы', role: 'ADMIN' as const },
  { email: 'content_manager@example.com', firstName: 'Контент', lastName: 'Менеджер', role: 'CONTENT_MANAGER' as const },
  { email: 'moderator@example.com', firstName: 'Модератор', lastName: 'Сайта', role: 'MODERATOR' as const },
  { email: 'support@example.com', firstName: 'Поддержка', lastName: 'Клиентов', role: 'SUPPORT' as const },
  { email: 'partner@example.com', firstName: 'Партнёр', lastName: 'Компании', role: 'PARTNER' as const },
  { email: 'user@example.com', firstName: 'Тестовый', lastName: 'Пользователь', role: 'USER' as const },
  { email: 'guest@example.com', firstName: 'Гость', lastName: 'Сайта', role: 'GUEST' as const },
];

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const u of TEST_USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, firstName: u.firstName, lastName: u.lastName },
      create: {
        email: u.email,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
      },
    });
    console.log(`✅ ${u.role}: ${user.email}`);
  }

  console.log(`\n📋 Пароль для всех тестовых пользователей: ${TEST_PASSWORD}`);
  console.log('   Вход в админку: admin@example.com, content_manager@example.com, moderator@example.com, support@example.com, partner@example.com');
  console.log('   Обычный пользователь: user@example.com. Гость: guest@example.com');
  console.log('   Супер-администратора в seed нет — создаёте сами.\n');

  // ============================================
  // КАТЕГОРИИ
  // ============================================

  // Родительская категория: Двери входные
  const entranceDoorsCategory = await prisma.category.upsert({
    where: { slug: 'entrance-doors' },
    update: {},
    create: {
      name: 'Двери входные',
      slug: 'entrance-doors',
      description: 'Входные двери различных типов и размеров',
      order: 1,
    },
  });

  // Подкатегория: Входные двери ТТ XL / XXL
  const ttXlXxlCategory = await prisma.category.upsert({
    where: { slug: 'entrance-doors-tt-xl-xxl' },
    update: {
      parentId: entranceDoorsCategory.id,
    },
    create: {
      name: 'Входные двери ТТ XL / XXL',
      slug: 'entrance-doors-tt-xl-xxl',
      description: 'Входные двери увеличенного размера серии ТТ XL и XXL',
      parentId: entranceDoorsCategory.id,
      order: 1,
    },
  });

  // Другие категории
  const interiorDoorsCategory = await prisma.category.upsert({
    where: { slug: 'interior-doors' },
    update: {},
    create: {
      name: 'Двери межкомнатные',
      slug: 'interior-doors',
      description: 'Межкомнатные двери',
      order: 2,
    },
  });

  const windowsCategory = await prisma.category.upsert({
    where: { slug: 'windows' },
    update: {},
    create: {
      name: 'Окна',
      slug: 'windows',
      description: 'Пластиковые и алюминиевые окна',
      order: 3,
    },
  });

  const furnitureCategory = await prisma.category.upsert({
    where: { slug: 'upholstered-furniture' },
    update: {},
    create: {
      name: 'Мягкая мебель',
      slug: 'upholstered-furniture',
      description: 'Мягкая мебель и мебель на заказ',
      order: 4,
    },
  });

  console.log('✅ Created categories');

  // ============================================
  // ТОВАРЫ: Входные двери ТТ XL / XXL
  // ============================================

  const entranceDoorProducts = [
    {
      name: 'Входная дверь ТТ XL "Премиум"',
      slug: 'tt-xl-premium',
      description:
        'Входная дверь увеличенного размера ТТ XL серии Премиум. Толщина полотна 100 мм, три контура уплотнения, терморазрыв.',
      sku: 'TT-XL-001',
      price: 45900,
      comparePrice: 52000,
      stock: 5,
      images: ['/images/products/door-tt-xl-1.jpg'],
      attributes: {
        width: '960 мм',
        height: '2050 мм',
        thickness: '100 мм',
        steel_thickness: '2.0 мм',
        insulation: 'Минеральная вата',
        lock: 'Двухсистемный',
        color_outside: 'Антик медь',
        color_inside: 'Беленый дуб',
        thermal_break: true,
      },
    },
    {
      name: 'Входная дверь ТТ XXL "Люкс"',
      slug: 'tt-xxl-lux',
      description:
        'Входная дверь максимального размера ТТ XXL серии Люкс. Усиленная конструкция, противосъемные ригели, биометрический замок.',
      sku: 'TT-XXL-001',
      price: 68500,
      comparePrice: 75000,
      stock: 3,
      images: ['/images/products/door-tt-xxl-1.jpg'],
      attributes: {
        width: '1050 мм',
        height: '2200 мм',
        thickness: '110 мм',
        steel_thickness: '2.5 мм',
        insulation: 'Пенополиуретан',
        lock: 'Биометрический + ключевой',
        color_outside: 'Графит',
        color_inside: 'Венге',
        thermal_break: true,
      },
    },
    {
      name: 'Входная дверь ТТ XL "Стандарт"',
      slug: 'tt-xl-standard',
      description:
        'Надежная входная дверь ТТ XL серии Стандарт. Оптимальное соотношение цены и качества.',
      sku: 'TT-XL-002',
      price: 32400,
      comparePrice: 38000,
      stock: 8,
      images: ['/images/products/door-tt-xl-2.jpg'],
      attributes: {
        width: '960 мм',
        height: '2050 мм',
        thickness: '85 мм',
        steel_thickness: '1.8 мм',
        insulation: 'Минеральная вата',
        lock: 'Сувальдный',
        color_outside: 'Антик серебро',
        color_inside: 'Сосна прованс',
        thermal_break: false,
      },
    },
    {
      name: 'Входная дверь ТТ XXL "Терморазрыв"',
      slug: 'tt-xxl-thermobreak',
      description:
        'Входная дверь ТТ XXL с усиленным терморазрывом для холодного климата. Идеальна для частного дома.',
      sku: 'TT-XXL-002',
      price: 78900,
      comparePrice: 89000,
      stock: 4,
      images: ['/images/products/door-tt-xxl-2.jpg'],
      attributes: {
        width: '1050 мм',
        height: '2200 мм',
        thickness: '120 мм',
        steel_thickness: '2.5 мм',
        insulation: 'Пенополиуретан + минвата',
        lock: 'Трехсистемный',
        color_outside: 'Черный муар',
        color_inside: 'Белый софт',
        thermal_break: true,
      },
    },
    {
      name: 'Входная дверь ТТ XL "Классика"',
      slug: 'tt-xl-classic',
      description:
        'Классическая входная дверь ТТ XL с элегантным дизайном. Декоративные молдинги, патина.',
      sku: 'TT-XL-003',
      price: 54700,
      comparePrice: 62000,
      stock: 2,
      images: ['/images/products/door-tt-xl-3.jpg'],
      attributes: {
        width: '960 мм',
        height: '2050 мм',
        thickness: '100 мм',
        steel_thickness: '2.0 мм',
        insulation: 'Минеральная вата',
        lock: 'Двухсистемный Mottura',
        color_outside: 'Слоновая кость с патиной',
        color_inside: 'Слоновая кость',
        thermal_break: true,
      },
    },
    {
      name: 'Входная дверь ТТ XXL "Модерн"',
      slug: 'tt-xxl-modern',
      description:
        'Современная входная дверь ТТ XXL в стиле модерн. Минималистичный дизайн, скрытые петли.',
      sku: 'TT-XXL-003',
      price: 92000,
      comparePrice: 105000,
      stock: 1,
      images: ['/images/products/door-tt-xxl-3.jpg'],
      attributes: {
        width: '1100 мм',
        height: '2300 мм',
        thickness: '115 мм',
        steel_thickness: '3.0 мм',
        insulation: 'Пенополиуретан',
        lock: 'Электронный кодовый',
        color_outside: 'Антрацит матовый',
        color_inside: 'Бетон светлый',
        thermal_break: true,
      },
    },
  ];

  for (const productData of entranceDoorProducts) {
    await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {
        ...productData,
        categoryId: ttXlXxlCategory.id,
      },
      create: {
        ...productData,
        categoryId: ttXlXxlCategory.id,
        isActive: true,
        isFeatured: true,
      },
    });
  }

  console.log('✅ Created entrance door products (ТТ XL / XXL)');

  // ============================================
  // ДРУГИЕ ТОВАРЫ (для других категорий)
  // ============================================

  const product2 = await prisma.product.upsert({
    where: { slug: 'window-plastic-veka' },
    update: {},
    create: {
      name: 'Окно пластиковое Veka',
      slug: 'window-plastic-veka',
      description: 'Качественное пластиковое окно от производителя Veka',
      sku: 'WIN-001',
      price: 12000,
      comparePrice: 15000,
      stock: 5,
      categoryId: windowsCategory.id,
      isActive: true,
      isFeatured: true,
      images: ['/images/products/window.jpg'],
    },
  });

  const product3 = await prisma.product.upsert({
    where: { slug: 'sofa-modern' },
    update: {},
    create: {
      name: 'Диван современный',
      slug: 'sofa-modern',
      description: 'Удобный диван в современном стиле',
      sku: 'FURN-001',
      price: 35000,
      comparePrice: 45000,
      stock: 3,
      categoryId: furnitureCategory.id,
      isActive: true,
      isFeatured: true,
      images: ['/images/products/div.jpg'],
    },
  });

  console.log('✅ Created other products');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
