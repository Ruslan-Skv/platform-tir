/**
 * Общая логика сидирования библиотеки шаблонов (contract_templates)
 * для направлений REPAIR / WINDOWS / DOORS / BLINDS / CEILINGS.
 *
 * Приоритет HTML: `{kind}-library-templates.seed.json` → `.ts` из frontend.
 * Режим `*_TEMPLATES_SEED_MODE=replace-library` — архивирует активные пресеты
 * на вкладках из seed и вставляет новые как isDefault.
 */
import { PrismaClient, type ContractDocumentPackageKind } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

export const CONTRACT_TEMPLATES_TAB = 'contract_templates';

export type PresetItem = {
  id: string;
  title: string;
  tabId: string;
  html: string;
  isDefault?: boolean;
  archived?: boolean;
  deletedAt?: string | null;
};

export type KindSeedConfig = {
  kind: ContractDocumentPackageKind;
  /** Вкладки библиотеки направления (как в UI). */
  libraryTabs: readonly string[];
  tabTitles: Record<string, string>;
  /** Относительные имена файлов в packages/templates (fallback). */
  tabTemplateFiles: Record<string, string>;
  /** Префикс id для fallback-пресетов из .ts */
  seedIdPrefix: string;
  envModeKey: string;
};

export function extractTemplateFromTsFile(filePath: string): string {
  const src = fs.readFileSync(filePath, 'utf8');
  const m = src.match(/export const \w+ = `\s*([\s\S]*?)`\.trim\(\)/);
  if (!m) {
    throw new Error(`Не удалось прочитать шаблон из ${filePath}`);
  }
  return m[1];
}

function resolveFrontendTemplatesDir(): string | null {
  const candidates = [
    path.join(__dirname, '../../frontend/src/views/admin/ContractDocuments/packages/templates'),
    path.join(process.cwd(), '../frontend/src/views/admin/ContractDocuments/packages/templates'),
    path.join(process.cwd(), 'frontend/src/views/admin/ContractDocuments/packages/templates'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

/** Fallback из .ts; пустой массив, если frontend не смонтирован (прод/docker). */
export function loadDefaultsFromFrontendRepo(cfg: KindSeedConfig): PresetItem[] {
  const templatesDir = resolveFrontendTemplatesDir();
  if (!templatesDir) return [];

  const result: PresetItem[] = [];
  for (const tabId of cfg.libraryTabs) {
    const file = cfg.tabTemplateFiles[tabId];
    if (!file) continue;
    const filePath = path.join(templatesDir, file);
    if (!fs.existsSync(filePath)) continue;
    result.push({
      id: `${cfg.seedIdPrefix}-${tabId}`,
      tabId,
      title: cfg.tabTitles[tabId] ?? tabId,
      html: extractTemplateFromTsFile(filePath),
      isDefault: true,
      archived: false,
    });
  }
  return result;
}

export function loadDefaultsFromSeedJson(cfg: KindSeedConfig): PresetItem[] | null {
  const slug = cfg.kind.toLowerCase();
  const jsonPath = path.join(__dirname, 'seed-data', `${slug}-library-templates.seed.json`);
  if (!fs.existsSync(jsonPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as { items?: PresetItem[] };
  if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;

  const allowed = new Set(cfg.libraryTabs);
  return parsed.items
    .filter((it) => allowed.has(it.tabId) && !it.archived && !it.deletedAt)
    .map((it) => ({
      id: it.id?.trim() || `${cfg.seedIdPrefix}-${it.tabId}`,
      title: it.title?.trim() || cfg.tabTitles[it.tabId] || it.tabId,
      tabId: it.tabId,
      html: it.html ?? '',
      isDefault: Boolean(it.isDefault),
      archived: false,
    }))
    .filter((it) => Boolean(it.html?.trim()));
}

/**
 * JSON имеет приоритет по вкладкам; недостающие вкладки добираются из .ts (если есть).
 * На сервере достаточно seed-data/*.json — frontend монтировать не обязательно.
 */
export function loadSeedDefaults(cfg: KindSeedConfig): PresetItem[] {
  const fromJson = loadDefaultsFromSeedJson(cfg);
  const fromFrontend = loadDefaultsFromFrontendRepo(cfg);

  if (!fromJson?.length && !fromFrontend.length) {
    throw new Error(
      `${cfg.kind}: нет seed JSON (prisma/seed-data/${cfg.kind.toLowerCase()}-library-templates.seed.json) и нет frontend .ts`
    );
  }
  if (!fromJson?.length) return fromFrontend;

  const merged = [...fromJson];
  const jsonTabIds = new Set(fromJson.map((item) => item.tabId));
  for (const def of fromFrontend) {
    if (!jsonTabIds.has(def.tabId)) merged.push(def);
  }
  return merged;
}

export async function readCurrentItems(
  prisma: PrismaClient,
  kind: ContractDocumentPackageKind
): Promise<PresetItem[]> {
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

export async function writeItems(
  prisma: PrismaClient,
  kind: ContractDocumentPackageKind,
  items: PresetItem[]
): Promise<void> {
  const payload = JSON.stringify({ items });
  await prisma.contractDocumentGlobalTemplate.upsert({
    where: { kind_tab: { kind, tab: CONTRACT_TEMPLATES_TAB } },
    create: { kind, tab: CONTRACT_TEMPLATES_TAB, html: payload },
    update: { html: payload },
  });
}

export async function seedContractTemplatePresetsForKind(
  prisma: PrismaClient,
  cfg: KindSeedConfig
): Promise<void> {
  const mode = (process.env[cfg.envModeKey] ?? 'fill-missing').trim();
  const defaults = loadSeedDefaults(cfg);
  const allowedTabs = new Set(cfg.libraryTabs);

  let items = await readCurrentItems(prisma, cfg.kind);

  // Устаревшие / чужие вкладки → в архив
  items = items.map((it) => {
    if (!allowedTabs.has(it.tabId) && !it.archived) {
      return { ...it, archived: true };
    }
    return it;
  });

  if (mode === 'replace-library') {
    // Архив всех активных на разрешённых вкладках, затем вставка seed-пресетов
    items = items.map((it) =>
      allowedTabs.has(it.tabId) && !it.archived ? { ...it, archived: true } : it
    );
    for (const def of defaults) {
      if (!def.html?.trim()) continue;
      items.push({ ...def, archived: false });
    }
  } else {
    // fill-missing: по одному дефолту на вкладку, если активных нет
    const defaultsByTab = new Map<string, PresetItem>();
    for (const def of defaults) {
      if (!defaultsByTab.has(def.tabId)) defaultsByTab.set(def.tabId, def);
    }
    for (const tabId of cfg.libraryTabs) {
      const def = defaultsByTab.get(tabId);
      if (!def?.html?.trim()) continue;
      if (!items.some((it) => it.tabId === tabId && !it.archived && !it.deletedAt)) {
        items.push(def);
      }
    }
  }

  for (const tabId of cfg.libraryTabs) {
    const active = items.filter((it) => it.tabId === tabId && !it.archived && !it.deletedAt);
    if (active.length === 0) continue;
    if (!active.some((it) => it.isDefault)) {
      active[0].isDefault = true;
    }
  }

  await writeItems(prisma, cfg.kind, items);

  const activeCount = items.filter(
    (it) => !it.archived && !it.deletedAt && allowedTabs.has(it.tabId)
  ).length;
  const source = loadDefaultsFromSeedJson(cfg) ? 'seed.json' : 'frontend.ts';
  console.log(
    `✅ Библиотека шаблонов ${cfg.kind}: ${activeCount} активных пресетов (режим ${mode}, источник ${source})`
  );
}
