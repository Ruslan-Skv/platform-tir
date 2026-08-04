/**
 * Cross-platform commit entry for `npm run commit`.
 * Ensures Git is on PATH (Cursor/Windows often miss User PATH).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');

function ensureGitOnPath() {
  const which = process.platform === 'win32' ? 'where' : 'which';
  const probe = spawnSync(which, ['git'], { encoding: 'utf8', shell: true });
  if (probe.status === 0) return;

  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Git\\cmd',
          'C:\\Program Files (x86)\\Git\\cmd',
          path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'cmd'),
        ]
      : ['/usr/bin', '/usr/local/bin', '/opt/homebrew/bin'];

  for (const dir of candidates) {
    const exe = process.platform === 'win32' ? path.join(dir, 'git.exe') : path.join(dir, 'git');
    if (fs.existsSync(exe)) {
      process.env.PATH = `${dir}${path.delimiter}${process.env.PATH || ''}`;
      return;
    }
  }
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

ensureGitOnPath();

const gitCheck = spawnSync('git', ['--version'], {
  encoding: 'utf8',
  shell: true,
  env: process.env,
});
if (gitCheck.status !== 0) {
  console.error(
    'git не найден. Установите Git for Windows и добавьте в Path:\n  C:\\Program Files\\Git\\cmd'
  );
  process.exit(1);
}

run('git', ['add', '-A'], root);
run('npx', ['cz'], backend);
run('node', [path.join(root, 'scripts', 'print-precommit-summary.mjs')], backend);
