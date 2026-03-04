/**
 * Скрипт для создания супер-администратора.
 * Запуск: npx ts-node -r tsconfig-paths/register prisma/create-super-admin.ts
 * Или через Docker: docker compose exec backend npx ts-node -r tsconfig-paths/register prisma/create-super-admin.ts
 *
 * Переменные окружения (опционально):
 *   SUPER_ADMIN_EMAIL    — email (по умолчанию: admin@platform.local)
 *   SUPER_ADMIN_PASSWORD — пароль (по умолчанию: Admin123!)
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_EMAIL = 'admin@platform.local';
const DEFAULT_PASSWORD = 'Admin123!';

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || DEFAULT_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD;

  const hashedPassword = await bcrypt.hash(password, 10);

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
