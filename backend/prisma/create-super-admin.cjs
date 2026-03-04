/**
 * Production-friendly script to create super-admin (runs with node, no ts-node).
 * Usage: node prisma/create-super-admin.cjs
 * Docker: docker compose exec backend node prisma/create-super-admin.cjs
 *
 * Env: SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD (optional)
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

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
  console.log('\n   Вход в админку: /admin/login');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
