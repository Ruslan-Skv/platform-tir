import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

export const STROYKOM_BASE = 'https://436830.ru';
export const STROYKOM_HANDLES_SITE_CATEGORY_ID = 53;
export const STROYKOM_HANDLES_LIST_PATH = '/furnitura/2024-08-06-08-51-35.html';

export type StroykomHandlesListingItem = {
  productId: string;
  name: string;
  colorCode: string | null;
  price: number | null;
  thumbUrl: string | null;
  url: string;
};

export type StroykomHandlesDetailData = {
  title: string;
  subtitle: string | null;
  price: number | null;
  brand: string | null;
  manufacturer: string | null;
  /** Plain text for admin/storefront description (not HTML). */
  description: string;
  fullImages: string[];
};

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function absUrl(href: string): string {
  if (!href) return href;
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href.replace(/^http:\/\//i, 'https://');
  }
  if (href.startsWith('//')) return `https:${href}`;
  return new URL(href.replace(/^\/\//, '/'), STROYKOM_BASE).toString();
}

/** Encode path segments (spaces/Cyrillic) without touching query string. */
export function encodeImageUrl(url: string): string {
  try {
    const u = new URL(absUrl(url));
    u.pathname = u.pathname
      .split('/')
      .map((seg) => {
        if (!seg) return seg;
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join('/');
    return u.toString();
  } catch {
    return absUrl(url);
  }
}

/**
 * Keep only direct product images on 436830.ru.
 * Skips show_image_in_imgtag.php (often broken / hijacked redirects) and non-product assets.
 */
export function normalizeProductImageUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let url = absUrl(raw.replace(/&amp;/g, '&'));

  try {
    const u = new URL(url);
    if (!/(^|\.)436830\.ru$/i.test(u.hostname)) return null;

    if (/show_image_in_imgtag\.php/i.test(u.pathname)) {
      const filename = u.searchParams.get('filename');
      if (!filename || /(?:^|[\\/])(?:\.\.|uvelich|banner)/i.test(filename)) return null;
      // Absolute paths in filename → map under site root; relative → under product/
      const cleaned = filename
        .replace(/^\/+/, '')
        .replace(/^components\/com_virtuemart\/shop_image\/product\//i, '');
      url = `${STROYKOM_BASE}/components/com_virtuemart/shop_image/product/${cleaned}`;
    }

    const path = new URL(url).pathname;
    if (!/\/shop_image\/product\//i.test(path)) return null;
    if (/uvelich\.png|M_images|banners/i.test(path)) return null;
    if (!/\.(png|jpe?g|webp|gif)$/i.test(path)) return null;

    return encodeImageUrl(url);
  } catch {
    return null;
  }
}

export function isResizedStroykomImage(url: string): boolean {
  return /\/shop_image\/product\/resized\//i.test(url);
}

/** VirtueMart product files look like `___________A_____624d58b78587c.png`, not `24 Ручки.jpg`. */
export function isLikelyStroykomProductPhoto(url: string): boolean {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    return /_[a-f0-9]{8,}\.(png|jpe?g|webp|gif)$/i.test(name);
  } catch {
    return false;
  }
}

/**
 * Prefer full-size product photos. Resized thumbs often 404 / redirect and break the gallery.
 */
export function collectProductImages(...groups: Array<Array<string | null | undefined>>): string[] {
  const full: string[] = [];
  const thumbs: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const raw of group) {
      const url = normalizeProductImageUrl(raw);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      if (isResizedStroykomImage(url)) thumbs.push(url);
      else full.push(url);
    }
  }
  const preferred = full.filter(isLikelyStroykomProductPhoto);
  const chosen = (preferred.length > 0 ? preferred : full.length > 0 ? full : thumbs).slice(0, 8);
  return chosen;
}

function detectImageExtension(buf: Buffer, contentType: string | null): string | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return '.png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return '.jpg';
  }
  if (buf.length >= 6 && buf.subarray(0, 3).toString('ascii') === 'GIF') {
    return '.gif';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return '.webp';
  }
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('png')) return '.png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('gif')) return '.gif';
  return null;
}

/**
 * Download remote Stroykom photos into local /uploads so the admin UI does not
 * hotlink 436830.ru (external loads are often rewritten/blocked by AV/CSP).
 */
export async function downloadStroykomImagesToUploads(
  remoteUrls: string[],
  productKey: string,
): Promise<string[]> {
  if (remoteUrls.length === 0) return [];

  const dir = path.join(process.cwd(), 'uploads', 'products', 'stroykom');
  fs.mkdirSync(dir, { recursive: true });

  const local: string[] = [];
  for (let i = 0; i < remoteUrls.length; i++) {
    const remote = remoteUrls[i];
    try {
      const res = await fetch(remote, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; TerritoryInteriorImporter/1.0; +https://territory-interior.ru)',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: `${STROYKOM_BASE}/`,
        },
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = detectImageExtension(buf, res.headers.get('content-type'));
      if (!ext) continue;

      const safeKey = productKey.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40);
      const filename = `sk-h-${safeKey}-${i}${ext}`;
      fs.writeFileSync(path.join(dir, filename), buf);
      local.push(`/uploads/products/stroykom/${filename}`);
    } catch {
      // keep going; caller may fall back to remote URL
    }
  }
  return local;
}

export function slugify(value: string): string {
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

export function normalizeColorCode(code: string): string {
  return code
    .replace(/\s+/g, '')
    .replace(/Н/gi, 'H')
    .replace(/Р/gi, 'P')
    .replace(/В/gi, 'B')
    .replace(/С/gi, 'C')
    .toUpperCase();
}

export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, '-');
}

