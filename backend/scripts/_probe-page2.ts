import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function fetchHtml(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; TerritoryInteriorBot/1.0)',
      Accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const url =
    'https://436830.ru/furnitura/2024-08-06-08-51-35.html?page=shop.browse&category_id=53&limit=100&limitstart=100';
  const html = await fetchHtml(url);
  fs.writeFileSync('scripts/_stroykom-handles-list-p2.html', html, 'utf8');
  const $ = cheerio.load(html);
  console.log('title', $('title').text());
  console.log('results', html.match(/Результаты[\s\S]{0,40}/)?.[0]);
  console.log('product ids', new Set([...(html.matchAll(/product_id=(\d+)/g))].map((m) => m[1])).size);
}

main();
