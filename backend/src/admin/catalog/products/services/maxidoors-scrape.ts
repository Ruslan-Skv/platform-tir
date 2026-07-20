import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

import { sanitizeSupplierDescriptionHtml, slugify, sleep } from './stroykom-handles-scrape';

export const MAXIDOORS_BASE = 'https://maxi-doors.ru';
/** @deprecated use catalog config listPath */
export const MAXIDOORS_HANDLES_LIST_PATH = '/product-category/furnitura/ruchki/';
export const MAXIDOORS_CYLINDERS_LIST_PATH = '/product-category/furnitura/cilindri/';
export const MAXIDOORS_THUMBTURNS_LIST_PATH = '/product-category/furnitura/zavertki/';
export const MAXIDOORS_LIMITERS_LIST_PATH = '/product-category/furnitura/ogranichiteli/';
export const MAXIDOORS_BOLTS_LIST_PATH = '/product-category/furnitura/zadvizhki/';
export const MAXIDOORS_PLATES_LIST_PATH = '/product-category/furnitura/nakladki/';
export const MAXIDOORS_LOCKS_LIST_PATH = '/product-category/furnitura/zamki-vreznie/';
export const MAXIDOORS_CLOSERS_LIST_PATH = '/product-category/furnitura/zamki-navesnie/';
export const MAXIDOORS_RIGELS_LIST_PATH = '/product-category/furnitura/rigeli/';
export const MAXIDOORS_SLIDING_LIST_PATH =
  '/product-category/furnitura/komplektujushhie-dlja-razdvizhnih-dverej/';
export const MAXIDOORS_HINGES_LIST_PATH = '/product-category/furnitura/petli-dvernie/';
export const MAXIDOORS_PLATE_HANDLES_LIST_PATH = '/product-category/furnitura/ruchki-na-planke/';
export const MAXIDOORS_MISC_LIST_PATH = '/product-category/furnitura/raznoe/';
export const MAXIDOORS_APARTMENT_DOORS_LIST_PATH =
  '/product-category/vhodnie-dveri/dveri-k-kvartiru/';

export type MaxidoorsListingItem = {
  productKey: string;
  name: string;
  price: number | null;
  thumbUrl: string | null;
  url: string;
  onOrder: boolean;
};

export type MaxidoorsDetailData = {
  title: string;
  price: number | null;
  supplierSku: string | null;
  onOrder: boolean;
  manufacturer: string | null;
  coatingMaterial: string | null;
  /** Sanitized HTML (характеристики + дополнительно) */
  description: string;
  /** Только блок «Дополнительно» без списка характеристик */
  extraDescription: string;
  charRows: Array<{ label: string; value: string }>;
  /** Варианты из блока «Размер:» → Product.sizes */
  sizes: string[];
  /** Стороны открывания из опций размера → Product.openingSide («левое»/«правое») */
  openingSides: Array<'левое' | 'правое'>;
  images: string[];
};

/** @deprecated alias */
export type MaxidoorsHandlesListingItem = MaxidoorsListingItem;
/** @deprecated alias */
export type MaxidoorsHandlesDetailData = MaxidoorsDetailData;

const COLOR_PHRASES = [
  'матовый никель/хром',
  'графит/хром',
  'зеленая бронза',
  'валлийские золото',
  'черный/графит',
  'белый/хром',
  'мат. никель',
  'мат.никель',
  'матовый никель',
  'мат.хром',
  'чёрный никель',
  'черный никель',
  'сатин хром',
  'матовый хром',
  'хром матовый',
  'белый',
  'черный',
  'чёрный',
  'графит',
  'бронза',
  'медь',
  'хром',
  'золото',
  'никель',
  'сатин',
  'антрацит',
  'латунь',
  'кофе',
  'венге',
].sort((a, b) => b.length - a.length);

export { slugify, sleep, sanitizeSupplierDescriptionHtml };

