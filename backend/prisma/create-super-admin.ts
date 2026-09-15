/**
 * Скрипт для создания супер-администратора.
 * Запуск: npx ts-node -r tsconfig-paths/register prisma/create-super-admin.ts
 * Или через Docker: docker compose exec backend npx ts-node -r tsconfig-paths/register prisma/create-super-admin.ts
 *
 * Переменные окружения (из .env или env):
 *   SUPER_ADMIN_EMAIL    — email (по умолчанию: admin@platform.local)
 *   SUPER_ADMIN_PASSWORD — пароль (обязательно; если не задан — генерируется
 *                          случайный и печатается один раз в консоль)
 */

// Загружаем .env до остальных импортов (сначала корень проекта, затем backend/)
require('dotenv').config({ path: require('path').resolve(process.cwd(), '../.env') });
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });

import { randomBytes } from 'crypto';

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password-crypto';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'admin@platform.local';

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || DEFAULT_EMAIL;
  const generatedPassword = randomBytes(12).toString('base64url');
  const password = process.env.SUPER_ADMIN_PASSWORD || generatedPassword;

  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      firstName: 'Super',
      lastName: 'Admin',
      isActive: true,
    },
    create: {
      email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Супер-администратор создан/обновлён:');
  console.log(`   Email:    ${user.email}`);
  console.log(`   Пароль:   ${password}`);
  console.log(`   Роль:     ${user.role}`);
  console.log('\n   Вход в админку: http://localhost:3000/admin/login');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
