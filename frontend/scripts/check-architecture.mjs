#!/usr/bin/env node

/**
 * Проверка архитектуры frontend.
 * @see frontend/docs/ARCHITECTURE.md
 *
 * Флаги:
 *   --verbose  глубокие относительные импорты
 *   --audit    полный отчёт по всем категориям (без обрезки предупреждений)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './architecture.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(FRONTEND_ROOT, 'src');

/**
 * @typedef {Object} ArchitectureConfig
 * @property {string[]} layers
 * @property {Record<string, string[]>} allowedImports
 * @property {Array<{ file: string, import: string, reason: string, severity: 'warn'|'error' }>} allowlist
 * @property {Array<{ dir: string, allowedFiles: string[] }>} moduleRoots
 * @property {{ default: number, overrides: Array<{ glob: string, max: number, severity?: 'warn'|'error' }> }} maxFilesPerDir
 * @property {import('./architecture.config.mjs').default['viewsAdminLayout']} [viewsAdminLayout]
 * @property {number} appPageMaxLines
 * @property {{ max: number, glob: string, excludeGlobs?: string[], severity?: 'warn'|'error' }} [viewPageShellMaxLines]
 * @property {{ max: number, glob: string, excludeGlobs?: string[], severity?: 'warn'|'error' }} [viewPageMaxLines]
 * @property {number} maxRelativeDepth
 */

const IMPORT_RE = /^\s*import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/;

const VERBOSE = process.argv.includes('--verbose');
const AUDIT = process.argv.includes('--audit');

const IGNORED_DIR_NAMES = new Set(['node_modules', '.next', '__tests__']);

/** @type {Map<string, string>} */
const allowlistedDebt = new Map();

class ViolationCollector {
  constructor() {
    /** @type {Array<{ severity: 'error'|'warn', category: string, message: string, sortKey?: string|number }>} */
    this.items = [];
  }

  /**
   * @param {'error'|'warn'} severity
   * @param {string} category
   * @param {string} message
   * @param {{ sortKey?: string|number }} [meta]
   */
  add(severity, category, message, meta = {}) {
    this.items.push({ severity, category, message, sortKey: meta.sortKey ?? message });
  }

  /** @returns {Map<string, typeof this.items>} */
  groupByCategory() {
    const map = new Map();
    for (const item of this.items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category).push(item);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ak = typeof a.sortKey === 'number' ? a.sortKey : String(a.sortKey);
        const bk = typeof b.sortKey === 'number' ? b.sortKey : String(b.sortKey);
        if (typeof ak === 'number' && typeof bk === 'number') return bk - ak;
        return String(bk).localeCompare(String(ak), 'ru');
      });
    }
    return map;
  }

  get errors() {
    return this.items.filter((i) => i.severity === 'error');
  }

  get warnings() {
    return this.items.filter((i) => i.severity === 'warn');
  }

  print() {
    const grouped = this.groupByCategory();
    const categoryOrder = [
      'layer-boundary',
      'module-root',
      'max-files-per-dir',
      'views-admin-grouped-root',
      'views-admin-flat-root',
      'view-page-shell',
      'view-page-thick',
      'app-page-thick',
      'css-module-types',
      'relative-import-depth',
    ];

    const printed = new Set();

    for (const category of categoryOrder) {
      if (!grouped.has(category)) continue;
      this.printCategory(category, grouped.get(category));
      printed.add(category);
    }

    for (const [category, items] of grouped) {
      if (printed.has(category)) continue;
      this.printCategory(category, items);
    }
  }

  /**
   * @param {string} category
   * @param {Array<{ severity: string, message: string }>} items
   */
  printCategory(category, items) {
    const errors = items.filter((i) => i.severity === 'error');
    const warnings = items.filter((i) => i.severity === 'warn');
    const icon = errors.length > 0 ? '❌' : '⚠️';
    const title = CATEGORY_TITLES[category] ?? category;

    console.log(`${icon} ${title} (${items.length}):`);
    const limit = AUDIT ? items.length : Math.min(items.length, 50);
    for (const item of items.slice(0, limit)) {
      const prefix = item.severity === 'error' ? '  ❌' : '  ⚠️';
      console.log(`${prefix} ${item.message}`);
    }
    if (!AUDIT && items.length > limit) {
      console.log(`  … и ещё ${items.length - limit} (запустите с --audit)`);
    }
    console.log('');
  }
}

