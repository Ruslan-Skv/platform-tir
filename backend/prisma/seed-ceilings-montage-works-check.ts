/**
 * Справочные цены монтажа «СЗ М» из Excel (хранится рядом с прайсом CEILINGS).
 * Каталог работ для счёт-заказа — группа `natyazhnye-potolki` в remont-kvartir.
 *
 * Заполняется вместе с: npm run prisma:seed-ceilings-price-list
 *
 * Этот скрипт только печатает сверку имён работ сида с подсказкой менеджеру.
 */
import * as fs from 'fs';
import * as path from 'path';

const seedPath = path.join(__dirname, 'data', 'ceilings-price-list.seed.json');
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as {
  montageWorks?: Array<{ name: string; unit: string; unitPrice: number }>;
};

const works = seed.montageWorks ?? [];
console.log(`Монтажные работы из Excel «СЗ М»: ${works.length}`);
for (const w of works.slice(0, 15)) {
  console.log(` - ${w.name} (${w.unit}): ${w.unitPrice} ₽`);
}
if (works.length > 15) console.log(` ... и ещё ${works.length - 15}`);
console.log(
  '\nВ договоре CEILINGS: изделия — вкладка «Спецификация»; монтаж — «Счёт-заказ» (каталог «Натяжные потолки»).',
);
console.log('Цены монтажа из Excel сохранены в global template tab ceilings_montage_works при сиде прайса.');
