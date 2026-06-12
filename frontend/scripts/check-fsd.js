#!/usr/bin/env node

/**
 * @deprecated Используйте `npm run check-architecture`.
 * Скрипт сохранён для обратной совместимости.
 */

const { spawnSync } = require('child_process');
const path = require('path');

console.warn('⚠️  check-fsd устарел. Запускается check-architecture…\n');

const result = spawnSync(process.execPath, [path.join(__dirname, 'check-architecture.mjs')], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
