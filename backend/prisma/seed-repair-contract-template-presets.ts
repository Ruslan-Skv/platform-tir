/**
 * Сид библиотеки шаблонов «Ремонт» (5 вкладок) в contract_document_global_templates.
 *
 * Локально: npm run prisma:seed-repair-contract-templates
 * Прод после деплоя: из каталога backend с настроенным DATABASE_URL
 *
 * Опционально: backend/prisma/seed-data/repair-library-templates.seed.json
 * (экспорт из UI библиотеки) — приоритетнее встроенных .ts из frontend.
 *
 * REPAIR_TEMPLATES_SEED_MODE=replace-library — перезаписать HTML у активных пресетов 5 вкладок
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });
config({ path: path.join(__dirname, '..', '..', '.env') });

const CONTRACT_TEMPLATES_TAB = 'contract_templates';
const KIND = 'REPAIR' as const;

const LIBRARY_TABS = [
  'contract',
  'actStart',
  'actAcceptance',
  'cashOrder',
  'productionLog',
] as const;

const TAB_TITLES: Record<(typeof LIBRARY_TABS)[number], string> = {
  contract: 'Договор',
  actStart: 'Акт начала работ',
  actAcceptance: 'Акт сдачи-приёмки',
  cashOrder: 'ПКО',
  productionLog: 'Производственный журнал',
};

type PresetItem = {
  id: string;
  title: string;
  tabId: string;
  html: string;
  isDefault?: boolean;
  archived?: boolean;
};

const prisma = new PrismaClient();

function extractTemplateFromTsFile(filePath: string): string {
  const src = fs.readFileSync(filePath, 'utf8');
  const m = src.match(/export const \w+ = `\s*([\s\S]*?)`\.trim\(\)/);
  if (!m) {
    throw new Error(`Не удалось прочитать шаблон из ${filePath}`);
  }
  return m[1];
}

function loadDefaultsFromFrontendRepo(): PresetItem[] {
  const templatesDir = path.join(
    __dirname,
    '../../frontend/src/views/admin/ContractDocuments/repair/templates'
  );
  const files: Record<(typeof LIBRARY_TABS)[number], string> = {
    contract: 'contract.ts',
    actStart: 'actStart.ts',
    actAcceptance: 'actAcceptance.ts',
    cashOrder: 'cashOrder.ts',
    productionLog: 'productionLog.ts',
  };

  return LIBRARY_TABS.map((tabId) => ({
    id: `seed-repair-${tabId}`,
    tabId,
    title: TAB_TITLES[tabId],
    html: extractTemplateFromTsFile(path.join(templatesDir, files[tabId])),
    isDefault: true,
    archived: false,
  }));
}

function loadDefaultsFromSeedJson(): PresetItem[] | null {
  const jsonPath = path.join(__dirname, 'seed-data', 'repair-library-templates.seed.json');
  if (!fs.existsSync(jsonPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as { items?: PresetItem[] };
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
  return parsed.items
    .filter((it) => LIBRARY_TABS.includes(it.tabId as (typeof LIBRARY_TABS)[number]))
    .map((it) => ({
      id: it.id?.trim() || `seed-repair-${it.tabId}`,
      title: it.title?.trim() || TAB_TITLES[it.tabId as (typeof LIBRARY_TABS)[number]],
      tabId: it.tabId,
      html: it.html ?? '',
      isDefault: Boolean(it.isDefault),
      archived: Boolean(it.archived),
    }));
}

function loadSeedDefaults(): PresetItem[] {
  return loadDefaultsFromSeedJson() ?? loadDefaultsFromFrontendRepo();
}

function isLibraryTabId(tabId: string | undefined): boolean {
  return Boolean(tabId && (LIBRARY_TABS as readonly string[]).includes(tabId));
}

async function readCurrentItems(): Promise<PresetItem[]> {
  const row = await prisma.contractDocumentGlobalTemplate.findUnique({
    where: { kind_tab: { kind: KIND, tab: CONTRACT_TEMPLATES_TAB } },
    select: { html: true },
  });
  if (!row?.html) return [];
  try {
    const parsed = JSON.parse(row.html) as { items?: PresetItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

async function writeItems(items: PresetItem[]): Promise<void> {
  const payload = JSON.stringify({ items });
  await prisma.contractDocumentGlobalTemplate.upsert({
    where: { kind_tab: { kind: KIND, tab: CONTRACT_TEMPLATES_TAB } },
    create: { kind: KIND, tab: CONTRACT_TEMPLATES_TAB, html: payload },
    update: { html: payload },
  });
}

export async function seedRepairContractTemplatePresets(): Promise<void> {
  const mode = (process.env.REPAIR_TEMPLATES_SEED_MODE ?? 'fill-missing').trim();
  const defaults = loadSeedDefaults();
  const defaultsByTab = new Map(defaults.map((d) => [d.tabId, d]));

  let items = await readCurrentItems();

  items = items.map((it) => {
    if (!isLibraryTabId(it.tabId) && !it.archived) {
      return { ...it, archived: true };
    }
    return it;
  });

  for (const tabId of LIBRARY_TABS) {
    const def = defaultsByTab.get(tabId);
    if (!def?.html?.trim()) continue;

    if (mode === 'replace-library') {
      items = items.map((it) =>
        it.tabId === tabId && !it.archived ? { ...it, archived: true } : it
      );
      items.push({ ...def, isDefault: true, archived: false });
      continue;
    }

    if (!items.some((it) => it.tabId === tabId && !it.archived)) {
      items.push(def);
    }
  }

  for (const tabId of LIBRARY_TABS) {
    const active = items.filter((it) => it.tabId === tabId && !it.archived);
    if (active.length === 0) continue;
    if (!active.some((it) => it.isDefault)) {
      active[0].isDefault = true;
    }
  }

  await writeItems(items);
  console.log(
    `✅ Библиотека шаблонов REPAIR: ${items.filter((it) => !it.archived && isLibraryTabId(it.tabId)).length} активных пресетов (режим ${mode})`
  );
  console.log(
    `   Архивировано устаревших: ${items.filter((it) => it.archived && !isLibraryTabId(it.tabId)).length}`
  );
}

async function main() {
  await seedRepairContractTemplatePresets();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
