/**
 * Импорт ручек Стройком (категория category_id=53 на 436830.ru)
 * в каталог Product с цветами как ProductCardVariant.
 *
 * Использование:
 *   npx ts-node scripts/import-stroykom-handles.ts --dry-run
 *   npx ts-node scripts/import-stroykom-handles.ts --ensure-category
 *   npx ts-node scripts/import-stroykom-handles.ts --categoryId=cmrkk0jq4002prjl64owdkzcl
 *   npx ts-node scripts/import-stroykom-handles.ts --limit=3 --dry-run
 *
 * Опции:
 *   --categoryId=ID   целевая категория «Ручки» (по умолчанию cmrkk0jq4002prjl64owdkzcl)
 *   --ensure-category  создать «Ручки» под «Фурнитура…», если categoryId не найден
 *   --supplierId=ID    привязать ProductSupplier (иначе ищем Стройком / 436830.ru)
 *   --dry-run          только скрап + отчёт, без записи в БД
 *   --limit=N          импортировать только первые N сгруппированных товаров
 *   --skip-existing    пропускать товары с тем же slug
 *   --delayMs=300      пауза между запросами к сайту поставщика
 */

import * as cheerio from 'cheerio';
import { Prisma, PrismaClient } from '@prisma/client';

const BASE = 'https://436830.ru';
const HANDLES_CATEGORY_ID = 53;
const DEFAULT_TARGET_CATEGORY_ID = 'cmrkk0jq4002prjl64owdkzcl';
const LIST_PATH = '/furnitura/2024-08-06-08-51-35.html';

const COLOR_CODE_LABELS: Record<string, string> = {
  BL: 'Белый',
  PB: 'Золото Глянец',
  PC: 'Хром Глянец',
  SB: 'Золото Матовое',
  AB: 'Бронза',
  AC: 'Медь',
  SN: 'Никель Матовый',
  BLACK: 'Чёрный',
  BB: 'BB',
  HH: 'HH',
  BCF: 'BCF',
  AS: 'AS',
  ABB: 'ABB',
  BSL: 'BSL',
  SBP: 'SBP',
  HHP: 'HHP',
  WPC: 'WPC',
  'GR/PC': 'GR/PC',
  'HH/PC': 'HH/PC',
  'BH/HH': 'BH/HH',
  'BH/PC': 'BH/PC',
  'BH/PB': 'BH/PB',
  'SB/PB': 'SB/PB',
  'SC/PC': 'SC/PC',
  'PB/SB': 'PB/SB',
  GRAPHIT: 'Graphit',
};

type CliOptions = {
  categoryId: string;
  ensureCategory: boolean;
  supplierId?: string;
  dryRun: boolean;
  limit?: number;
  skipExisting: boolean;
  delayMs: number;
};

type ListingItem = {
  productId: string;
  name: string;
  colorCode: string | null;
  price: number | null;
  thumbUrl: string | null;
  url: string;
};

type DetailData = {
  title: string;
  subtitle: string | null;
  price: number | null;
  brand: string | null;
  manufacturerCountry: string | null;
  descriptionHtml: string;
  colorsFromDesc: Array<{ label: string; code: string | null }>;
  fullImages: string[];
};

type PreparedProduct = {
  name: string;
  slug: string;
  description: string;
  price: number;
  images: string[];
  attributes: Record<string, string>;
  manufacturerName: string | null;
  supplierProductUrl: string;
  supplierSku: string;
  cardVariants: Array<{
    name: string;
    price: number;
    image: string | null;
    color: string;
    sortOrder: number;
  }>;
  sourceProductIds: string[];
};

