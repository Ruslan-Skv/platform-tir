import * as cheerio from 'cheerio';
import * as fs from 'fs';

const html = fs.readFileSync('scripts/_stroykom-handles-list.html', 'utf8');
const parts = html.split(/onMouseOver="this\.style\.boxShadow/);
const items: Array<{
  id: string;
  name: string;
  color: string | null;
  price: number | null;
  img: string | null;
}> = [];

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
    part.match(/src="([^"]*shop_image[^"]*)"/i);
  const priceRaw = priceM?.[1]?.replace(/[\s\u00a0]/g, '') ?? '';
  items.push({
    id: idM[1],
    name: nameM[1].replace(/\s+/g, ' ').trim(),
    color: colorM?.[1]?.trim() || null,
    price: priceRaw ? Number(priceRaw) : null,
    img: imgM?.[1] || null,
  });
}

const byName = new Map<string, typeof items>();
for (const it of items) {
  const list = byName.get(it.name) || [];
  list.push(it);
  byName.set(it.name, list);
}

const multi = [...byName.entries()].filter(([, v]) => v.length > 1);
console.log({
  items: items.length,
  products: byName.size,
  multi: multi.length,
  maxColors: Math.max(...[...byName.values()].map((v) => v.length)),
});
console.log('sample multi', multi.slice(0, 5));
console.log(
  'sample no color',
  items.filter((i) => !i.color).slice(0, 5),
);
