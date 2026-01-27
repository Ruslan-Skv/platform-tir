/**
 * Скрипт для применения миграции добавления поля supplierProductUrl
 * Использование: node scripts/apply-supplier-url-migration.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Применение миграции: добавление поля supplierProductUrl...');
    
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "product_suppliers" 
      ADD COLUMN IF NOT EXISTS "supplierProductUrl" TEXT;
    `);

    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN "product_suppliers"."supplierProductUrl" 
      IS 'Ссылка на товар у поставщика для автоматического получения цены';
    `);

    console.log('✅ Миграция успешно применена!');
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
