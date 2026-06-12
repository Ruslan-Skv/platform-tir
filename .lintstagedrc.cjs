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
  'frontend/**/*.{ts,tsx,js,jsx}': [
    'node scripts/lint-staged-workspace.js frontend npx prettier --write',
    'node scripts/lint-staged-workspace.js frontend npx secretlint --format stylish',
  ],
  'frontend/scripts/**/*.{js,mjs,ts}': [
    'node scripts/lint-staged-workspace.js frontend npx prettier --write',
    'node scripts/lint-staged-workspace.js frontend npx secretlint --format stylish',
  ],
  'frontend/**/*.{json,md}': [
    'node scripts/lint-staged-workspace.js frontend npx prettier --write',
    'node scripts/lint-staged-workspace.js frontend npx secretlint --format stylish',
  ],
  '!frontend/package-lock.json': [],
  'frontend/**/*.{css,scss}': [
    'node scripts/lint-staged-workspace.js frontend npx prettier --write',
  ],
};
