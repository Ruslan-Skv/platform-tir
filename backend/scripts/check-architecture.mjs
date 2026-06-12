#!/usr/bin/env node

/**
 * Проверка архитектуры backend (NestJS).
 * @see backend/docs/ARCHITECTURE.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './architecture.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', 'src');

/** @typedef {{ zones: Record<string, string[]>, allowedImports: Record<string, string[]>, allowlist: Array<{ file: string, rule: string, reason: string, severity: 'warn'|'error' }>, moduleRootMaxFiles: number, dtoDirWarnThreshold: number, largeServiceLineThreshold: number }} ArchitectureConfig */

const IMPORT_RE = /^\s*import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/;

const errors = [];
const warnings = [];
const allowlistedDebt = new Map();

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

function getZone(relPath) {
  const rel = toPosix(relPath);
  if (config.zones.bootstrap.includes(rel)) return 'bootstrap';
  for (const prefix of config.zones.infrastructure) {
    if (rel === prefix || rel.startsWith(`${prefix}/`)) return 'infrastructure';
  }
  for (const prefix of config.zones.core) {
    if (rel === prefix || rel.startsWith(`${prefix}/`)) return 'core';
  }
  if (rel === 'admin' || rel.startsWith('admin/')) return 'admin';
  return 'public';
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

const TRY_EXTENSIONS = ['', '.ts', '.tsx', '/index.ts'];

function tryResolveFile(base) {
  for (const ext of TRY_EXTENSIONS) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return base;
}

function findAllowlist(fileRel, rule) {
  return config.allowlist.find((e) => e.rule === rule && globMatch(e.file, fileRel));
}

function collectImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  for (const line of content.split('\n')) {
    const m = line.match(IMPORT_RE);
    if (m) imports.push({ spec: m[1], line: line.trim() });
  }
  return { content, imports };
}

function checkZoneBoundaries() {
  const files = walkFiles(SRC_DIR, (f) => /\.ts$/.test(f) && !/\.spec\.ts$/.test(f));

  for (const file of files) {
    const fromRel = relSrc(file);
    const fromZone = getZone(fromRel);
    const allowed = config.allowedImports[fromZone] ?? [];

    for (const { spec, line } of collectImports(file).imports) {
      const resolved = resolveImport(file, spec);
      if (!resolved) continue;

      const toRel = relSrc(resolved);
      const toZone = getZone(toRel);
      if (toZone === fromZone) continue;
      if (allowed.includes(toZone)) continue;

      errors.push(
        `❌ ${fromRel} — импорт из зоны «${toZone}» запрещён для «${fromZone}»: ${spec}\n    ${line}`
      );
    }
  }
}

function checkPrismaInControllers() {
  const controllers = walkFiles(SRC_DIR, (f) => f.endsWith('.controller.ts'));

  for (const file of controllers) {
    const rel = relSrc(file);
    const { content, imports } = collectImports(file);
    const usesPrisma =
      imports.some((i) => /prisma\.service/i.test(i.spec)) ||
      /PrismaService/.test(content);
    if (!usesPrisma) continue;

    const entry = findAllowlist(rel, 'prisma-in-controller');
    if (entry) {
      allowlistedDebt.set(rel, entry.reason);
      continue;
    }

    errors.push(`❌ ${rel} — PrismaService в controller. Логику БД держите в service.`);
  }
}

function checkModuleRootFileCount() {
  const moduleFiles = walkFiles(SRC_DIR, (f) => f.endsWith('.module.ts'));

  for (const moduleFile of moduleFiles) {
    const dir = path.dirname(moduleFile);
    const relDir = relSrc(dir);
    const rootTsFiles = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter(
        (e) =>
          e.isFile() &&
          e.name.endsWith('.ts') &&
          !e.name.endsWith('.spec.ts') &&
          e.name !== path.basename(moduleFile)
      );

    if (rootTsFiles.length <= config.moduleRootMaxFiles) continue;

    errors.push(
      `❌ ${relDir}/ — ${rootTsFiles.length} .ts в корне модуля (лимит ${config.moduleRootMaxFiles}). Вынесите в dto/, services/ или подмодули.`
    );

    const dtoDir = path.join(dir, 'dto');
    if (fs.existsSync(dtoDir)) {
      const dtoCount = fs.readdirSync(dtoDir).filter((f) => f.endsWith('.ts')).length;
      if (dtoCount > config.dtoDirWarnThreshold) {
        warnings.push(
          `⚠️  ${relDir}/dto/ — ${dtoCount} файлов. Рассмотрите группировку по поддомену.`
        );
      }
    }
  }
}

function checkLargeServices() {
  const services = walkFiles(SRC_DIR, (f) => f.endsWith('.service.ts') && !f.endsWith('.spec.ts'));

  for (const file of services) {
    const rel = relSrc(file);
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;
    if (lines <= config.largeServiceLineThreshold) continue;

    const entry = findAllowlist(rel, 'large-service');
    if (entry) {
      allowlistedDebt.set(rel, `${entry.reason} (${lines} строк)`);
      continue;
    }

    warnings.push(
      `⚠️  ${rel} — ${lines} строк (рекомендуется ≤ ${config.largeServiceLineThreshold}). Декомпозируйте service.`
    );
  }
}

function walkFiles(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function main() {
  console.log('🔍 Проверка архитектуры backend…\n');

  checkZoneBoundaries();
  checkPrismaInControllers();
  checkModuleRootFileCount();
  checkLargeServices();

  if (allowlistedDebt.size > 0) {
    console.log(`📋 Известный техдолг (${allowlistedDebt.size}):`);
    for (const [file, reason] of allowlistedDebt) {
      console.log(`  • ${file} — ${reason}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Предупреждения (${warnings.length}):`);
    for (const w of warnings.slice(0, 10)) console.log(`  ${w}`);
    if (warnings.length > 10) console.log(`  … и ещё ${warnings.length - 10}`);
    console.log('');
  }

  if (errors.length > 0) {
    console.log(`❌ Ошибки (${errors.length}):`);
    for (const e of errors) console.log(`  ${e}`);
    console.log('\nСм. backend/docs/ARCHITECTURE.md\n');
    process.exit(1);
  }

  console.log(
    `✅ Архитектура backend в порядке${warnings.length || allowlistedDebt.size ? ' (есть предупреждения/техдолг)' : ''}.\n`
  );
}

main();
