/**
 * Генерирует Prisma Client после npm install, если есть schema и CLI.
 * Пропускается в Docker до COPY prisma/ и при npm ci --omit=dev (нет prisma в devDeps).
 */
const { existsSync, readdirSync } = require('fs');
const { execSync } = require('child_process');

if (!existsSync('prisma/schema.prisma')) {
  process.exit(0);
}

try {
  require.resolve('prisma/package.json');
} catch {
  process.exit(0);
}

execSync('prisma generate', { stdio: 'inherit' });

// bcrypt — нативный модуль; на Windows после смены Node часто нет .node без rebuild
try {
  require.resolve('bcrypt/package.json');
  const bindingDir = 'node_modules/bcrypt/lib/binding';
  if (!existsSync(bindingDir) || !readdirSync(bindingDir).length) {
    execSync('npm rebuild bcrypt', { stdio: 'inherit' });
  }
} catch {
  // bcrypt не установлен (например npm ci --omit=dev в образе без auth)
}
