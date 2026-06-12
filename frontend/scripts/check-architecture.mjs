#!/usr/bin/env node

/**
 * Проверка архитектуры frontend.
 * @see frontend/docs/ARCHITECTURE.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './architecture.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(FRONTEND_ROOT, 'src');

/** @typedef {{ layers: string[], allowedImports: Record<string, string[]>, allowlist: Array<{ file: string, import: string, reason: string, severity: 'warn'|'error' }>, moduleRoots: Array<{ dir: string, allowedFiles: string[] }>, maxFilesPerDir: { default: number, overrides: Array<{ glob: string, max: number, severity?: 'warn'|'error' }> }, appPageMaxLines: number, maxRelativeDepth: number }} ArchitectureConfig */

const IMPORT_RE = /^\s*import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/;

/** @type {string[]} */
const errors = [];
/** @type {string[]} */
const warnings = [];
/** @type {Map<string, string>} */
const allowlistedDebt = new Map();

const VERBOSE = process.argv.includes('--verbose');

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function relSrc(absPath) {
  return toPosix(path.relative(SRC_DIR, absPath));
}

function globMatch(pattern, value) {
  const normalized = toPosix(value);
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  }
  const re = new RegExp(
    `^${pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')}$`
  );
  return re.test(normalized);
}

function getLayer(absPath) {
  const rel = relSrc(absPath);
  for (const layer of config.layers) {
    if (rel === layer || rel.startsWith(`${layer}/`)) return layer;
  }
  return null;
}

function resolveImport(fromFile, importPath) {
  if (importPath.startsWith('@/')) {
    return path.join(SRC_DIR, importPath.slice(2));
  }
  if (importPath.startsWith('.')) {
    const base = path.resolve(path.dirname(fromFile), importPath);
    return tryResolveFile(base);
  }
  return null;
}

const TRY_EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function tryResolveFile(base) {
  for (const ext of TRY_EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return base;
}

function collectImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  for (const line of content.split('\n')) {
    const m = line.match(IMPORT_RE);
    if (m) imports.push({ spec: m[1], line: line.trim() });
  }
  return imports;
}

function findAllowlistEntry(fromRel, importSpec) {
  for (const entry of config.allowlist) {
    if (!globMatch(entry.file, fromRel)) continue;
    const importPattern = entry.import.startsWith('@/')
      ? entry.import.slice(2)
      : entry.import;
    if (importSpec.startsWith('@/')) {
      const rest = importSpec.slice(2);
      if (globMatch(importPattern, rest)) return entry;
    }
  }
  return null;
}

function checkLayerBoundaries() {
  const files = walkFiles(SRC_DIR, (f) => /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.(ts|tsx)$/.test(f));

  for (const file of files) {
    const fromLayer = getLayer(file);
    if (!fromLayer) continue;

    const fromRel = relSrc(file);
    const allowed = config.allowedImports[fromLayer] ?? [];

    for (const { spec, line } of collectImports(file)) {
      const resolved = resolveImport(file, spec);
      if (!resolved) continue;

      const toLayer = getLayer(resolved);
      if (!toLayer || toLayer === fromLayer) continue;

      if (allowed.includes(toLayer)) continue;

      const allowEntry = findAllowlistEntry(fromRel, spec);
      const allowSeverity = allowEntry?.severity;
      const msg = `${fromRel} — импорт из слоя «${toLayer}» запрещён для «${fromLayer}»: ${spec}\n    ${line}`;

      if (allowSeverity === 'warn') {
        allowlistedDebt.set(fromRel, allowEntry.reason ?? msg);
        continue;
      }
      if (allowSeverity === 'error') {
        errors.push(`❌ ${msg} (allowlist)`);
        continue;
      }

      errors.push(`❌ ${msg}`);
    }
  }
}

function checkModuleRoots() {
  for (const { dir, allowedFiles } of config.moduleRoots) {
    const absDir = path.join(SRC_DIR, dir);
    if (!fs.existsSync(absDir)) continue;

    for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (allowedFiles.includes(entry.name)) continue;
      if (entry.name.endsWith('.md')) continue;
      errors.push(
        `❌ ${dir}/ — в корне модуля лишний файл «${entry.name}». Разрешены: ${allowedFiles.join(', ')}`
      );
    }
  }
}

function countTsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).filter(
    (e) => e.isFile() && /\.tsx?$/.test(e.name) && !/\.(test|spec)\.tsx?$/.test(e.name)
  ).length;
}

