#!/usr/bin/env node

/**
 * Запускает команду в контексте workspace (backend/ или frontend/),
 * чтобы резолвились локальные node_modules (prettier plugins и т.д.).
 *
 * Usage: node scripts/lint-staged-workspace.js <workspace> <command...> <file> [...]
 * Example: node scripts/lint-staged-workspace.js frontend npx prettier --write src/foo.ts
 */

const { execSync } = require('child_process');
const path = require('path');

const workspace = process.argv[2];

function isFileArg(arg) {
  const normalized = path.normalize(arg).replace(/\\/g, '/');
  if (normalized.includes(`${workspace}/`)) {
    return true;
  }
  if (path.isAbsolute(arg)) {
    return true;
  }
  return /^[a-zA-Z]:[\\/]/.test(arg);
}

let commandEnd = 3;
while (commandEnd < process.argv.length && !isFileArg(process.argv[commandEnd])) {
  commandEnd++;
}

const command = process.argv.slice(3, commandEnd).join(' ');
const files = process.argv.slice(commandEnd);

if (!workspace || !command || files.length === 0) {
  process.exit(0);
}

const workspaceDir = path.resolve(__dirname, '..', workspace);

const relativeFiles = files.map((file) => {
  const normalized = path.normalize(file).replace(/\\/g, '/');
  const match = normalized.match(new RegExp(`^${workspace}/(.+)$`));
  if (match) {
    return match[1];
  }
  return path.relative(workspaceDir, path.resolve(file)).replace(/\\/g, '/');
});

try {
  process.chdir(workspaceDir);
  const fullCommand = `${command} ${relativeFiles.map((f) => `"${f}"`).join(' ')}`;
  execSync(fullCommand, { stdio: 'inherit', shell: true });
} catch {
  process.exit(1);
}