export function absUrl(href: string): string {
  if (!href) return href;
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return href.replace(/^http:\/\//i, 'https://');
  }
  if (href.startsWith('//')) return `https:${href}`;
  return new URL(href.replace(/^\/\//, '/'), MAXIDOORS_BASE).toString();
}

export function normalizeSlug(slug: string): string {
  return slug.trim().toLowerCase().replace(/_/g, '-');
}

export function parsePrice(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/\u00a0/g, ' ').match(/([\d\s]+(?:[.,]\d+)?)\s*₽?/);
  if (!m) return null;
  const n = Number(m[1].replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Цвет из названия: ищем известные оттенки (длинные фразы раньше коротких). */
export function extractColorFromName(name: string): string | null {
  const normalized = name.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  for (const phrase of COLOR_PHRASES) {
    const idx = lower.lastIndexOf(phrase.toLowerCase());
    if (idx >= 0) {
      return normalized.slice(idx, idx + phrase.length).trim();
    }
  }
  return null;
}

export function parseSupplierSku(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/Артикул\s+товара\s*[:.]?\s*([A-Za-z0-9\-_/]+)/i);
  return m?.[1]?.trim() || null;
}

function isOnOrderTape(text: string): boolean {
  const t = text.toLowerCase();
  return /под\s*заказ/.test(t) || /ожидании\s+поступления/.test(t) || /ожидает/.test(t);
}

function isProductImageUrl(url: string): boolean {
  if (!/maxi-doors\.ru/i.test(url)) return false;
  if (!/\/wp-content\/uploads\//i.test(url)) return false;
  if (!/\.(jpe?g|png|webp)$/i.test(url.split('?')[0])) return false;
  if (/icon|svg|gimmel|desktop_|banner|logo|tippy|np_like/i.test(url)) return false;
  return true;
}

/** Prefer full-size over -150x150 / -600x600 variants. */
export function preferFullSizeImageUrl(url: string): string {
  return url.replace(/-\d+x\d+(?=\.(jpe?g|png|webp)$)/i, '');
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; TerritoryInteriorImporter/1.0; +https://territory-interior.ru)',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function productKeyFromUrl(url: string): string {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || url;
  } catch {
    return url;
  }
}

export function parseListingHtml(html: string): MaxidoorsListingItem[] {
  const $ = cheerio.load(html);
  const items: MaxidoorsListingItem[] = [];
  const seen = new Set<string>();

  $('.catalog-products .item').each((_, el) => {
    const card = $(el);
    const href = card.find('a[href*="/product/"]').first().attr('href');
    if (!href) return;
    const url = absUrl(href).split('#')[0].replace(/\/?$/, '/');
    if (seen.has(url)) return;
    seen.add(url);

    const name =
      card
        .find('.descr a, .descr .title, a[href*="/product/"]')
        .first()
        .text()
        .replace(/\s+/g, ' ')
        .trim() ||
      card.find('img').first().attr('alt')?.replace(/\s+/g, ' ').trim() ||
      '';
    if (!name) return;

    const price = parsePrice(card.find('.price').first().text());
    const thumbRaw =
      card.find('img').first().attr('data-src') || card.find('img').first().attr('src') || null;
    const thumbUrl =
      thumbRaw && isProductImageUrl(absUrl(thumbRaw))
        ? preferFullSizeImageUrl(absUrl(thumbRaw))
        : null;
    const tape = card.find('.tape').text().replace(/\s+/g, ' ').trim();
    const onOrder = isOnOrderTape(tape) || isOnOrderTape(card.text());

    items.push({
      productKey: productKeyFromUrl(url),
      name,
      price,
      thumbUrl,
      url,
      onOrder,
    });
  });

  return items;
}

export function normalizeListPath(listPath: string): string {
  const p = listPath.trim();
  if (!p) return '/';
  const withSlash = p.startsWith('/') ? p : `/${p}`;
  return withSlash.endsWith('/') ? withSlash : `${withSlash}/`;
}

export function detectLastListPage(html: string, listPath?: string): number {
  const $ = cheerio.load(html);
  let max = 1;
  const needle = listPath ? normalizeListPath(listPath).replace(/\/$/, '') : '/product-category/';
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    if (!href.includes(needle) && !href.includes(needle.replace(/^\//, ''))) return;
    const m = href.match(/\/page\/(\d+)\/?/i);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return max;
}

export async function scrapeAllListings(
  listPath: string,
  delayMs: number,
  onPage?: (url: string, count: number) => void,
): Promise<MaxidoorsListingItem[]> {
  const pathNorm = normalizeListPath(listPath);
  const firstUrl = `${MAXIDOORS_BASE}${pathNorm}`;
  const firstHtml = await fetchHtml(firstUrl);
  const lastPage = detectLastListPage(firstHtml, pathNorm);
  const all: MaxidoorsListingItem[] = [];
  const seen = new Set<string>();

  const pushPage = (url: string, html: string) => {
    const items = parseListingHtml(html);
    onPage?.(url, items.length);
    for (const item of items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      all.push(item);
    }
  };

  pushPage(firstUrl, firstHtml);

  for (let page = 2; page <= lastPage; page++) {
    await sleep(delayMs);
    const url = `${MAXIDOORS_BASE}${pathNorm}page/${page}/`;
    try {
      const html = await fetchHtml(url);
      pushPage(url, html);
    } catch {
      break;
    }
  }

  return all;
}

/** @deprecated use scrapeAllListings(MAXIDOORS_HANDLES_LIST_PATH, ...) */
export async function scrapeAllHandleListings(
  delayMs: number,
  onPage?: (url: string, count: number) => void,
): Promise<MaxidoorsListingItem[]> {
  return scrapeAllListings(MAXIDOORS_HANDLES_LIST_PATH, delayMs, onPage);
}

function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function charsToHtml(rows: Array<{ label: string; value: string }>): string {
  if (rows.length === 0) return '';
  const lis = rows
    .map(
      (r) =>
        `<li><strong>${escapeHtmlText(r.label.replace(/:$/, ''))}:</strong> ${escapeHtmlText(r.value)}</li>`,
    )
    .join('\n');
  return `<ul>\n${lis}\n</ul>`;
}

function normalizeCharLabel(label: string): string {
  return label.replace(/:$/, '').trim().toLowerCase();
}

/** Разбор одной опции «860х2050 левая» → размер + сторона. */
export function parseMaxidoorsSizeOptionText(text: string): {
  size: string | null;
  openingSide: 'левое' | 'правое' | null;
} {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t || /выберите|choose|select\s*size/i.test(t)) {
    return { size: null, openingSide: null };
  }

  let openingSide: 'левое' | 'правое' | null = null;
  if (/(?:^|[\s,;/(])лев(?:ая|ое|ый)(?:$|[\s,;)/])/i.test(` ${t} `)) openingSide = 'левое';
  else if (/(?:^|[\s,;/(])прав(?:ая|ое|ый)(?:$|[\s,;)/])/i.test(` ${t} `)) openingSide = 'правое';

  const size = t
    .replace(/лев(?:ая|ое|ый)/gi, '')
    .replace(/прав(?:ая|ое|ый)/gi, '')
    .replace(/[x×XХ]/g, 'х')
    .replace(/\s+/g, ' ')
    .replace(/^[,;.\-–—/\s]+|[,;.\-–—/\s]+$/g, '')
    .trim();

  if (!size || !/\d/.test(size)) return { size: null, openingSide };
  return { size, openingSide };
}

/**
 * Варианты из блока «Размер:» (select.select-size на карточке MaxiDoors).
 * Уникальные размеры → Product.sizes; стороны → Product.openingSide.
 */
export function extractMaxidoorsSizeVariants($: cheerio.Root): {
  sizes: string[];
  openingSides: Array<'левое' | 'правое'>;
} {
  const sizes: string[] = [];
  const sizeSeen = new Set<string>();
  const sides = new Set<'левое' | 'правое'>();

  const pushOption = (raw: string) => {
    const { size, openingSide } = parseMaxidoorsSizeOptionText(raw);
    if (openingSide) sides.add(openingSide);
    if (!size) return;
    const key = size.toLowerCase();
    if (sizeSeen.has(key)) return;
    sizeSeen.add(key);
    sizes.push(size);
  };

  $('select.select-size option, select[name="attribute_pa_razmer"] option').each((_, el) => {
    pushOption($(el).text());
  });

  // Fallback: характеристика «Размер: …» одним текстом
  if (sizes.length === 0) {
    $('.item-descr-2 .chars > div').each((_, el) => {
      const spans = $(el).find('span');
      const label = spans.eq(0).text().replace(/:$/, '').replace(/\s+/g, ' ').trim();
      if (!/^размер$/i.test(label)) return;
      const value = spans.eq(1).text().replace(/\s+/g, ' ').trim();
      for (const part of value.split(/[,;]|(?=\d{2,4}\s*[xх×XХ])/)) {
        pushOption(part);
      }
    });
  }

  const openingSides: Array<'левое' | 'правое'> = [];
  if (sides.has('левое')) openingSides.push('левое');
  if (sides.has('правое')) openingSides.push('правое');

  return { sizes, openingSides };
}

/**
 * Разбирает блок «Описание» поставщика на пары «Параметр: значение»
 * (часто через &lt;br&gt;/&lt;p&gt; или одним абзацем).
 */
export function extractLabeledDescriptionFields(
  raw: string,
): Array<{ label: string; value: string }> {
  if (!raw?.trim()) return [];

  const plain = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();

  if (!plain) return [];

  const collect = (pushAll: (push: (label: string, value: string) => void) => void) => {
    const rows: Array<{ label: string; value: string }> = [];
    const seen = new Set<string>();
    const push = (labelRaw: string, valueRaw: string) => {
      const label = labelRaw.replace(/:$/, '').replace(/\s+/g, ' ').trim();
      const value = valueRaw.replace(/\s+/g, ' ').trim();
      if (label.length < 2 || label.length > 90 || !value) return;
      if (/^\d+$/.test(label)) return;
      if (/^https?/i.test(label)) return;
      // Подписи характеристик у MaxiDoors — по-русски
      if (!/[А-ЯЁа-яё]/.test(label)) return;
      if (/[\/\\]/.test(label)) return;
      if (/^(г\.|ул\.|пр\.|тел|пн|сб|вс)/i.test(label)) return;
      if (isMaxidoorsBoilerplateCharRow(label, value)) return;
      const key = normalizeCharLabel(label);
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ label, value });
    };
    pushAll(push);
    return rows;
  };

  const fromLines = collect((push) => {
    for (const line of plain.split(/\n+/)) {
      const t = line.replace(/\s+/g, ' ').trim();
      if (!t) continue;
      const idx = t.indexOf(':');
      if (idx <= 0) continue;
      push(t.slice(0, idx), t.slice(idx + 1));
    }
  });

  // Построчный разбор надёжнее (нет ложных «RIGGER/MONARCH Внешние петли»)
  if (fromLines.length >= 2) return fromLines;

  return collect((push) => {
    // Один абзац: новый параметр после начала / точки / перевода строки; подпись с кириллицы
    const source = plain;
    const reNl = /(?:^|[.!?]\s+|\n+\s*)([А-ЯЁ][А-ЯЁа-яё0-9][А-ЯЁа-яё0-9\s\-()]{0,68}?)\s*:\s*/g;
    const matches: Array<{ label: string; index: number; len: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = reNl.exec(source)) !== null) {
      matches.push({ label: m[1], index: m.index, len: m[0].length });
    }
    if (matches.length === 0) {
      const normalized = plain.replace(/\s+/g, ' ').trim();
      const reFlat = /(?:^|[.!?]\s+)([А-ЯЁ][А-ЯЁа-яё0-9][А-ЯЁа-яё0-9\s\-()]{0,68}?)\s*:\s*/g;
      while ((m = reFlat.exec(normalized)) !== null) {
        matches.push({ label: m[1], index: m.index, len: m[0].length });
      }
      for (let i = 0; i < matches.length; i++) {
        const valueStart = matches[i].index + matches[i].len;
        const valueEnd = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
        push(matches[i].label, normalized.slice(valueStart, valueEnd));
      }
      return;
    }
    for (let i = 0; i < matches.length; i++) {
      const valueStart = matches[i].index + matches[i].len;
      const valueEnd = i + 1 < matches.length ? matches[i + 1].index : source.length;
      push(matches[i].label, source.slice(valueStart, valueEnd));
    }
  });
}

/** Убирает из текста/HTML строки вида «Label: value» для уже извлечённых параметров.
 * Всегда возвращает plain text (без HTML-тегов), с переводами строк между абзацами.
 */
export function stripLabeledFieldsFromDescription(raw: string, labels: string[]): string {
  if (!raw?.trim()) return '';
  const labelSet = new Set(labels.map(normalizeCharLabel));

  const plain = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\r/g, '');

  const kept: string[] = [];
  for (const line of plain.split(/\n+/)) {
    const t = line.replace(/\s+/g, ' ').trim();
    if (!t) continue;
    const idx = t.indexOf(':');
    if (idx > 0) {
      const label = t.slice(0, idx).trim();
      if (labelSet.has(normalizeCharLabel(label))) continue;
    }
    kept.push(t);
  }

  let remaining = kept.join('\n').trim();
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `${escaped}\\s*:\\s*.*?(?=\\s+[A-Za-zА-ЯЁ][A-Za-zА-ЯЁа-яё0-9][A-Za-zА-ЯЁа-яё0-9\\s\\-_/()]{0,68}?\\s*:|$)`,
      'i',
    );
    remaining = remaining
      .replace(re, ' ')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .trim();
  }

  return remaining;
}

