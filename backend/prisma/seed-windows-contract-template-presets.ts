/**
 * Сид библиотеки шаблонов «Окна» (акт сдачи-приёмки) в contract_document_global_templates.
 *
 * Локально: npm run prisma:seed-windows-contract-templates
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });
config({ path: path.join(__dirname, '..', '..', '.env') });

const CONTRACT_TEMPLATES_TAB = 'contract_templates';
const KIND = 'WINDOWS' as const;

const LIBRARY_TABS = ['actAcceptance', 'memo'] as const;

const TAB_TITLES: Record<(typeof LIBRARY_TABS)[number], string> = {
  actAcceptance: 'Акт сдачи-приёмки',
  memo: 'Памятка',
};

const TAB_TEMPLATE_FILES: Record<(typeof LIBRARY_TABS)[number], string> = {
  actAcceptance: 'windowsActAcceptance.ts',
  memo: 'memo.ts',
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
  return LIBRARY_TABS.map((tabId) => ({
    id: `seed-windows-${tabId}`,
    tabId,
    title: TAB_TITLES[tabId],
    html: extractTemplateFromTsFile(path.join(templatesDir, TAB_TEMPLATE_FILES[tabId])),
    isDefault: true,
    archived: false,
  }));
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

export async function seedWindowsContractTemplatePresets(): Promise<void> {
  const mode = (process.env.WINDOWS_TEMPLATES_SEED_MODE ?? 'fill-missing').trim();
  const defaults = loadDefaultsFromFrontendRepo();
  const defaultsByTab = new Map(defaults.map((d) => [d.tabId, d]));

  let items = await readCurrentItems();

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
  const activeByTab = LIBRARY_TABS.map(
    (tabId) =>
      `${tabId}: ${items.filter((it) => !it.archived && it.tabId === tabId).length}`
  ).join(', ');
  console.log(`✅ Библиотека шаблонов WINDOWS (${activeByTab}); режим ${mode}`);
}

async function main() {
  await seedWindowsContractTemplatePresets();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
