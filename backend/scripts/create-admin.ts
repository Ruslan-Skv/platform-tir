/**
 * Скрипт для создания администратора
 * Использование: npx ts-node scripts/create-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password-crypto';

const prisma = new PrismaClient();

async function createAdmin() {
  const email = 'admin@tir.ru';
  const password = 'admin123'; // Измените на безопасный пароль!
  const firstName = 'Администратор';
  const lastName = 'Системы';

  console.log('🔐 Создание администратора...\n');

  // Проверяем, существует ли пользователь
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // Обновляем роль если пользователь существует
    const updated = await prisma.user.update({
      where: { email },
      data: { 
        role: 'ADMIN',
        firstName,
        lastName,
      },
    });
    console.log(`✅ Пользователь обновлён до ADMIN:`);
    console.log(`   Email: ${updated.email}`);
    console.log(`   Роль: ${updated.role}`);
  } else {
    // Создаём нового пользователя
    const hashedPassword = await hashPassword(password);
    
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'ADMIN',
      },
    });

    console.log(`✅ Администратор создан:`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Пароль: ${password}`);
    console.log(`   Роль: ${admin.role}`);
  }

  console.log('\n📋 Данные для входа в админку:');
  console.log('   URL: http://localhost:3000/admin/login');
  console.log(`   Email: ${email}`);
  console.log(`   Пароль: ${password}`);
  console.log('\n⚠️  ВАЖНО: Смените пароль после первого входа!');
}

async function main() {
  try {
    await createAdmin();
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
