/**
 * Копирует шаблоны по умолчанию DOORS → CEILINGS для вкладок:
 * Договор, Акт приёма, Накладная, Согласие.
 *
 * Локально: npx ts-node -r tsconfig-paths/register scripts/copy-doors-templates-to-ceilings.ts
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });

const CONTRACT_TEMPLATES_TAB = 'contract_templates';
const SOURCE_KIND = 'DOORS' as const;
const TARGET_KIND = 'CEILINGS' as const;

const TABS_TO_COPY = ['contract', 'actAcceptance', 'deliveryNote', 'consent'] as const;

type PresetItem = {
  id: string;
  title: string;
  tabId: string;
  html: string;
  isDefault?: boolean;
  archived?: boolean;
};

const prisma = new PrismaClient();

async function readItems(kind: typeof SOURCE_KIND | typeof TARGET_KIND): Promise<PresetItem[]> {
  const row = await prisma.contractDocumentGlobalTemplate.findUnique({
    where: { kind_tab: { kind, tab: CONTRACT_TEMPLATES_TAB } },
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

async function writeItems(kind: typeof TARGET_KIND, items: PresetItem[]): Promise<void> {
  const payload = JSON.stringify({ items });
  await prisma.contractDocumentGlobalTemplate.upsert({
    where: { kind_tab: { kind, tab: CONTRACT_TEMPLATES_TAB } },
    create: { kind, tab: CONTRACT_TEMPLATES_TAB, html: payload },
    update: { html: payload },
  });
}

function pickDefault(items: PresetItem[], tabId: string): PresetItem | null {
  const active = items.filter((it) => it.tabId === tabId && !it.archived);
  return active.find((it) => it.isDefault) ?? active[0] ?? null;
}

async function main() {
  const sourceItems = await readItems(SOURCE_KIND);
  let targetItems = await readItems(TARGET_KIND);
  const copied: string[] = [];

  for (const tabId of TABS_TO_COPY) {
    const source = pickDefault(sourceItems, tabId);
    if (!source?.html?.trim()) {
      console.warn(`⚠️  DOORS: нет активного шаблона для ${tabId}, пропуск`);
      continue;
    }

    targetItems = targetItems.map((it) =>
      it.tabId === tabId && !it.archived ? { ...it, archived: true, isDefault: false } : it
    );

    const newId = `seed-ceilings-from-doors-${tabId}`;
    targetItems = targetItems.filter((it) => it.id !== newId);
    targetItems.push({
      id: newId,
      tabId,
      title: source.title,
      html: source.html,
      isDefault: true,
      archived: false,
    });
    copied.push(`${tabId} (${source.html.length} символов, из ${source.id})`);
  }

  await writeItems(TARGET_KIND, targetItems);
  console.log(`✅ CEILINGS: скопированы шаблоны DOORS → ${copied.join('; ') || 'ничего'}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
