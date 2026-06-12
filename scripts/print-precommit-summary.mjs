#!/usr/bin/env node

/**
 * Печатает сводку pre-commit в конце `npm run commit` (после git commit).
 * Сводка записывается хуком backend/.husky/pre-commit.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const summaryPath = path.join(repoRoot, '.git', 'precommit-summary.txt');

if (!fs.existsSync(summaryPath)) {
  process.exit(0);
}

const summary = fs.readFileSync(summaryPath, 'utf8').trimEnd();
if (!summary) {
  process.exit(0);
}

const width = 62;
const line = '═'.repeat(width);

console.log('');
console.log(`╔${line}╗`);
console.log(`║${' 📋 Pre-commit: сводка проверок '.padEnd(width)}║`);
console.log(`╚${line}╝`);
console.log(summary);
console.log('');
