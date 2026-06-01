/**
 * Генерирует Prisma Client после npm install, если есть schema и CLI.
 * Пропускается в Docker до COPY prisma/ и при npm ci --omit=dev (нет prisma в devDeps).
 */
const { existsSync } = require('fs');
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