const prisma = new PrismaClient();

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    categoryId: DEFAULT_TARGET_CATEGORY_ID,
    ensureCategory: false,
    dryRun: false,
    skipExisting: true,
    delayMs: 350,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--ensure-category') opts.ensureCategory = true;
    else if (arg === '--skip-existing') opts.skipExisting = true;
    else if (arg === '--no-skip-existing') opts.skipExisting = false;
    else if (arg.startsWith('--categoryId=')) opts.categoryId = arg.slice('--categoryId='.length);
    else if (arg.startsWith('--supplierId=')) opts.supplierId = arg.slice('--supplierId='.length);
    else if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice('--limit='.length));
    else if (arg.startsWith('--delayMs=')) opts.delayMs = Number(arg.slice('--delayMs='.length));
  }
  return opts;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function absUrl(href: string): string {
  if (!href) return href;
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href.replace(/^http:\/\//i, 'https://');
  }
  if (href.startsWith('//')) return `https:${href}`;
  return new URL(href.replace(/^\/\//, '/'), BASE).toString();
}

function slugify(value: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  return value
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeColorCode(code: string): string {
  return code
    .replace(/\s+/g, '')
    .replace(/Н/gi, 'H')
    .replace(/Р/gi, 'P')
    .replace(/В/gi, 'B')
    .replace(/С/gi, 'C')
    .toUpperCase();
}

function colorLabelFromCode(code: string | null): string {
  if (!code) return 'Стандарт';
  const key = normalizeColorCode(code);
  const known = COLOR_CODE_LABELS[key];
  if (known && known !== key) return `${known} (${key})`;
  return key;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; TerritoryInteriorImporter/1.0; +https://territory-interior.ru)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseListingHtml(html: string): ListingItem[] {
  const parts = html.split(/onMouseOver="this\.style\.boxShadow/);
  const items: ListingItem[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const idM = part.match(/product_id=(\d+)/);
    if (!idM) continue;
    const nameM = part.match(/font-size:15px;font-weight:bold;[^>]*>([^<]+)</);
    if (!nameM) continue;

    const colorM =
      part.match(/<b>\(\s*([^)]+?)\s*\)<\/a>/i) ||
      part.match(/font-size:13px[^>]*>[\s\S]*?\(\s*([^)]+?)\s*\)/i);
    const priceM = part.match(/([\d\s\u00a0]+)\s*руб/i);
    const imgM =
      part.match(/src="([^"]*show_image_in_imgtag\.php[^"]*)"/i) ||
      part.match(/src="([^"]*shop_image\/product[^"]*)"/i);

    const productId = idM[1];
    if (seen.has(productId)) continue;
    seen.add(productId);

    const priceRaw = priceM?.[1]?.replace(/[\s\u00a0]/g, '') ?? '';
    const url = `${BASE}${LIST_PATH}?page=shop.product_details&flypage=flypage.tpl+1&product_id=${productId}&category_id=${HANDLES_CATEGORY_ID}`;

    items.push({
      productId,
      name: nameM[1].replace(/\s+/g, ' ').trim(),
      colorCode: colorM?.[1]?.trim() || null,
      price: priceRaw ? Number(priceRaw) : null,
      thumbUrl: imgM?.[1] ? absUrl(imgM[1].replace(/&amp;/g, '&')) : null,
      url,
    });
  }

  return items;
}

async function scrapeAllListings(delayMs: number): Promise<ListingItem[]> {
  const all: ListingItem[] = [];
  for (const limitstart of [0, 100]) {
    const url = `${BASE}${LIST_PATH}?page=shop.browse&category_id=${HANDLES_CATEGORY_ID}&limit=100&limitstart=${limitstart}`;
    console.log(`Listing: ${url}`);
    const html = await fetchHtml(url);
    const items = parseListingHtml(html);
    console.log(`  → ${items.length} позиций`);
    all.push(...items);
    await sleep(delayMs);
  }
  const byId = new Map(all.map((i) => [i.productId, i]));
  return [...byId.values()];
}

function parseDetailHtml(html: string): DetailData {
  const $ = cheerio.load(html);
  const h1 = $('#vmMainPage h1').first();
  const title = h1
    .clone()
    .children('span')
    .remove()
    .end()
    .text()
    .replace(/\s+/g, ' ')
    .trim();
  const subtitle = h1.find('span').text().replace(/\s+/g, ' ').trim() || null;

  const priceText = $('.productPrice').first().text();
  const priceM = priceText.match(/([\d\s\u00a0]+)/);
  const price = priceM ? Number(priceM[1].replace(/[\s\u00a0]/g, '')) : null;

  const contentHtml =
    $('#vmMainPage td[colspan="2"] hr')
      .parent()
      .html() ||
    $('#vmMainPage').html() ||
    '';

  const $content = cheerio.load(`<div id="sk-wrap">${contentHtml}</div>`);
  const text = $content('#sk-wrap').text();

  const brandM = text.match(/Торговая марка:\s*(.+?)(?:Производитель|Наименование|$)/i);
  const countryM = text.match(/Производитель:\s*\.?\s*(.+?)(?:Наименование|Варианты|$)/i);

  const colorsFromDesc: Array<{ label: string; code: string | null }> = [];
  const colorBlock = text.match(/Варианты цветов:\s*([\s\S]*?)(?:Описание:|Комплектация:|$)/i)?.[1];
  if (colorBlock) {
    const lines = colorBlock
      .split(/•/)
      .map((s: string) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    for (const line of lines) {
      const m = line.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
      if (m) {
        colorsFromDesc.push({ label: m[1].trim(), code: normalizeColorCode(m[2]) });
      } else if (line.length < 80) {
        colorsFromDesc.push({ label: line, code: null });
      }
    }
  }

  const fullImages: string[] = [];
  $('a[rel^="lightbox"]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (/uvelich\.png|M_images|banners/i.test(href)) return;
    fullImages.push(absUrl(href));
  });
  // dedupe
  const uniqImages = [...new Set(fullImages)];

  // Build clean description from structured paragraphs
  const descParts: string[] = [];
  $('#vmMainPage td[colspan="2"] p').each((_, p) => {
    const htmlP = ($(p).html() || '').trim();
    if (htmlP) descParts.push(`<p>${htmlP}</p>`);
  });
  const descriptionHtml =
    descParts.length > 0
      ? descParts.join('\n')
      : `<p>${text.slice(0, 2000)}</p>`;

  return {
    title: title || 'Ручка',
    subtitle,
    price,
    brand: brandM?.[1]?.trim() || null,
    manufacturerCountry: countryM?.[1]?.trim() || null,
    descriptionHtml,
    colorsFromDesc,
    fullImages: uniqImages,
  };
}

async function fetchDetail(url: string, delayMs: number): Promise<DetailData> {
  const html = await fetchHtml(url);
  await sleep(delayMs);
  return parseDetailHtml(html);
}

function groupListings(items: ListingItem[]): Map<string, ListingItem[]> {
  const map = new Map<string, ListingItem[]>();
  for (const item of items) {
    const key = item.name.replace(/\s+/g, ' ').trim();
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

async function prepareProduct(
  name: string,
  listings: ListingItem[],
  delayMs: number,
  detailCache: Map<string, DetailData>,
): Promise<PreparedProduct> {
  const primary = listings[0];
  let detail = detailCache.get(primary.productId);
  if (!detail) {
    detail = await fetchDetail(primary.url, delayMs);
    detailCache.set(primary.productId, detail);
  }

  // Fetch detail for other color variants to get better images
  for (const listing of listings.slice(1)) {
    if (detailCache.has(listing.productId)) continue;
    try {
      const d = await fetchDetail(listing.url, delayMs);
      detailCache.set(listing.productId, d);
    } catch (e) {
      console.warn(`  ! detail ${listing.productId}:`, (e as Error).message);
    }
  }

  const cardVariants: PreparedProduct['cardVariants'] = [];

  if (listings.length > 1 || (listings.length === 1 && listings[0].colorCode)) {
    // Listing already has per-color rows (or at least one colored row)
    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      const d = detailCache.get(listing.productId) || detail;
      const image = d.fullImages[0] || listing.thumbUrl;
      const color = colorLabelFromCode(listing.colorCode);
      const price = listing.price ?? d.price ?? 0;
      cardVariants.push({
        name: listing.colorCode ? `${name} (${normalizeColorCode(listing.colorCode)})` : name,
        price,
        image,
        color,
        sortOrder: i,
      });
    }
  }

  // If only one listing but description has multiple colors — expand
  if (cardVariants.length <= 1 && detail.colorsFromDesc.length > 1) {
    const baseImage = detail.fullImages[0] || primary.thumbUrl;
    const basePrice = primary.price ?? detail.price ?? 0;
    cardVariants.length = 0;
    detail.colorsFromDesc.forEach((c, i) => {
      const color = c.code
        ? `${c.label} (${c.code})`
        : c.label;
      cardVariants.push({
        name: c.code ? `${name} (${c.code})` : `${name} — ${c.label}`,
        price: basePrice,
        image: baseImage,
        color,
        sortOrder: i,
      });
    });
  }

  if (cardVariants.length === 0) {
    const price = primary.price ?? detail.price ?? 0;
    cardVariants.push({
      name,
      price,
      image: detail.fullImages[0] || primary.thumbUrl,
      color: colorLabelFromCode(primary.colorCode),
      sortOrder: 0,
    });
  }

  const minPrice = Math.min(...cardVariants.map((v) => v.price).filter((p) => p > 0));
  const price = Number.isFinite(minPrice) ? minPrice : cardVariants[0].price;

  const images = [
    ...new Set(
      [
        ...cardVariants.map((v) => v.image).filter(Boolean),
        ...detail.fullImages,
        primary.thumbUrl,
      ].filter((x): x is string => Boolean(x)),
    ),
  ].slice(0, 8);

  let description = detail.descriptionHtml;
  if (detail.subtitle) {
    description = `<p><em>${detail.subtitle}</em></p>\n${description}`;
  }

  const attributes: Record<string, string> = {};
  if (detail.brand) attributes.brand = detail.brand;
  if (detail.manufacturerCountry) attributes.country = detail.manufacturerCountry;
  attributes.source = 'stroykom-436830';
  attributes.sourceCategory = 'handles';

  const slugBase = slugify(`ruchka-${name}`) || `ruchka-${primary.productId}`;

  return {
    name,
    slug: slugBase,
    description,
    price,
    images,
    attributes,
    manufacturerName: detail.brand,
    supplierProductUrl: primary.url,
    supplierSku: `SK-H-${primary.productId}`,
    cardVariants: cardVariants.slice(0, 30),
    sourceProductIds: listings.map((l) => l.productId),
  };
}

async function ensureCategoryId(preferredId: string, ensure: boolean): Promise<string> {
  const existing = await prisma.category.findUnique({ where: { id: preferredId } });
  if (existing) return existing.id;

  if (!ensure) {
    throw new Error(
      `Категория ${preferredId} не найдена. Запустите с --ensure-category или укажите существующий --categoryId=...`,
    );
  }

  let parent = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: 'furnitura-dlya-dverey' },
        { slug: 'door-hardware' },
        { name: { contains: 'урнитур', mode: 'insensitive' } },
      ],
      parentId: null,
    },
  });

  if (!parent) {
    parent = await prisma.category.create({
      data: {
        name: 'Фурнитура',
        slug: 'door-hardware',
        description: 'Фурнитура для дверей',
        sizesRequired: false,
        isActive: true,
        order: 50,
      },
    });
    console.log(`Создана родительская категория ${parent.name} (${parent.id})`);
  }

  const child =
    (await prisma.category.findFirst({
      where: {
        parentId: parent.id,
        OR: [{ slug: 'ruchki' }, { name: { equals: 'Ручки', mode: 'insensitive' } }],
      },
    })) ||
    (await prisma.category.create({
      data: {
        name: 'Ручки',
        slug: 'ruchki',
        parentId: parent.id,
        sizesRequired: false,
        isActive: true,
        order: 10,
      },
    }));

  console.log(`Категория «Ручки»: ${child.id} (parent ${parent.id})`);
  return child.id;
}

