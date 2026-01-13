import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create test user
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
    },
  });
  console.log('✅ Created test user:', user.email);

  // Create categories
  const doorsCategory = await prisma.category.upsert({
    where: { slug: 'doors' },
    update: {},
    create: {
      name: 'Двери',
      slug: 'doors',
      description: 'Входные и межкомнатные двери',
      order: 1,
    },
  });

  const windowsCategory = await prisma.category.upsert({
    where: { slug: 'windows' },
    update: {},
    create: {
      name: 'Окна',
      slug: 'windows',
      description: 'Пластиковые и алюминиевые окна',
      order: 2,
    },
  });

  const furnitureCategory = await prisma.category.upsert({
    where: { slug: 'furniture' },
    update: {},
    create: {
      name: 'Мебель',
      slug: 'furniture',
      description: 'Мягкая мебель и мебель на заказ',
      order: 3,
    },
  });

  console.log('✅ Created categories');

  // Create products
  const product1 = await prisma.product.upsert({
    where: { slug: 'entrance-door-metal' },
    update: {},
    create: {
      name: 'Дверь входная металлическая',
      slug: 'entrance-door-metal',
      description: 'Надежная входная дверь из металла',
      sku: 'DOOR-001',
      price: 15000,
      comparePrice: 18000,
      stock: 10,
      categoryId: doorsCategory.id,
      isActive: true,
      isFeatured: true,
      images: ['/images/products/door-classic.jpg'],
    },
  });

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

  console.log('✅ Created products');
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
