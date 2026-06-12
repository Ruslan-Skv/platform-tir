/** @type {import('lint-staged').Configuration} */
module.exports = {
  'backend/src/**/*.ts': [
    'node scripts/lint-staged-workspace.js backend npx prettier --write',
    'node scripts/lint-staged-workspace.js backend npx eslint --fix',
    'node scripts/lint-staged-workspace.js backend npx secretlint --format stylish',
  ],
  'backend/prisma/seed.ts': [
    'node scripts/lint-staged-workspace.js backend npx prettier --write',
    'node scripts/lint-staged-workspace.js backend npx secretlint --format stylish',
  ],
  'backend/**/*.{js,json,md}': [
    'node scripts/lint-staged-workspace.js backend npx prettier --write',
    'node scripts/lint-staged-workspace.js backend npx secretlint --format stylish',
  ],
  '!backend/package-lock.json': [],
  'backend/**/*.prisma': [
    'node scripts/lint-staged-workspace.js backend npx prisma format',
  ],
  'frontend/**/*.{ts,tsx,js,jsx,json,css,scss,md}': [
    'node scripts/lint-staged-workspace.js frontend npx prettier --write',
  ],
};