async function resolveSupplierId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  const found = await prisma.supplier.findFirst({
    where: {
      OR: [
        { website: { contains: '436830', mode: 'insensitive' } },
        { legalName: { contains: 'тройком', mode: 'insensitive' } },
        { commercialName: { contains: 'тройком', mode: 'insensitive' } },
        { name: { contains: 'тройком', mode: 'insensitive' } },
      ],
    },
  });
  return found?.id ?? null;
}

async function resolveManufacturerId(brand: string | null): Promise<string | null> {
  if (!brand) return null;
  const name = brand.replace(/^ТМ\s+/i, '').trim();
  if (!name) return null;
  const slug = slugify(name);
  const existing = await prisma.manufacturer.findFirst({
    where: { OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }] },
  });
  if (existing) return existing.id;
  const created = await prisma.manufacturer.create({
    data: { name, slug: slug || `brand-${Date.now()}`, isActive: true },
  });
  return created.id;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${i}`;
    i += 1;
  }
  return slug;
}

async function importOne(
  prepared: PreparedProduct,
  categoryId: string,
  supplierId: string | null,
  skipExisting: boolean,
): Promise<'created' | 'skipped'> {
  if (skipExisting) {
    const exists = await prisma.product.findUnique({ where: { slug: prepared.slug } });
    if (exists) return 'skipped';
  }

  const slug = await uniqueSlug(prepared.slug);
  const manufacturerId = await resolveManufacturerId(prepared.manufacturerName);

  const product = await prisma.product.create({
    data: {
      name: prepared.name,
      slug,
      description: prepared.description,
      price: new Prisma.Decimal(prepared.price),
      stock: 0,
      onOrder: true,
      isActive: true,
      categoryId,
      images: prepared.images,
      attributes: prepared.attributes,
      sizes: [],
      openingSide: [],
      ...(manufacturerId ? { manufacturerId } : {}),
      sku: prepared.supplierSku,
    },
  });

  if (prepared.cardVariants.length > 0) {
    await prisma.productCardVariant.createMany({
      data: prepared.cardVariants.map((v) => ({
        productId: product.id,
        name: v.name,
        price: new Prisma.Decimal(v.price),
        image: v.image,
        color: v.color,
        sortOrder: v.sortOrder,
      })),
    });
  }

  if (supplierId) {
    await prisma.productSupplier.create({
      data: {
        productId: product.id,
        supplierId,
        supplierSku: prepared.supplierSku,
        supplierPrice: new Prisma.Decimal(prepared.price),
        supplierProductUrl: prepared.supplierProductUrl,
        isMainSupplier: true,
        supplierStock: 0,
      },
    });
  }

  return 'created';
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log('Options:', opts);

  const listings = await scrapeAllListings(opts.delayMs);
  console.log(`Всего позиций в листинге: ${listings.length}`);

  const groups = groupListings(listings);
  console.log(`Сгруппировано в товаров: ${groups.size}`);

  let entries = [...groups.entries()];
  if (opts.limit && opts.limit > 0) {
    entries = entries.slice(0, opts.limit);
    console.log(`Ограничение --limit=${opts.limit}`);
  }

  const detailCache = new Map<string, DetailData>();
  const prepared: PreparedProduct[] = [];

  for (const [name, items] of entries) {
    process.stdout.write(`Prepare: ${name} (${items.length} цв.)… `);
    try {
      const p = await prepareProduct(name, items, opts.delayMs, detailCache);
      prepared.push(p);
      console.log(`ok, variants=${p.cardVariants.length}, price=${p.price}`);
    } catch (e) {
      console.log('FAIL', (e as Error).message);
    }
  }

  console.log('\nИтого подготовлено:', prepared.length);
  console.log(
    'Макс. вариантов:',
    Math.max(0, ...prepared.map((p) => p.cardVariants.length)),
  );

  if (opts.dryRun) {
    console.log('\n--- DRY RUN (примеры) ---');
    for (const p of prepared.slice(0, 5)) {
      console.log({
        name: p.name,
        slug: p.slug,
        price: p.price,
        variants: p.cardVariants.map((v) => ({ color: v.color, price: v.price })),
        images: p.images.length,
        url: p.supplierProductUrl,
      });
    }
    return;
  }

  const categoryId = await ensureCategoryId(opts.categoryId, opts.ensureCategory);
  await prisma.category.update({
    where: { id: categoryId },
    data: { sizesRequired: false },
  });

  const supplierId = await resolveSupplierId(opts.supplierId);
  console.log('categoryId:', categoryId);
  console.log('supplierId:', supplierId);

  let created = 0;
  let skipped = 0;
  for (const p of prepared) {
    try {
      const result = await importOne(p, categoryId, supplierId, opts.skipExisting);
      if (result === 'created') {
        created += 1;
        console.log(`✓ ${p.name}`);
      } else {
        skipped += 1;
        console.log(`· skip ${p.name}`);
      }
    } catch (e) {
      console.error(`✗ ${p.name}:`, (e as Error).message);
    }
  }

  console.log(`\nГотово: создано ${created}, пропущено ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