function checkMaxFilesPerDir() {
  const dirs = walkDirs(SRC_DIR);

  for (const dir of dirs) {
    const count = countTsFiles(dir);
    const rel = relSrc(dir);
    let max = config.maxFilesPerDir.default;
    let severity = 'error';

    for (const override of config.maxFilesPerDir.overrides) {
      if (globMatch(override.glob, rel)) {
        max = override.max;
        severity = override.severity ?? 'error';
        break;
      }
    }

    if (count <= max) continue;

    const msg = `${rel}/ — ${count} файлов .ts/.tsx (лимит ${max}). Разбейте на подпапки.`;
    if (severity === 'warn') warnings.push(`⚠️  ${msg}`);
    else errors.push(`❌ ${msg}`);
  }
}

function checkAppPagesThin() {
  // Строго для новых разделов; остальной app/ — постепенная миграция
  const pages = walkFiles(
    SRC_DIR,
    (f) =>
      /[/\\]app[/\\]admin[/\\]contract-documents[/\\].*[/\\]page\.tsx$/.test(f) ||
      /[/\\]app[/\\]admin[/\\]contract-documents[/\\]page\.tsx$/.test(f)
  );

  for (const file of pages) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;
    if (lines <= config.appPageMaxLines) continue;
    errors.push(
      `❌ ${relSrc(file)} — ${lines} строк (лимит ${config.appPageMaxLines}). Вынесите логику в views/.`
    );
  }
}

function checkRelativeImportDepth() {
  const files = walkFiles(SRC_DIR, (f) => /\.(ts|tsx)$/.test(f));

  for (const file of files) {
    const fromRel = relSrc(file);
    for (const { spec, line } of collectImports(file)) {
      if (!spec.startsWith('.')) continue;
      const depth = (spec.match(/\.\.\//g) || []).length;
      if (depth < config.maxRelativeDepth) continue;
      if (!VERBOSE) continue;
      warnings.push(
        `⚠️  ${fromRel} — глубокий относительный импорт (${depth}× ..): ${spec}\n    ${line}`
      );
    }
  }
}

function checkCssModuleTypeImports() {
  const files = walkFiles(SRC_DIR, (f) => /\.(ts|tsx)$/.test(f));

  for (const file of files) {
    const fromRel = relSrc(file);
    for (const { spec, line } of collectImports(file)) {
      if (!spec.endsWith('.module.css')) continue;
      if (line.includes('import type') || /\{\s*type\s+/.test(line) || /\{\s*[A-Z]/.test(line)) {
        if (line.match(/import\s+[\w*,\s{}]+\s+from/) && !line.match(/import\s+type\s+\{/)) {
          const isStyleDefault = /^import\s+\w+\s+from/.test(line) && !line.includes('{');
          if (!isStyleDefault) {
            errors.push(
              `❌ ${fromRel} — типы/компоненты нельзя импортировать из .module.css: ${spec}\n    ${line}`
            );
          }
        }
      }
    }
  }
}

function walkFiles(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function walkDirs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  acc.push(dir);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue;
    if (entry.isDirectory()) walkDirs(path.join(dir, entry.name), acc);
  }
  return acc;
}

function main() {
  console.log('🔍 Проверка архитектуры frontend…\n');

  checkLayerBoundaries();
  checkModuleRoots();
  checkMaxFilesPerDir();
  checkAppPagesThin();
  checkRelativeImportDepth();
  checkCssModuleTypeImports();

  if (allowlistedDebt.size > 0) {
    console.log(`📋 Известный техдолг (${allowlistedDebt.size} файлов, не блокирует commit):`);
    for (const [file, reason] of allowlistedDebt) {
      console.log(`  • ${file} — ${reason}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Предупреждения (${warnings.length}):`);
    for (const w of warnings.slice(0, 15)) console.log(`  ${w}`);
    if (warnings.length > 15) console.log(`  … и ещё ${warnings.length - 15}`);
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`❌ Ошибки архитектуры (${errors.length}):`);
    for (const e of errors) console.log(`  ${e}`);
    console.log('\nСм. frontend/docs/ARCHITECTURE.md\n');
    process.exit(1);
  }

  console.log(
    `✅ Архитектура в порядке${warnings.length ? ` (${warnings.length} предупреждений — см. выше)` : ''}.\n`
  );
}

main();