export async function fetchHtml(url: string): Promise<string> {
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

export function parseListingHtml(html: string): StroykomHandlesListingItem[] {
  const parts = html.split(/onMouseOver="this\.style\.boxShadow/);
  const items: StroykomHandlesListingItem[] = [];
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
    const url = `${STROYKOM_BASE}${STROYKOM_HANDLES_LIST_PATH}?page=shop.product_details&flypage=flypage.tpl+1&product_id=${productId}&category_id=${STROYKOM_HANDLES_SITE_CATEGORY_ID}`;

    items.push({
      productId,
      name: nameM[1].replace(/\s+/g, ' ').trim(),
      colorCode: colorM?.[1]?.trim() || null,
      price: priceRaw ? Number(priceRaw) : null,
      thumbUrl: normalizeProductImageUrl(imgM?.[1] ?? null),
      url,
    });
  }

  return items;
}

function rebuildDescriptionText(text: string): string {
  return text
    .replace(/Производитель:\s*\.\s*/gi, 'Производитель: ')
    .replace(/Торговая марка:/gi, '\nТорговая марка:')
    .replace(/Производитель:/gi, '\nПроизводитель:')
    .replace(/Наименование:/gi, '\nНаименование:')
    .replace(/Варианты цветов:/gi, '\nВарианты цветов:')
    .replace(/Цвет:/gi, '\nЦвет:')
    .replace(/Описание:/gi, '\nОписание:')
    .replace(/Комплектация:/gi, '\nКомплектация:')
    .replace(/Дополнительно приобретается:/gi, '\nДополнительно приобретается:')
    .replace(/•\s*/g, '\n• ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Convert Virtuemart product HTML into plain multiline description. */
export function htmlToPlainDescription(html: string): string {
  const $ = cheerio.load(html);
  $('br').replaceWith('\n');
  $('p, div, li, tr').each((_, el) => {
    $(el).append('\n');
  });
  const text = $.root()
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n');
  return rebuildDescriptionText(text);
}

export function parseDetailHtml(html: string): StroykomHandlesDetailData {
  const $ = cheerio.load(html);
  const h1 = $('#vmMainPage h1').first();
  const title = h1.clone().children('span').remove().end().text().replace(/\s+/g, ' ').trim();
  const subtitle = h1.find('span').text().replace(/\s+/g, ' ').trim() || null;

  const priceText = $('.productPrice').first().text();
  const priceM = priceText.match(/([\d\s\u00a0]+)/);
  const price = priceM ? Number(priceM[1].replace(/[\s\u00a0]/g, '')) : null;

  const contentHtml =
    $('#vmMainPage td[colspan="2"] hr').parent().html() || $('#vmMainPage').html() || '';

  const $content = cheerio.load(`<div id="sk-wrap">${contentHtml}</div>`);
  const text = $content('#sk-wrap').text().replace(/\s+/g, ' ').trim();

  const brandM = text.match(/Торговая марка:\s*(.+?)(?:Производитель|Наименование|$)/i);
  const manufacturerM = text.match(
    /Производитель:\s*\.?\s*(.+?)(?:Наименование|Варианты|Описание|Комплектация|$)/i,
  );

  const fullImages: string[] = [];
  $('a[rel^="lightbox"]').each((_, el) => {
    const href = $(el).attr('href');
    const normalized = normalizeProductImageUrl(href);
    if (normalized) fullImages.push(normalized);
  });
  // Fallback only if lightbox has nothing (some pages only have <img>).
  if (fullImages.length === 0) {
    $('img[src*="shop_image/product"], img[src*="show_image_in_imgtag"]').each((_, el) => {
      const src = $(el).attr('src');
      const normalized = normalizeProductImageUrl(src);
      if (normalized) fullImages.push(normalized);
    });
  }

  const descPartsHtml: string[] = [];
  $('#vmMainPage td[colspan="2"] p').each((_, p) => {
    const htmlP = ($(p).html() || '').trim();
    if (htmlP) descPartsHtml.push(`<p>${htmlP}</p>`);
  });

  let description =
    descPartsHtml.length > 0
      ? htmlToPlainDescription(descPartsHtml.join('\n'))
      : rebuildDescriptionText(text);

  if (!description && text) {
    description = rebuildDescriptionText(text).slice(0, 4000);
  }

  return {
    title: title || 'Ручка',
    subtitle,
    price,
    brand: brandM?.[1]?.trim() || null,
    manufacturer: manufacturerM?.[1]?.trim()?.replace(/^\.\s*/, '') || null,
    description,
    fullImages: [...new Set(fullImages)],
  };
}

export async function fetchDetail(
  url: string,
  delayMs: number,
): Promise<StroykomHandlesDetailData> {
  const html = await fetchHtml(url);
  await sleep(delayMs);
  return parseDetailHtml(html);
}

export async function scrapeAllHandleListings(
  delayMs: number,
  onPage?: (url: string, count: number) => void,
): Promise<StroykomHandlesListingItem[]> {
  const all: StroykomHandlesListingItem[] = [];
  for (const limitstart of [0, 100]) {
    const url = `${STROYKOM_BASE}${STROYKOM_HANDLES_LIST_PATH}?page=shop.browse&category_id=${STROYKOM_HANDLES_SITE_CATEGORY_ID}&limit=100&limitstart=${limitstart}`;
    const html = await fetchHtml(url);
    const items = parseListingHtml(html);
    onPage?.(url, items.length);
    all.push(...items);
    await sleep(delayMs);
  }
  const byId = new Map(all.map((i) => [i.productId, i]));
  return [...byId.values()];
}
