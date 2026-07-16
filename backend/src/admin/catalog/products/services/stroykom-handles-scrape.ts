import * as cheerio from 'cheerio';

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
  descriptionHtml: string;
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

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
      thumbUrl: imgM?.[1] ? absUrl(imgM[1].replace(/&amp;/g, '&')) : null,
      url,
    });
  }

  return items;
}

function rebuildDescriptionText(text: string): string {
  return text
    .replace(/Торговая марка:/gi, '\nТорговая марка:')
    .replace(/Производитель:/gi, '\nПроизводитель:')
    .replace(/Наименование:/gi, '\nНаименование:')
    .replace(/Варианты цветов:/gi, '\nВарианты цветов:')
    .replace(/Описание:/gi, '\nОписание:')
    .replace(/Комплектация:/gi, '\nКомплектация:')
    .replace(/•/g, '\n• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
    if (!href) return;
    if (/uvelich\.png|M_images|banners/i.test(href)) return;
    fullImages.push(absUrl(href));
  });

  const descParts: string[] = [];
  $('#vmMainPage td[colspan="2"] p').each((_, p) => {
    const htmlP = ($(p).html() || '').trim();
    if (htmlP) descParts.push(`<p>${htmlP}</p>`);
  });

  let descriptionHtml =
    descParts.length > 0 ? descParts.join('\n') : `<p>${escapeHtml(text.slice(0, 4000))}</p>`;

  if (descParts.length < 2 && text.length > 80) {
    descriptionHtml = `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(
      rebuildDescriptionText(text),
    )}</pre>`;
  }

  return {
    title: title || 'Ручка',
    subtitle,
    price,
    brand: brandM?.[1]?.trim() || null,
    manufacturer: manufacturerM?.[1]?.trim() || null,
    descriptionHtml,
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