/** @type {ViolationCollector} */
const collector = new ViolationCollector();

/** @type {Record<string, string>} */
const CATEGORY_TITLES = {
  'layer-boundary': 'Нарушения границ слоёв',
  'module-root': 'Лишние файлы в корне platform/editor или hub',
  'max-files-per-dir': 'Слишком много .ts/.tsx в одной папке',
  'views-admin-grouped-root': 'Домен views/admin с подпапками — лишние файлы в корне',
  'views-admin-flat-root': 'Плоский корень views/admin — нужна группировка',
  'view-page-shell': 'Толстые оболочки *Page.tsx (ожидается shell ≤ лимита)',
  'view-page-thick': 'Крупные *Page.tsx (нужна декомпозиция shell + hook + view)',
  'app-page-thick': 'Толстые app/**/page.tsx',
  'css-module-types': 'Импорт типов из *.module.css',
  'relative-import-depth': 'Глубокие относительные импорты',
};

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function relSrc(absPath) {
  return toPosix(path.relative(SRC_DIR, absPath));
}

function globToRegExpSource(pattern) {
  return pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');
}

function globMatch(pattern, value) {
  const normalized = toPosix(value);
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return normalized === prefix || normalized.startsWith(`${prefix}/`);
  }
  const re = new RegExp(`^${globToRegExpSource(pattern)}$`);
  return re.test(normalized);
}

function matchesAnyGlob(globs, value) {
  return globs.some((g) => globMatch(g, value));
}

function isTsSourceFile(name) {
  return /\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name);
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
    const importPattern = entry.import.startsWith('@/') ? entry.import.slice(2) : entry.import;
    if (importSpec.startsWith('@/')) {
      const rest = importSpec.slice(2);
      if (globMatch(importPattern, rest)) return entry;
    }
  }
  return null;
}

function listDirEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true });
}

function countTsFiles(dir) {
  return listDirEntries(dir).filter((e) => e.isFile() && isTsSourceFile(e.name)).length;
}

function listRootTsFiles(dir) {
  return listDirEntries(dir)
    .filter((e) => e.isFile() && isTsSourceFile(e.name))
    .map((e) => e.name);
}

function isAllowedRootFile(name, layout) {
  if (layout.allowedRootFiles?.includes(name)) return true;
  for (const pattern of layout.allowedRootGlobs ?? []) {
    if (pattern === '*.md' && name.endsWith('.md')) return true;
    if (pattern === 'README*' && name.startsWith('README')) return true;
  }
  return false;
}

function checkLayerBoundaries() {
  const files = walkFiles(
    SRC_DIR,
    (f) => /\.(ts|tsx)$/.test(f) && !/\.(test|spec)\.(ts|tsx)$/.test(f)
  );

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
      const msg = `${fromRel} — импорт из слоя «${toLayer}» запрещён для «${fromLayer}»: ${spec}\n      ${line}`;

      if (allowSeverity === 'warn') {
        allowlistedDebt.set(fromRel, allowEntry.reason ?? msg);
        continue;
      }
      if (allowSeverity === 'error') {
        collector.add('error', 'layer-boundary', `${msg} (allowlist)`);
        continue;
      }

      collector.add('error', 'layer-boundary', msg);
    }
  }
}

