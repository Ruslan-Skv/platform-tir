/**
 * Выгрузка активных пресетов библиотеки шаблонов из локальной БД
 * в backend/prisma/seed-data/{kind}-library-templates.seed.json
 *
 * Фильтрует вкладки по правилам направления (как в UI библиотеки).
 *
 * Запуск: npx ts-node -r tsconfig-paths/register scripts/export-local-library-templates.ts
 */
import { PrismaClient, type ContractDocumentPackageKind } from '@prisma/client';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config({ path: path.join(process.cwd(), '.env') });
config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();
const CONTRACT_TEMPLATES_TAB = 'contract_templates';

/** Вкладки, которые реально используются в библиотеке каждого направления. */
const ALLOWED_TABS: Record<ContractDocumentPackageKind, readonly string[]> = {
  REPAIR: ['contract', 'consent', 'actStart', 'actAcceptance', 'cashOrder', 'productionLog'],
  WINDOWS: ['contract', 'consent', 'actAcceptance', 'memo', 'cashOrder'],
  DOORS: ['contract', 'consent', 'actAcceptance', 'deliveryNote', 'memo'],
  BLINDS: ['contract', 'consent', 'actAcceptance', 'deliveryNote', 'memo'],
  CEILINGS: ['contract', 'consent', 'actAcceptance', 'memo'],
  FURNITURE: [],
};

type PresetItem = {
  id: string;
  title: string;
  tabId: string;
  html: string;
  isDefault?: boolean;
  archived?: boolean;
  deletedAt?: string | null;
};

async function main() {
  const outDir = path.join(__dirname, '..', 'prisma', 'seed-data');
  fs.mkdirSync(outDir, { recursive: true });

  const kinds = (Object.keys(ALLOWED_TABS) as ContractDocumentPackageKind[]).filter(
    (k) => ALLOWED_TABS[k].length > 0
  );

  for (const kind of kinds) {
    const allowed = new Set(ALLOWED_TABS[kind]);
    const row = await prisma.contractDocumentGlobalTemplate.findUnique({
      where: { kind_tab: { kind, tab: CONTRACT_TEMPLATES_TAB } },
      select: { html: true, updatedAt: true },
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

    const active = items.filter(
      (it) => !it.archived && !it.deletedAt && allowed.has(it.tabId) && Boolean(it.html?.trim())
    );

    // На каждой вкладке ровно один isDefault
    const byTab = new Map<string, PresetItem[]>();
    for (const it of active) {
      const list = byTab.get(it.tabId) ?? [];
      list.push(it);
      byTab.set(it.tabId, list);
    }
    const normalized: PresetItem[] = [];
    for (const [, list] of byTab) {
      const preferred = list.find((it) => it.isDefault) ?? list[0];
      for (const it of list) {
        normalized.push({
          ...it,
          isDefault: it === preferred,
          archived: false,
        });
      }
    }

    const payload = {
      version: 1,
      kind,
      exportedAt: new Date().toISOString(),
      sourceUpdatedAt: row?.updatedAt?.toISOString() ?? null,
      items: normalized.map((it) => ({
        id: it.id,
        title: it.title,
        tabId: it.tabId,
        html: it.html ?? '',
        isDefault: Boolean(it.isDefault),
        archived: false,
      })),
    };

    const slug = kind.toLowerCase();
    const outPath = path.join(outDir, `${slug}-library-templates.seed.json`);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

    const skipped = items.filter(
      (it) => !it.archived && !it.deletedAt && !allowed.has(it.tabId)
    ).length;

    console.log(
      `${kind}: ${normalized.length} presets → ${path.relative(process.cwd(), outPath)}` +
        (skipped ? ` (пропущено чужих вкладок: ${skipped})` : '') +
        (row?.updatedAt ? ` (db ${row.updatedAt.toISOString()})` : ' (no row)')
    );
    for (const it of normalized) {
      console.log(
        `  - ${it.tabId.padEnd(16)} default=${Boolean(it.isDefault)} html=${(it.html || '').length} «${(it.title || '').slice(0, 50)}»`
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
