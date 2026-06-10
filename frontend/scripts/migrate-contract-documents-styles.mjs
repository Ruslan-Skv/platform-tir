/**
 * 1) Распределяет dark-theme.module.css по partial-файлам (по целевому классу).
 * 2) Мигрирует импорты ContractDocuments.module.css → partial-файлы.
 * 3) Удаляет монолит и build-скрипт.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const STYLES_DIR = path.join(ROOT, 'src/views/admin/ContractDocuments/styles');
const SRC_DIR = path.join(ROOT, 'src');

const PARTIALS = [
  'base.module.css',
  'estimates-workspace.module.css',
  'contracts-list-hub.module.css',
  'editor-chrome.module.css',
  'windows-package.module.css',
  'data-tab.module.css',
  'templates-library.module.css',
  'estimate-tab.module.css',
  'documents-preview.module.css',
  'hub-modals.module.css',
  'estimates-list.module.css',
  'interactive-estimate.module.css',
];

const PARTIAL_ALIAS = {
  'base.module.css': 'cdBase',
  'estimates-workspace.module.css': 'cdWorkspace',
  'contracts-list-hub.module.css': 'cdHub',
  'editor-chrome.module.css': 'cdChrome',
  'windows-package.module.css': 'cdWindows',
  'data-tab.module.css': 'cdDataTab',
  'templates-library.module.css': 'cdTemplates',
  'estimate-tab.module.css': 'cdEstimateTab',
  'documents-preview.module.css': 'cdDocPreview',
  'hub-modals.module.css': 'cdHubModals',
  'estimates-list.module.css': 'cdEstimatesList',
  'interactive-estimate.module.css': 'cdInteractiveEstimate',
};

function extractClassOwners() {
  const owners = new Map();
  const compoundOnly = new Map();

  for (const file of PARTIALS) {
    const content = fs.readFileSync(path.join(STYLES_DIR, file), 'utf8');
    const topLevel = [...content.matchAll(/^\.([A-Za-z_][\w-]*)\s*[,{]/gm)].map((m) => m[1]);
    for (const cls of topLevel) {
      if (!owners.has(cls)) owners.set(cls, file);
    }
    const inSelectors = [
      ...content.matchAll(/\.([A-Za-z_][\w-]*)/g),
    ].map((m) => m[1]);
    for (const cls of inSelectors) {
      if (!compoundOnly.has(cls)) compoundOnly.set(cls, file);
    }
  }

  for (const [cls, file] of compoundOnly) {
    if (!owners.has(cls)) owners.set(cls, file);
  }

  return owners;
}

function distributeDarkTheme(classOwners) {
  const darkPath = path.join(STYLES_DIR, 'dark-theme.module.css');
  if (!fs.existsSync(darkPath)) {
    console.log('[migrate] dark-theme.module.css already distributed');
    return;
  }

  const dark = fs.readFileSync(darkPath, 'utf8');
  const blocks = dark.split(/\n(?=:where\(html\[data-theme)/).filter(Boolean);
  const byPartial = new Map(PARTIALS.map((f) => [f, []]));
  const fallback = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const classMatch = trimmed.match(/\) ([.#:[])?\.([A-Za-z_][\w-]*)/);
    const cls = classMatch?.[2];
    const owner = cls ? classOwners.get(cls) : null;
    if (owner && byPartial.has(owner)) {
      byPartial.get(owner).push(trimmed);
    } else {
      fallback.push(trimmed);
    }
  }

  for (const file of PARTIALS) {
    const rules = byPartial.get(file);
    if (!rules.length) continue;
    const partialPath = path.join(STYLES_DIR, file);
    let content = fs.readFileSync(partialPath, 'utf8').trimEnd();
    if (!content.includes('/* --- dark theme --- */')) {
      content += '\n\n/* --- dark theme --- */\n';
    }
    content += `${rules.join('\n\n')}\n`;
    fs.writeFileSync(partialPath, content, 'utf8');
  }

  if (fallback.length) {
    const basePath = path.join(STYLES_DIR, 'base.module.css');
    let content = fs.readFileSync(basePath, 'utf8').trimEnd();
    content += '\n\n/* --- dark theme (unmapped) --- */\n';
    content += `${fallback.join('\n\n')}\n`;
    fs.writeFileSync(basePath, content, 'utf8');
    console.log(`[migrate] ${fallback.length} unmapped dark-theme rules → base.module.css`);
  }

  fs.unlinkSync(darkPath);
  console.log('[migrate] distributed dark-theme.module.css into partials');
}

function walkTsFiles(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walkTsFiles(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function relImport(fromFile, partialFile) {
  const fromDir = path.dirname(fromFile);
  const target = path.join(STYLES_DIR, partialFile);
  let rel = path.relative(fromDir, target).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function migrateFile(filePath, classOwners) {
  let src = fs.readFileSync(filePath, 'utf8');
  const styleVar = src.match(
    /import\s+(\w+)\s+from\s+['"][^'"]*ContractDocuments\.module\.css['"];?/
  )?.[1];
  if (!styleVar) return false;

  const usedClasses = new Set();
  const usageRe = new RegExp(`${styleVar}\\.([A-Za-z_][\\w]*)`, 'g');
  for (const m of src.matchAll(usageRe)) {
    usedClasses.add(m[1]);
  }

  const neededPartials = new Set();
  for (const cls of usedClasses) {
    const owner = classOwners.get(cls);
    if (owner) neededPartials.add(owner);
  }
  if (!neededPartials.size) {
    neededPartials.add('base.module.css');
  }

  const sortedPartials = [...neededPartials].sort(
    (a, b) => PARTIALS.indexOf(a) - PARTIALS.indexOf(b)
  );

  const importLines = sortedPartials
    .map((partial) => {
      const alias = PARTIAL_ALIAS[partial];
      return `import ${alias} from '${relImport(filePath, partial)}';`;
    })
    .join('\n');

  src = src.replace(
    /import\s+\w+\s+from\s+['"][^'"]*ContractDocuments\.module\.css['"];?\r?\n/,
    `${importLines}\r\n`
  );

  const classToAlias = new Map();
  for (const partial of sortedPartials) {
    const alias = PARTIAL_ALIAS[partial];
    const content = fs.readFileSync(path.join(STYLES_DIR, partial), 'utf8');
    const classes = [...content.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]);
    for (const cls of classes) {
      if (!classToAlias.has(cls)) classToAlias.set(cls, alias);
    }
  }

  for (const cls of usedClasses) {
    const alias = classToAlias.get(cls) ?? PARTIAL_ALIAS[sortedPartials[0]];
    src = src.replaceAll(`${styleVar}.${cls}`, `${alias}.${cls}`);
  }

  fs.writeFileSync(filePath, src, 'utf8');
  return true;
}

function main() {
  const classOwners = extractClassOwners();
  distributeDarkTheme(classOwners);

  let migrated = 0;
  for (const file of walkTsFiles(SRC_DIR)) {
    if (file.includes(`${path.sep}styles${path.sep}`)) continue;
    if (migrateFile(file, classOwners)) {
      migrated++;
      console.log('[migrate]', path.relative(ROOT, file));
    }
  }

  const monolith = path.join(STYLES_DIR, 'ContractDocuments.module.css');
  if (fs.existsSync(monolith)) {
    fs.unlinkSync(monolith);
    console.log('[migrate] deleted ContractDocuments.module.css');
  }

  console.log(`[migrate] done, ${migrated} files updated`);
}

main();
