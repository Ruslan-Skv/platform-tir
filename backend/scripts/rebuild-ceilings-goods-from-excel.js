/**
 * Rebuild GOODS items from Excel «СЗ на товар» columns I–K.
 * Requires unzipped workbook at %TEMP%/potolok-extract3 (or set POTOLK_EXTRACT).
 *
 * Usage: node scripts/rebuild-ceilings-goods-from-excel.js
 */
const fs = require('fs');
const path = require('path');

const dir = process.env.POTOLK_EXTRACT || path.join(process.env.TEMP, 'potolok-extract3');
const seedPath = path.join(__dirname, '..', 'prisma', 'data', 'ceilings-price-list.seed.json');

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

function sheetGrid(file, maxRows = 200, maxCols = 15) {
  const xml = fs.readFileSync(path.join(dir, 'xl', file), 'utf8');
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

function inferUnit(name) {
  const n = name.toLowerCase();
  if (/,?\s*м\.?\s*п\.?/i.test(name) || n.includes('м.п')) return 'м';
  if (/компл?\.?/i.test(name) || n.includes('комп')) return 'комп';
  if (/пачк/i.test(name)) return 'пач';
  return 'шт';
}

function slug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\wа-яё\-().]/gi, '')
    .slice(0, 80);
}

const HEADER_MARKERS = new Set(['базовая', 'розница', 'закуп', 'наценка']);

const BLOCK_HEADERS = [
  'Светильники и лампы',
  'Светодиодная лента и комплектующие к ней',
  'Световые линии с комплектующими',
  'Гардины',
  'Карнизы',
];

/** Markup that applies to the following block (from «наценка» rows above headers). */
const BLOCK_MARKUP = {
  'Световые линии с комплектующими': 1.8,
  Гардины: 1.8,
};

const grid = sheetGrid('worksheets/sheet10.xml');
const goods = [];
let currentBlock = null;
let pendingMarkup = null;
let sortOrder = 1;

for (let r = 1; r <= 160; r++) {
  const name = grid.get(r)?.[9] || '';
  const jRaw = grid.get(r)?.[10] || '';
  const kRaw = grid.get(r)?.[11] || '';

  if (!name && !jRaw && !kRaw) continue;

  if (!name && jRaw.toLowerCase() === 'наценка') {
    const m = Number(kRaw);
    pendingMarkup = Number.isFinite(m) && m > 0 ? m : null;
    continue;
  }

  if (BLOCK_HEADERS.includes(name)) {
    currentBlock = name;
    if (pendingMarkup != null) {
      BLOCK_MARKUP[currentBlock] = pendingMarkup;
      pendingMarkup = null;
    }
    continue;
  }

  if (!currentBlock) continue;
  if (HEADER_MARKERS.has(name.toLowerCase()) || name === '.' || !name.trim()) continue;

  const purchase = Number(String(jRaw).replace(',', '.'));
  if (!Number.isFinite(purchase) || purchase <= 0) continue;

  const retailExplicit = Number(String(kRaw).replace(',', '.'));
  const markup = BLOCK_MARKUP[currentBlock] ?? null;
  let retailPrice = 0;
  if (Number.isFinite(retailExplicit) && retailExplicit > 0) {
    retailPrice = retailExplicit;
  } else if (markup != null && markup > 0) {
    retailPrice = Math.round(purchase * markup);
  } else {
    // «базовая» без розницы в Excel — в договоре используем базовую как цену
    retailPrice = purchase;
  }

  goods.push({
    id: `goods-${slug(currentBlock)}-${slug(name)}-${sortOrder}`,
    category: 'GOODS',
    name,
    unit: inferUnit(name),
    purchasePrice: purchase,
    markup,
    retailPrice,
    attributes: {
      goodsGroup: currentBlock,
      block: currentBlock,
      priceKind: markup != null ? 'purchase' : 'base',
    },
    active: true,
    sortOrder: sortOrder++,
  });
}

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const nonGoods = seed.items.filter((it) => it.category !== 'GOODS');
seed.items = [...nonGoods, ...goods];
seed.settings = {
  ...(seed.settings || {}),
  goodsGroupMarkups: {
    'Светильники и лампы': 1,
    'Светодиодная лента и комплектующие к ней': 1,
    'Световые линии с комплектующими': 1.8,
    Гардины: 1.8,
    Карнизы: 1,
    ...BLOCK_MARKUP,
  },
};
fs.writeFileSync(seedPath, JSON.stringify(seed, null, 2) + '\n', 'utf8');

const byGroup = {};
for (const g of goods) {
  const k = g.attributes.goodsGroup;
  byGroup[k] = (byGroup[k] || 0) + 1;
}
console.log('GOODS rebuilt:', goods.length, byGroup);
console.log('total items:', seed.items.length);
