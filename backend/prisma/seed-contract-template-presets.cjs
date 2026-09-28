/**
 * Сид библиотеки шаблонов (contract_document_global_templates) для запуска
 * ВНУТРИ прод-контейнера backend: нет ts-node и frontend .ts — только seed-data/*.json.
 *
 * Локально:  node prisma/seed-contract-template-presets.cjs            (все направления)
 *            node prisma/seed-contract-template-presets.cjs DOORS BLINDS
 * Контейнер: docker compose -f docker-compose.infra.yml -f docker-compose.prod.yml \
 *              exec backend node prisma/seed-contract-template-presets.cjs DOORS CEILINGS BLINDS
 *
 * Режим: {KIND}_TEMPLATES_SEED_MODE или TEMPLATES_SEED_MODE (fill-missing | replace-library),
 * по умолчанию fill-missing — добавляет пресет только на пустую вкладку, существующие не трогает.
 *
 * Логика 1:1 с prisma/seed-contract-template-presets-lib.ts (кроме fallback на frontend .ts).
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const CONTRACT_TEMPLATES_TAB = 'contract_templates';

/** Те же вкладки, что в seed-{kind}-contract-template-presets.ts */
const KIND_CONFIG = {
  REPAIR: {
    libraryTabs: ['contract', 'consent', 'actStart', 'actAcceptance', 'cashOrder', 'productionLog'],
  },
  WINDOWS: {
    libraryTabs: ['contract', 'consent', 'actAcceptance', 'memo', 'cashOrder'],
  },
  DOORS: {
    libraryTabs: ['contract', 'consent', 'actAcceptance', 'deliveryNote', 'memo', 'cashOrder'],
  },
  CEILINGS: {
    libraryTabs: ['contract', 'consent', 'actAcceptance', 'memo', 'cashOrder'],
  },
  BLINDS: {
    libraryTabs: ['contract', 'consent', 'actAcceptance', 'deliveryNote', 'memo', 'cashOrder'],
  },
};

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL не задан (в контейнере backend он есть в environment).');
  process.exit(1);
}

function loadDefaultsFromSeedJson(kind) {
  const jsonPath = path.join(__dirname, 'seed-data', `${kind.toLowerCase()}-library-templates.seed.json`);
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`${kind}: нет снимка ${jsonPath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const allowed = new Set(KIND_CONFIG[kind].libraryTabs);
  return (Array.isArray(parsed.items) ? parsed.items : [])
    .filter((it) => allowed.has(it.tabId) && !it.archived && !it.deletedAt)
    .map((it) => ({
      id: (it.id || '').trim() || `seed-${kind.toLowerCase()}-${it.tabId}`,
      title: (it.title || '').trim() || it.tabId,
      tabId: it.tabId,
      html: it.html || '',
      isDefault: Boolean(it.isDefault),
      archived: false,
    }))
    .filter((it) => Boolean(it.html.trim()));
}

async function seedKind(prisma, kind) {
  const mode = (
    process.env[`${kind}_TEMPLATES_SEED_MODE`] ||
    process.env.TEMPLATES_SEED_MODE ||
    'fill-missing'
  ).trim();
  const libraryTabs = KIND_CONFIG[kind].libraryTabs;
  const allowedTabs = new Set(libraryTabs);
  const defaults = loadDefaultsFromSeedJson(kind);

  const row = await prisma.contractDocumentGlobalTemplate.findUnique({
    where: { kind_tab: { kind, tab: CONTRACT_TEMPLATES_TAB } },
    select: { html: true },
  });
  let items = [];
  if (row && row.html) {
    try {
      const parsed = JSON.parse(row.html);
      items = Array.isArray(parsed.items) ? parsed.items : [];
    } catch {
      items = [];
    }
  }

  // Устаревшие / чужие вкладки → в архив
  items = items.map((it) => {
    if (!allowedTabs.has(it.tabId) && !it.archived) return { ...it, archived: true };
    return it;
  });

  if (mode === 'replace-library') {
    items = items.map((it) =>
      allowedTabs.has(it.tabId) && !it.archived ? { ...it, archived: true } : it
    );
    for (const def of defaults) {
      if (!def.html.trim()) continue;
      items.push({ ...def, archived: false });
    }
  } else {
    // fill-missing: по одному дефолту на вкладку, если активных нет
    const defaultsByTab = new Map();
    for (const def of defaults) {
      if (!defaultsByTab.has(def.tabId)) defaultsByTab.set(def.tabId, def);
    }
    for (const tabId of libraryTabs) {
      const def = defaultsByTab.get(tabId);
      if (!def || !def.html.trim()) continue;
      if (!items.some((it) => it.tabId === tabId && !it.archived && !it.deletedAt)) {
        items.push(def);
      }
    }
  }

  for (const tabId of libraryTabs) {
    const active = items.filter((it) => it.tabId === tabId && !it.archived && !it.deletedAt);
    if (active.length === 0) continue;
    if (!active.some((it) => it.isDefault)) active[0].isDefault = true;
  }

  const payload = JSON.stringify({ items });
  await prisma.contractDocumentGlobalTemplate.upsert({
    where: { kind_tab: { kind, tab: CONTRACT_TEMPLATES_TAB } },
    create: { kind, tab: CONTRACT_TEMPLATES_TAB, html: payload },
    update: { html: payload },
  });

  const activeCount = items.filter(
    (it) => !it.archived && !it.deletedAt && allowedTabs.has(it.tabId)
  ).length;
  console.log(`✅ Библиотека шаблонов ${kind}: ${activeCount} активных пресетов (режим ${mode})`);
}

async function main() {
  const argKinds = process.argv
    .slice(2)
    .map((a) => a.trim().toUpperCase())
    .filter(Boolean);
  const kinds = argKinds.length ? argKinds : Object.keys(KIND_CONFIG);
  for (const kind of kinds) {
    if (!KIND_CONFIG[kind]) {
      console.error(`Неизвестное направление: ${kind} (доступны ${Object.keys(KIND_CONFIG).join(', ')})`);
      process.exit(1);
    }
  }
  const prisma = new PrismaClient();
  try {
    for (const kind of kinds) await seedKind(prisma, kind);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