function checkModuleRoots() {
  for (const { dir, allowedFiles } of config.moduleRoots) {
    const absDir = path.join(SRC_DIR, dir);
    if (!fs.existsSync(absDir)) continue;

    for (const entry of listDirEntries(absDir)) {
      if (!entry.isFile()) continue;
      if (allowedFiles.includes(entry.name)) continue;
      if (entry.name.endsWith('.md')) continue;
      collector.add(
        'error',
        'module-root',
        `${dir}/ — в корне модуля лишний файл «${entry.name}». Разрешены: ${allowedFiles.join(', ')}`
      );
    }
  }
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

    collector.add(
      severity,
      'max-files-per-dir',
      `${rel}/ — ${count} файлов .ts/.tsx (лимит ${max}). Разбейте на подпапки.`,
      { sortKey: count }
    );
  }
}

function shouldSkipViewsAdminLayoutDir(rel, layout) {
  if (layout.excludeGlobs?.some((g) => globMatch(g, rel))) return true;
  const base = path.basename(rel);
  if (layout.skipDirBasenames?.some((b) => b.toLowerCase() === base.toLowerCase())) return true;
  return false;
}

function checkViewsAdminLayout() {
  const layout = config.viewsAdminLayout;
  if (!layout) return;

  const structural = new Set((layout.structuralSubdirs ?? []).map((s) => s.toLowerCase()));
  const severity = layout.severity ?? 'warn';
  const dirs = walkDirs(path.join(SRC_DIR, 'views', 'admin'));

  for (const dir of dirs) {
    const rel = relSrc(dir);
    if (shouldSkipViewsAdminLayoutDir(rel, layout)) continue;

    const entries = listDirEntries(dir);
    const subdirs = entries.filter((e) => e.isDirectory() && !IGNORED_DIR_NAMES.has(e.name));
    const rootTsNames = listRootTsFiles(dir);
    const rootTsCount = rootTsNames.length;

    const domainSubdirs = subdirs.filter((e) => !structural.has(e.name.toLowerCase()));
    const hasDomainSubdirs = domainSubdirs.length > 0;
    const groupedRoot = matchesAnyGlob(layout.groupedRootGlobs ?? [], rel);
    const flatRoot = matchesAnyGlob(layout.flatRootGlobs ?? [], rel);

    if (groupedRoot && hasDomainSubdirs) {
      const disallowed = rootTsNames.filter((name) => !isAllowedRootFile(name, layout));
      if (disallowed.length > 0) {
        const subdirList = domainSubdirs.map((d) => d.name).join(', ');
        collector.add(
          severity,
          'views-admin-grouped-root',
          `${rel}/ — в корне лишние файлы: ${disallowed.join(', ')}. ` +
            `Есть доменные подпапки (${subdirList}); в корне допускается только ${(layout.allowedRootFiles ?? ['index.ts']).join(', ')}.`,
          { sortKey: disallowed.length }
        );
      }
    } else if (flatRoot && rootTsCount > layout.maxRootTsFiles) {
      collector.add(
        severity,
        'views-admin-flat-root',
        `${rel}/ — ${rootTsCount} файлов .ts/.tsx в корне (лимит ${layout.maxRootTsFiles}). ` +
          `Сгруппируйте по list/edit/shared или подпапке раздела; публичный API — index.ts.`,
        { sortKey: rootTsCount }
      );
    }
  }
}

/**
 * @param {{ max: number, glob: string, excludeGlobs?: string[], severity?: 'warn'|'error' }} rule
 * @param {string} category
 * @param {string} label
 */
function checkViewPageLineLimit(rule, category, label) {
  if (!rule) return;

  const files = walkFiles(SRC_DIR, (f) => {
    const rel = relSrc(f);
    if (!/Page\.tsx$/.test(rel)) return false;
    if (!globMatch(rule.glob, rel)) return false;
    if (rule.excludeGlobs?.some((g) => globMatch(g, rel))) return false;
    return true;
  });

  const severity = rule.severity ?? 'warn';

  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;
    if (lines <= rule.max) continue;

    collector.add(severity, category, `${relSrc(file)} — ${lines} строк (${label} ${rule.max}).`, {
      sortKey: lines,
    });
  }
}

