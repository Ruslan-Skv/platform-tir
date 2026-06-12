/** @type {import('lint-staged').Configuration} */
module.exports = {
  'backend/src/**/*.ts': [
    'node scripts/lint-staged-workspace.js backend npx prettier --write',
    'node scripts/lint-staged-workspace.js backend npx eslint --fix',
    'node scripts/lint-staged-workspace.js backend npx secretlint',
  ],
  'backend/prisma/seed.ts': [
    'node scripts/lint-staged-workspace.js backend npx prettier --write',
    'node scripts/lint-staged-workspace.js backend npx secretlint',
  ],
  'backend/**/*.{js,json,md}': [
    'node scripts/lint-staged-workspace.js backend npx prettier --write',
    'node scripts/lint-staged-workspace.js backend npx secretlint',
  ],
  '!backend/package-lock.json': [],
  'backend/**/*.prisma': [
    'node scripts/lint-staged-workspace.js backend npx prisma format',
  ],
  'frontend/**/*.{ts,tsx,js,jsx,json,css,scss,md}': [
    'node scripts/lint-staged-workspace.js frontend npx prettier --write',
  ],
};
