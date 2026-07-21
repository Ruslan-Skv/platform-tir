/**
 * Обновляет шаблон «Памятка» по умолчанию для BLINDS из blindsTemplateMemo.ts.
 *
 * Локально: npx ts-node -r tsconfig-paths/register scripts/update-blinds-memo-default.ts
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });

const CONTRACT_TEMPLATES_TAB = 'contract_templates';
const KIND = 'BLINDS' as const;
const TAB_ID = 'memo';

type PresetItem = {
  id: string;
  title: string;
  tabId: string;
  html: string;
  isDefault?: boolean;
  archived?: boolean;
};

const prisma = new PrismaClient();

function loadBlindsMemoHtml(): string {
  const filePath = path.join(
    __dirname,
    '../../frontend/src/views/admin/ContractDocuments/packages/templates/blindsTemplateMemo.ts'
  );
  const src = fs.readFileSync(filePath, 'utf8');
  const m = src.match(/export const \w+ = `\s*([\s\S]*?)`\.trim\(\)/);
  if (!m?.[1]?.trim()) {
    throw new Error(`Не удалось прочитать шаблон из ${filePath}`);
  }
  return m[1].trim();
}

async function main() {
  const html = loadBlindsMemoHtml();
  const row = await prisma.contractDocumentGlobalTemplate.findUnique({
    where: { kind_tab: { kind: KIND, tab: CONTRACT_TEMPLATES_TAB } },
    select: { html: true },
  });
  let items: PresetItem[] = [];
  if (row?.html) {
    try {
      const parsed = JSON.parse(row.html) as { items?: PresetItem[] };
      items = Array.isArray(parsed.items) ? parsed.items : [];
    } catch {
      items = [];
    }
  }

  items = items.map((it) =>
    it.tabId === TAB_ID && !it.archived ? { ...it, archived: true, isDefault: false } : it
  );

  const newId = 'seed-blinds-memo';
  items = items.filter((it) => it.id !== newId);
  items.push({
    id: newId,
    tabId: TAB_ID,
    title: 'Памятка',
    html,
    isDefault: true,
    archived: false,
  });

  const payload = JSON.stringify({ items });
  await prisma.contractDocumentGlobalTemplate.upsert({
    where: { kind_tab: { kind: KIND, tab: CONTRACT_TEMPLATES_TAB } },
    create: { kind: KIND, tab: CONTRACT_TEMPLATES_TAB, html: payload },
    update: { html: payload },
  });

  console.log(`✅ BLINDS memo default updated (${html.length} символов)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
