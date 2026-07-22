/**
 * Сид прайса «Натяжные потолки» из Excel «Договор Потолок 2026».
 *
 * Локально: npm run prisma:seed-ceilings-price-list
 *
 * Режим: CEILINGS_PRICE_SEED_MODE=fill-missing|replace (по умолчанию replace)
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });

const KIND = 'CEILINGS' as const;
const TAB = 'ceilings_price_list';
const prisma = new PrismaClient();

async function main() {
  const seedPath = path.join(__dirname, 'data', 'ceilings-price-list.seed.json');
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Не найден файл сида: ${seedPath}`);
  }
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as {
    settings: Record<string, number>;
    items: unknown[];
    montageWorks?: unknown[];
  };
  const mode = (process.env.CEILINGS_PRICE_SEED_MODE ?? 'replace').trim();

  const existing = await prisma.contractDocumentGlobalTemplate.findUnique({
    where: { kind_tab: { kind: KIND, tab: TAB } },
    select: { html: true },
  });

  if (mode === 'fill-missing' && existing?.html?.trim()) {
    try {
      const parsed = JSON.parse(existing.html) as { items?: unknown[] };
      if (Array.isArray(parsed.items) && parsed.items.length > 0) {
        console.log(
          `⏭️  CEILINGS price list уже заполнен (${parsed.items.length} поз.), режим fill-missing — пропуск`,
        );
      } else {
        await writePriceList(seed);
      }
    } catch {
      await writePriceList(seed);
    }
  } else {
    await writePriceList(seed);
  }

  if (Array.isArray(seed.montageWorks) && seed.montageWorks.length > 0) {
    const worksPayload = JSON.stringify({ items: seed.montageWorks });
    await prisma.contractDocumentGlobalTemplate.upsert({
      where: { kind_tab: { kind: KIND, tab: 'ceilings_montage_works' } },
      create: { kind: KIND, tab: 'ceilings_montage_works', html: worksPayload },
      update: { html: worksPayload },
    });
    console.log(`✅ CEILINGS montage works: ${seed.montageWorks.length} позиций`);
  }
}

async function writePriceList(seed: {
  settings: Record<string, number>;
  items: unknown[];
}) {
  const payload = JSON.stringify({
    settings: seed.settings,
    items: seed.items,
  });
  await prisma.contractDocumentGlobalTemplate.upsert({
    where: { kind_tab: { kind: KIND, tab: TAB } },
    create: { kind: KIND, tab: TAB, html: payload },
    update: { html: payload },
  });
  console.log(
    `✅ CEILINGS price list: ${seed.items.length} позиций, settings=${JSON.stringify(seed.settings)}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