function checkAppPagesThin() {
  const pages = walkFiles(
    SRC_DIR,
    (f) =>
      /[/\\]app[/\\]admin[/\\]contract-documents[/\\].*[/\\]page\.tsx$/.test(f) ||
      /[/\\]app[/\\]admin[/\\]contract-documents[/\\]page\.tsx$/.test(f)
  );

  for (const file of pages) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;
    if (lines <= config.appPageMaxLines) continue;
    collector.add(
      'error',
      'app-page-thick',
      `${relSrc(file)} — ${lines} строк (лимит ${config.appPageMaxLines}). Вынесите логику в views/.`,
      { sortKey: lines }
    );
  }
}

function checkRelativeImportDepth() {
  if (!VERBOSE) return;

  const files = walkFiles(SRC_DIR, (f) => /\.(ts|tsx)$/.test(f));

  for (const file of files) {
    const fromRel = relSrc(file);
    for (const { spec, line } of collectImports(file)) {
      if (!spec.startsWith('.')) continue;
      const depth = (spec.match(/\.\.\//g) || []).length;
      if (depth < config.maxRelativeDepth) continue;
      collector.add(
        'warn',
        'relative-import-depth',
        `${fromRel} — глубокий относительный импорт (${depth}× ..): ${spec}\n      ${line}`
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
            collector.add(
              'error',
              'css-module-types',
              `${fromRel} — типы/компоненты нельзя импортировать из .module.css: ${spec}\n      ${line}`
            );
          }
        }
      }
    }
  }
}

function walkFiles(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of listDirEntries(dir)) {
    if (IGNORED_DIR_NAMES.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function walkDirs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  acc.push(dir);
  for (const entry of listDirEntries(dir)) {
    if (IGNORED_DIR_NAMES.has(entry.name)) continue;
    if (entry.isDirectory()) walkDirs(path.join(dir, entry.name), acc);
  }
  return acc;
}

function printWarningBreakdown() {
  const warnings = collector.warnings;
  if (warnings.length === 0) return;

  const byCategory = new Map();
  for (const item of warnings) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
  }

  console.log(`📊 Предупреждения (${warnings.length}):`);
  for (const [category, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ⚠️ ${CATEGORY_TITLES[category] ?? category}: ${count}`);
  }
  console.log('');
}

function printSummary() {
  const errors = collector.errors;
  const warnings = collector.warnings;

  if (errors.length === 0 && warnings.length === 0) return;

  console.log('─'.repeat(60));
  console.log(
    `Итого: ${errors.length} ошибок, ${warnings.length} предупреждений` +
      (AUDIT ? ' (режим --audit)' : '')
  );
  if (warnings.length > 0 && !AUDIT) {
    console.log('Подсказка: npm run check-architecture -- --audit — полный список предупреждений');
  }
  console.log('─'.repeat(60));
  console.log('');
}

function main() {
  console.log('🔍 Проверка архитектуры frontend…\n');

  checkLayerBoundaries();
  checkModuleRoots();
  checkMaxFilesPerDir();
  checkViewsAdminLayout();
  checkViewPageLineLimit(config.viewPageShellMaxLines, 'view-page-shell', 'лимит shell');
  checkViewPageLineLimit(config.viewPageMaxLines, 'view-page-thick', 'лимит');
  checkAppPagesThin();
  checkRelativeImportDepth();
  checkCssModuleTypeImports();

  if (allowlistedDebt.size > 0) {
    console.log(
      `📋 Известный техдолг allowlist (${allowlistedDebt.size} файлов, не блокирует commit):`
    );
    for (const [file, reason] of allowlistedDebt) {
      console.log(`  • ${file} — ${reason}`);
    }
    console.log('');
  }

  if (collector.items.length > 0) {
    collector.print();
    printSummary();
  }

  printWarningBreakdown();

  if (collector.errors.length > 0) {
    console.log('См. frontend/docs/ARCHITECTURE.md\n');
    process.exit(1);
  }

  const warnCount = collector.warnings.length;
  if (warnCount === 0) {
    console.log('✅ Архитектура frontend в порядке.\n');
  } else {
    console.log(`✅ Критичных нарушений нет (${warnCount} предупреждений — см. отчёт выше).\n`);
  }
}

main();
