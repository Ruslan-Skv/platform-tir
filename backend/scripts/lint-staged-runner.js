#!/usr/bin/env node

/**
 * @deprecated Используйте `scripts/lint-staged-workspace.js` из корня репозитория.
 * Оставлен как обёртка для обратной совместимости.
 *
 * Usage: node backend/scripts/lint-staged-runner.js "<command>" <file> [...]
 * Example: node backend/scripts/lint-staged-runner.js "npx eslint --fix" backend/src/foo.ts
 */

const { spawnSync } = require('child_process');
const path = require('path');

const command = process.argv[2];
const files = process.argv.slice(3);

if (!command || files.length === 0) {
  process.exit(0);
}

const workspaceRunner = path.resolve(__dirname, '../../scripts/lint-staged-workspace.js');
const args = [workspaceRunner, 'backend', ...command.split(' '), ...files];

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
