#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const command = process.argv[2];
const files = process.argv.slice(3);

if (!command || files.length === 0) {
  process.exit(0);
}

const backendDir = path.resolve(__dirname, '..');
const relativeFiles = files.map(f => {
  // Нормализуем путь и извлекаем относительный путь от backend
  const normalized = path.normalize(f).replace(/\\/g, '/');
  const match = normalized.match(/backend[\\/](.+)$/);
  if (match) {
    return match[1];
  }
  // Если путь уже относительный от backend
  const relative = path.relative(backendDir, path.resolve(f));
  return relative.replace(/\\/g, '/');
});

try {
  // Переходим в backend директорию и выполняем команду
  process.chdir(backendDir);
  const fullCommand = `${command} ${relativeFiles.map(f => `"${f}"`).join(' ')}`;
  execSync(fullCommand, { stdio: 'inherit', shell: true });
} catch (error) {
  process.exit(1);
}