/** Plain text → безопасные абзацы HTML (теги не показываются как текст). */
export function plainTextToParagraphsHtml(text: string): string {
  if (!text?.trim()) return '';
  return text
    .split(/\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p>${escapeHtmlText(p)}</p>`)
    .join('\n');
}

/**
 * Собирает HTML описания. Характеристики из excludeLabels не попадают в список
 * (они уже записаны в отдельные поля карточки).
 * Если остался только доп. текст — без заголовка «Дополнительно» (в публичке он и так в «Описание»).
 */
export function buildMaxidoorsProductDescription(
  charRows: Array<{ label: string; value: string }>,
  extraDescription: string,
  excludeLabels: string[] = [],
): string {
  const excluded = new Set(excludeLabels.map(normalizeCharLabel).filter(Boolean));
  const remaining = charRows.filter((r) => !excluded.has(normalizeCharLabel(r.label)));
  const charsHtml = charsToHtml(remaining);
  const extra = extraDescription.trim();

  if (charsHtml && extra) {
    return `<p><strong>Описание</strong></p>\n${charsHtml}\n<p><strong>Дополнительно</strong></p>\n${extra}`;
  }
  if (charsHtml) {
    return `<p><strong>Описание</strong></p>\n${charsHtml}`;
  }
  // Только доп. текст — без подзаголовка «Дополнительно»
  return extra;
}

export function parseDetailHtml(html: string): MaxidoorsDetailData {
  const $ = cheerio.load(html);
  const title = $('h1').first().text().replace(/\s+/g, ' ').trim();
  const supplierSku =
    parseSupplierSku($('.code-up').first().text()) || parseSupplierSku($.root().text());

  const price =
    parsePrice($('.item-descr-1 .price').first().text()) ||
    parsePrice($('.catalog-item .price').first().text());

  const tape = $('.catalog-item .tape, .tape-stock').first().text().replace(/\s+/g, ' ').trim();
  const onOrder =
    isOnOrderTape(tape) || isOnOrderTape($('.catalog-item').first().text().slice(0, 2000));

  const charRows: Array<{ label: string; value: string }> = [];
  $('.item-descr-2 .chars > div').each((_, el) => {
    const spans = $(el).find('span');
    const label = spans.eq(0).text().replace(/\s+/g, ' ').trim();
    const value = spans.eq(1).text().replace(/\s+/g, ' ').trim();
    if (label && value) charRows.push({ label, value });
  });

  const findChar = (re: RegExp) =>
    charRows.find((r) => re.test(r.label.replace(/:$/, '')))?.value?.trim() || null;

  const extraHtml = $('.item-descr-3 .text').first().html() || '';
  const extraText = $('.item-descr-3 .text').first().text().replace(/\s+/g, ' ').trim();

  // Сначала срезаем рекламный хвост — иначе из него появляются ложные атрибуты
  // («Данную модель Вы можете…: г. Мурманск…»).
  const descriptionSourceRaw = extraHtml.trim() || extraText;
  const descriptionSourceClean = stripMaxidoorsBoilerplateText(
    descriptionSourceRaw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' '),
  );

  // Параметры из блока «Описание» («Внутренняя отделка: …», «Толщина стали: …» и т.д.)
  const labeledFromDescription = extractLabeledDescriptionFields(descriptionSourceClean);
  for (const row of labeledFromDescription) {
    if (isMaxidoorsBoilerplateCharRow(row.label, row.value)) continue;
    const key = normalizeCharLabel(row.label);
    if (charRows.some((r) => normalizeCharLabel(r.label) === key)) continue;
    charRows.push({ label: row.label, value: row.value });
  }

  // У ограничителей и части фурнитуры «Производитель» / материал часто только в тексте описания.
  let manufacturer = findChar(/^производитель$/i);
  if (!manufacturer) {
    const m = extraText.match(
      /производитель\s*:\s*([A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9\s.,\-/()]{0,80}?)(?=\s*(?:дополнительно|материал|цвет|высота|гальваническое|$))/i,
    );
    manufacturer = m?.[1]?.replace(/\s+/g, ' ').trim() || null;
  }

  const coatingMaterial = findChar(/^материал\s+покрытия$/i);

  if (!findChar(/^материал$/i)) {
    const mat =
      findChar(/^материал\s+изготовления$/i) ||
      extraText
        .match(/материал\s+изготовления\s*:\s*([^.]+)/i)?.[1]
        ?.replace(/\s+/g, ' ')
        .trim() ||
      null;
    if (mat) charRows.push({ label: 'Материал', value: mat });
  }

  // Описание без уже разобранных «Параметр: значение» (они уйдут в атрибуты).
  // Всегда plain→HTML: иначе сырые <p> экранируются и видны как текст.
  const remainingPlain = stripLabeledFieldsFromDescription(
    extraHtml.trim() || extraText,
    labeledFromDescription.map((r) => r.label),
  );
  const cleanedRemaining = stripMaxidoorsBoilerplateText(remainingPlain);
  const extraDescription = plainTextToParagraphsHtml(cleanedRemaining);

  const images: string[] = [];
  const pushImg = (raw: string | undefined | null) => {
    if (!raw) return;
    const url = preferFullSizeImageUrl(absUrl(raw.split('?')[0]));
    if (!isProductImageUrl(url)) return;
    if (!images.includes(url)) images.push(url);
  };

  // Галерея текущего товара (data-fancybox="product-{postId}"), без блока «Популярное».
  const postId = $('body')
    .attr('class')
    ?.match(/postid-(\d+)/)?.[1];
  if (postId) {
    $(`a[data-fancybox="product-${postId}"]`).each((_, a) => pushImg($(a).attr('href')));
  }
  if (images.length === 0) {
    $('.catalog-item .lside.aside-flow a[data-fancybox], .catalog-item .lside a[data-fancybox]')
      .first()
      .closest('.lside')
      .find('a[data-fancybox]')
      .each((_, a) => pushImg($(a).attr('href')));
  }
  if (images.length === 0) {
    $('.catalog-item .lside.aside-flow img, .woocommerce-product-gallery__image img').each(
      (_, img) => {
        const $img = $(img);
        pushImg($img.attr('data-large_image') || $img.attr('data-src') || $img.attr('src'));
      },
    );
  }
  if (images.length === 0) {
    $('meta[property="og:image"]').each((_, el) => pushImg($(el).attr('content')));
  }

  // Финальный фильтр: рекламный хвост не должен попасть в charRows / атрибуты.
  // «Размер» уходит в Product.sizes, не в JSON-атрибуты.
  const filteredCharRows = charRows.filter(
    (r) =>
      !isMaxidoorsBoilerplateCharRow(r.label, r.value) &&
      !/^размер$/i.test(r.label.replace(/:$/, '').trim()),
  );
  const description = buildMaxidoorsProductDescription(filteredCharRows, extraDescription);

  const { sizes, openingSides } = extractMaxidoorsSizeVariants($);

  return {
    title,
    price,
    supplierSku,
    onOrder,
    manufacturer,
    coatingMaterial,
    description,
    extraDescription,
    charRows: filteredCharRows,
    sizes,
    openingSides,
    images: images.slice(0, 12),
  };
}

const MAXIDOORS_BOILERPLATE_RE =
  /возникли\s+вопросы|60-11-60|оформите\s+заказ\s+и\s+наши\s+сотрудники|фото\s+двери\s+может\s+не\s+передать|салонах\s+наших\s+партнеров|данную\s+модель\s+вы\s+можете|детально\s+рассмотреть|г\.\s*мурманск|г\.\s*апатиты|ул\.\s*свердлова|ул\.\s*ферсмана|кольский\s+просп/i;

/** Рекламный/контактный хвост или «псевдо-характеристика» из него — не переносим в атрибуты. */
export function isMaxidoorsBoilerplateCharRow(label: string, value: string): boolean {
  const blob = `${label} ${value}`.replace(/\s+/g, ' ').trim();
  if (!blob) return true;
  if (MAXIDOORS_BOILERPLATE_RE.test(blob)) return true;
  if (/данную\s+модель|салонах\s+наших\s+партн/i.test(label)) return true;
  if (/^г\.\s*/i.test(value) && /ул\.|просп/i.test(value)) return true;
  return false;
}

/**
 * У MaxiDoors часто Word-вёрстка с <br> посередине фразы (узкая колонка).
 * Меняем такие переносы на пробелы, чтобы текст нормально переносился по ширине.
 */
export function normalizeMaxidoorsDescriptionFlow(html: string): string {
  if (!html?.trim()) return '';
  const $ = cheerio.load(`<div id="md-flow">${html}</div>`, { decodeEntities: false });
  const $root = $('#md-flow');

  $root.find('br').replaceWith(' ');

  $root.find('*').each((_, el) => {
    const $el = $(el);
    // Убираем inline-стили Word (text-align/line-height), они не нужны в нашей карточке
    if ($el.attr('style')) $el.removeAttr('style');
    if ($el.attr('class')?.match(/Mso/i)) $el.removeAttr('class');
  });

  // Схлопываем пробелы в текстовых узлах
  $root
    .find('*')
    .addBack()
    .contents()
    .each((_, node) => {
      if (node.type === 'text' && typeof (node as { data?: string }).data === 'string') {
        (node as { data: string }).data = (node as { data: string }).data
          .replace(/\u00a0/g, ' ')
          .replace(/[ \t\r\n]+/g, ' ');
      }
    });

  return ($root.html() || '')
    .replace(/ {2,}/g, ' ')
    .replace(/ ([.,:;!?])/g, '$1')
    .trim();
}

/** Убирает общий рекламный/контактный хвост MaxiDoors из HTML описания. */
export function stripMaxidoorsBoilerplateHtml(html: string): string {
  if (!html?.trim()) return '';
  const $ = cheerio.load(`<div id="md-desc">${html}</div>`, { decodeEntities: false });
  const $root = $('#md-desc');

  $root.find('p, div, li').each((_, el) => {
    const $el = $(el);
    const text = $el.text().replace(/\s+/g, ' ').trim();
    if (!text || !MAXIDOORS_BOILERPLATE_RE.test(text)) return;
    // Только листовые блоки — родителей с вложенными p/div не трогаем
    if ($el.children('p, div, li').length > 0) return;
    $el.remove();
  });

  // Пустые обёртки после удаления
  for (let i = 0; i < 4; i++) {
    $root.find('div, p, span').each((_, el) => {
      const $el = $(el);
      if (!$el.text().replace(/\s+/g, '').trim() && $el.find('img').length === 0) {
        $el.remove();
      }
    });
  }

  return ($root.html() || '').trim();
}

export function stripMaxidoorsBoilerplateText(text: string): string {
  if (!text?.trim()) return '';
  const markers = [
    /Возникли\s+вопросы/i,
    /Оформите\s+заказ\s+и\s+наши\s+сотрудники/i,
    /Фото\s+двери\s+может\s+не\s+передать/i,
    /Данную\s+модель\s+Вы\s+можете/i,
    /салонах\s+наших\s+партнеров/i,
  ];
  let cut = text.length;
  for (const re of markers) {
    const m = text.match(re);
    if (m?.index != null) cut = Math.min(cut, m.index);
  }
  // Сохраняем переносы строк — они нужны для разбора «Параметр: значение».
  return text
    .slice(0, cut)
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Галерея карточки целиком + thumb с листинга, если его ещё нет в списке.
 */
export function mergeProductImages(opts: {
  listingImageUrl: string | null;
  detailImageUrls: string[];
  supplierSku: string | null;
}): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string | null | undefined) => {
    if (!raw) return;
    const n = preferFullSizeImageUrl(absUrl(raw.split('?')[0]));
    if (!isProductImageUrl(n) || seen.has(n)) return;
    seen.add(n);
    result.push(n);
  };

  // Сначала все фото галереи (упаковка, чертёж, изделие и т.д.)
  for (const url of opts.detailImageUrls) push(url);
  // Fallback / дополнение с листинга
  push(opts.listingImageUrl);

  void opts.supplierSku;
  return result.slice(0, 12);
}

export async function fetchDetail(url: string, delayMs: number): Promise<MaxidoorsDetailData> {
  if (delayMs > 0) await sleep(delayMs);
  const html = await fetchHtml(url);
  return parseDetailHtml(html);
}

/** Достаёт значение характеристики по подписи (без учёта двоеточия/регистра). */
export function findCharValue(
  charRows: Array<{ label: string; value: string }>,
  labelMatch: string | RegExp,
): string | null {
  const row = charRows.find((r) => {
    const label = r.label.replace(/:$/, '').trim();
    if (typeof labelMatch === 'string') {
      return label.toLowerCase() === labelMatch.toLowerCase();
    }
    return labelMatch.test(label);
  });
  return row?.value?.trim() || null;
}

function detectImageExtension(buf: Buffer, contentType: string | null): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50) return '.png';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF') return '.webp';
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  return null;
}

export async function downloadMaxidoorsImagesToUploads(
  remoteUrls: string[],
  productKey: string,
  filePrefix = 'md',
): Promise<string[]> {
  if (remoteUrls.length === 0) return [];

  const dir = path.join(process.cwd(), 'uploads', 'products', 'maxidoors');
  fs.mkdirSync(dir, { recursive: true });

  const local: string[] = [];
  const prefix = (filePrefix || 'md').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 12);
  for (let i = 0; i < remoteUrls.length; i++) {
    const remote = remoteUrls[i];
    try {
      const res = await fetch(remote, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; TerritoryInteriorImporter/1.0; +https://territory-interior.ru)',
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: `${MAXIDOORS_BASE}/`,
        },
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const ext = detectImageExtension(buf, res.headers.get('content-type'));
      if (!ext) continue;

      const safeKey = productKey.replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40);
      const filename = `${prefix}-${safeKey}-${i}${ext}`;
      fs.writeFileSync(path.join(dir, filename), buf);
      local.push(`/uploads/products/maxidoors/${filename}`);
    } catch {
      // continue
    }
  }
  return local;
}

export function buildSeoFields(
  productName: string,
  categoryName: string,
  extraKeywords: string[] = [],
) {
  const site = 'Территория интерьерных решений';
  const seoTitle = (
    categoryName ? `${productName} - ${categoryName} | ${site}` : `${productName} | ${site}`
  ).substring(0, 70);
  const seoDescription =
    `Купить ${productName}${categoryName ? ` в категории ${categoryName}` : ''}. Гарантия качества. ${site}`.substring(
      0,
      160,
    );
  const keywords = [productName, categoryName, ...extraKeywords, 'фурнитура', 'Максидорс']
    .map((k) => k.trim())
    .filter(Boolean);
  const shortDescription = seoDescription;
  return { seoTitle, seoDescription, seoKeywords: keywords, shortDescription };
}
