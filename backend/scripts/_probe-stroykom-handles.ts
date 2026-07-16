/**
 * Quick probe of StroyKom handles category HTML structure.
 */
import * as cheerio from 'cheerio';
import * as fs from 'fs';

const LIST_URL =
  'https://436830.ru/furnitura/2024-08-06-08-51-35.html?page=shop.browse&category_id=53&limit=100';

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; TerritoryInteriorBot/1.0; +https://territory-interior.ru)',
      Accept: 'text/html',
    },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main() {
  const html = await fetchHtml(LIST_URL);
  fs.writeFileSync('scripts/_stroykom-handles-list.html', html, 'utf8');
  const $ = cheerio.load(html);

  const links = new Map<string, { href: string; text: string; price?: string }>();

  $('a[href*="product_details"], a[href*="product_id"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!href || !text) return;
    const abs = href.startsWith('http') ? href : new URL(href, 'https://436830.ru').toString();
    const key = abs.replace(/&amp;/g, '&');
    if (!links.has(key)) links.set(key, { href: key, text });
  });

  // Also try common virtuemart product boxes
  $('.browseProductContainer, .product-container, td, .product').each((_, el) => {
    const a = $(el).find('a[href*="product"]').first();
    const href = a.attr('href');
    if (!href) return;
    const abs = href.startsWith('http') ? href : new URL(href, 'https://436830.ru').toString();
    const text = ($(el).text() || a.text()).replace(/\s+/g, ' ').trim().slice(0, 120);
    const priceMatch = text.match(/([\d\s]+)\s*руб/i);
    if (!links.has(abs)) {
      links.set(abs, { href: abs, text, price: priceMatch?.[1] });
    }
  });

  console.log('Found links', links.size);
  console.log([...links.values()].slice(0, 20));

  // Inspect one product page
  const first = [...links.values()].find((l) => /product_id=\d+/i.test(l.href));
  if (first) {
    console.log('\nFetching detail', first.href);
    const detailHtml = await fetchHtml(first.href);
    fs.writeFileSync('scripts/_stroykom-handle-detail.html', detailHtml, 'utf8');
    const $d = cheerio.load(detailHtml);
    const title = $d('h1, .product-title, .productName, td.productName').first().text().trim();
    const imgs = new Set<string>();
    $d('img').each((_, img) => {
      const src = $d(img).attr('src') || '';
      if (/product|virtuemart|components\/com_virtuemart/i.test(src) || /\.(jpe?g|png|webp)/i.test(src)) {
        imgs.add(src.startsWith('http') ? src : new URL(src, 'https://436830.ru').toString());
      }
    });
    console.log({ title, imgCount: imgs.size, imgs: [...imgs].slice(0, 10) });
    // text body sample
    const body = $d('#product_description, .product-description, .desc, table').text().replace(/\s+/g, ' ').trim();
    console.log('body sample', body.slice(0, 800));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
