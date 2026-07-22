/**
 * Rebuild FABRIC items in ceilings-price-list.seed.json from Excel «ПрайсП»
 * (smart tables: texture → series → color).
 *
 * Usage: node scripts/rebuild-ceilings-fabric-from-excel.js
 * Requires unzipped workbook at %TEMP%/potolok-extract2 (or set POTOLK_EXTRACT).
 */
const fs = require('fs');
const path = require('path');

const dir = process.env.POTOLK_EXTRACT || path.join(process.env.TEMP, 'potolok-extract2');
const seedPath = path.join(__dirname, '..', 'prisma', 'data', 'ceilings-price-list.seed.json');

const TEXTURE_BLOCK_NAMES = new Set([
  'Матовый',
  'Сатиновый',
  'Лаковый',
  'Фактурный',
  'Светопр.пленка',
  'Дерево',
  'Перфорация',
]);

const SKIP_TABLES = new Set(['Таблица17', 'Таблица49', 'Таблица50', 'Маск.лента', 'Маск.лента.Х']);

const ssXml = fs.readFileSync(path.join(dir, 'xl/sharedStrings.xml'), 'utf8');
const strings = [];
{
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let sm;
  while ((sm = siRe.exec(ssXml))) {
    const texts = [...sm[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) =>
      t[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"'),
    );
    strings.push(texts.join(''));
  }
}

function colToNum(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function sheetGrid(sheetRelPath, maxRows = 130, maxCols = 80) {
  const xml = fs.readFileSync(path.join(dir, 'xl', sheetRelPath), 'utf8');
  const rows = new Map();
  const cRe = /<c r="([A-Z]+)(\d+)"([^>]*)>(?:<v>([^<]*)<\/v>)?/g;
  let m;
  while ((m = cRe.exec(xml))) {
    const col = colToNum(m[1]);
    const row = Number(m[2]);
    if (row > maxRows || col > maxCols) continue;
    const attrs = m[3] || '';
    const v = m[4];
    let val = '';
    if (v != null) {
      if (/t="s"/.test(attrs)) val = strings[Number(v)] ?? '';
      else val = v;
    }
    if (!rows.has(row)) rows.set(row, {});
    rows.get(row)[col] = String(val).trim();
  }
  return rows;
}

function parseRef(ref) {
  const m = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  return {
    c1: colToNum(m[1]),
    r1: Number(m[2]),
    c2: colToNum(m[3]),
    r2: Number(m[4]),
  };
}

function valuesInRef(grid, ref) {
  const { c1, r1, c2, r2 } = parseRef(ref);
  const out = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      const v = grid.get(r)?.[c];
      if (v) out.push(v);
    }
  }
  return out;
}

const grid = sheetGrid('worksheets/sheet15.xml');

const priceByArticle = new Map();
for (let r = 48; r <= 119; r++) {
  const article = grid.get(r)?.[2];
  if (!article) continue;
  const purchase = Number(grid.get(r)?.[5] || 0);
  const photo = Number(grid.get(r)?.[6] || 0);
  const alt = Number(grid.get(r)?.[3] || 0);
  priceByArticle.set(article, {
    purchasePrice: purchase || alt || 0,
    photoPrintPurchase: photo || 0,
  });
}

const tablesDir = path.join(dir, 'xl/tables');
const fabricTables = [];
for (const f of fs.readdirSync(tablesDir).filter((x) => /^table\d+\.xml$/.test(x))) {
  const xml = fs.readFileSync(path.join(tablesDir, f), 'utf8');
  const name = (xml.match(/name="([^"]+)"/) || [])[1];
  const ref = (xml.match(/ref="([^"]+)"/) || [])[1];
  if (!name || !ref || SKIP_TABLES.has(name)) continue;
  const vals = valuesInRef(grid, ref);
  const items = vals[0] === name ? vals.slice(1) : vals.filter((v) => v !== name);
  fabricTables.push({ name, ref, items });
}

const texturesFromSheet = valuesInRef(grid, 'B36:B42').filter(Boolean);

const seriesTextureByName = new Map(); // series article -> texture
const seriesHasColors = new Set();

for (const table of fabricTables) {
  if (!TEXTURE_BLOCK_NAMES.has(table.name)) continue;
  for (const article of table.items) {
    seriesTextureByName.set(article, table.name);
  }
}

for (const table of fabricTables) {
  if (TEXTURE_BLOCK_NAMES.has(table.name)) continue;
  // color block named after a series article
  if (seriesTextureByName.has(table.name) || table.items.length) {
    seriesHasColors.add(table.name);
  }
}

const MARKUP = 2;
const fabricItems = [];
let sortOrder = 1;

function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\wа-яё\-().]/gi, '');
}

function pushItem(partial) {
  fabricItems.push({
    active: true,
    unit: 'м²',
    markup: partial.fabricLevel === 'COLOR' ? null : MARKUP,
    ...partial,
    sortOrder: sortOrder++,
  });
}

// 1) Textures
for (const texture of texturesFromSheet) {
  pushItem({
    id: `fabric-texture-${slug(texture)}`,
    category: 'FABRIC',
    name: texture,
    purchasePrice: 0,
    retailPrice: 0,
    markup: null,
    attributes: {
      fabricLevel: 'TEXTURE',
      block: 'Фактуры',
      texture,
      article: texture,
    },
  });
}

// 2) Series blocks (named after textures)
for (const table of fabricTables) {
  if (!TEXTURE_BLOCK_NAMES.has(table.name)) continue;
  const texture = table.name;
  for (const article of table.items) {
    const priced = priceByArticle.get(article) || { purchasePrice: 0, photoPrintPurchase: 0 };
    const purchasePrice = priced.purchasePrice;
    const retailPrice = purchasePrice > 0 ? Math.round(purchasePrice * MARKUP) : 0;
    pushItem({
      id: `fabric-series-${slug(texture)}-${slug(article)}`,
      category: 'FABRIC',
      name: article,
      purchasePrice,
      retailPrice,
      attributes: {
        fabricLevel: 'SERIES',
        block: texture,
        texture,
        series: article,
        article,
        photoPrintPurchase: priced.photoPrintPurchase || 0,
        hasColorOptions: seriesHasColors.has(article),
      },
    });
  }
}

// 3) Color blocks
for (const table of fabricTables) {
  if (TEXTURE_BLOCK_NAMES.has(table.name)) continue;
  const series = table.name;
  const texture =
    seriesTextureByName.get(series) ||
    (seriesHasColors.has(series) && !TEXTURE_BLOCK_NAMES.has(series) ? 'Фактурный' : '');
  // If series itself is a textured pattern listed under Фактурный
  const resolvedTexture =
    texture || ([...seriesTextureByName.entries()].find(([a]) => a === series)?.[1] ?? 'Фактурный');

  for (const color of table.items) {
    pushItem({
      id: `fabric-color-${slug(series)}-${slug(color)}`,
      category: 'FABRIC',
      name: color,
      purchasePrice: 0,
      retailPrice: 0,
      markup: null,
      attributes: {
        fabricLevel: 'COLOR',
        block: series,
        texture: resolvedTexture,
        series,
        article: color,
        color,
      },
    });
  }
}

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const nonFabric = seed.items.filter((it) => it.category !== 'FABRIC');
seed.items = [...fabricItems, ...nonFabric];

fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf8');

const levels = {};
for (const it of fabricItems) {
  const lv = it.attributes.fabricLevel;
  levels[lv] = (levels[lv] || 0) + 1;
}
const blocks = [...new Set(fabricItems.map((i) => i.attributes.block))];
console.log('FABRIC rebuilt:', fabricItems.length, levels);
console.log('blocks:', blocks.length, blocks.slice(0, 15).join(', '), '...');
console.log('total items:', seed.items.length);
