import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import { apiFetch } from '@/shared/lib/api-fetch';
import { getApiBaseUrl } from '@/shared/lib/auth-session';

import { parseDraftRooms } from './contractDocumentsEstimateSnapshot';
import { parseEstimateCustomItemsFromDraft, splitDraftLineItems } from './estimateCustomWorkItems';
import {
  type EstimateSnapshot,
  type EstimateSnapshotLine,
  type EstimateSnapshotRoom,
  getBaseSnapshotWithMarkupForPreset,
} from './repairApplyEstimatePresetIds';

function joinApiPath(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${base}/${p}`;
}

type DraftMultiCategoryMeta = {
  categories?: Array<{ slug: string; name: string; roomCount: number; total: number }>;
  slugs?: string[];
};

function parseDraftMultiCategoryMeta(draftRaw: string): DraftMultiCategoryMeta | null {
  try {
    const parsed = JSON.parse(draftRaw) as Record<string, unknown>;
    const raw = parsed.__adminMultiCategory;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    return raw as DraftMultiCategoryMeta;
  } catch {
    return null;
  }
}

function normalizeSlugList(slugs: unknown[] | undefined): string[] {
  if (!Array.isArray(slugs)) return [];
  return slugs
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Порядок slug'ов как при сохранении комплексного расчёта (склейка снимков). */
function resolveMultiCategorySlugOrder(preset: ContractEstimatePreset): string[] {
  const fromPreset = normalizeSlugList(preset.multiCategorySlugs);
  if (fromPreset.length > 1) return fromPreset;
  const meta = parseDraftMultiCategoryMeta(preset.calculatorDraft);
  const fromMeta = normalizeSlugList(meta?.slugs);
  if (fromMeta.length > 1) return fromMeta;
  return [];
}

function validateDraftMatrixAgainstSnapshot(
  snapshot: EstimateSnapshot,
  matrix: string[][]
): string[][] | null {
  if (matrix.length !== snapshot.rooms.length) return null;
  for (let gri = 0; gri < matrix.length; gri++) {
    const n = snapshot.rooms[gri]?.lines?.length ?? 0;
    if (matrix[gri]!.length !== n) return null;
  }
  return matrix;
}

/** Склеивает помещения всех slug'ов в том же порядке, что и `mergedSnapshot` при сохранении. */
function buildGlobalDraftItemIdsMatrixFromOrderedSlugs(
  preset: ContractEstimatePreset,
  slugs: string[],
  snapshot: EstimateSnapshot
): string[][] | null {
  if (!snapshot?.rooms.length) return null;
  const byCat = preset.calculatorDraftByCategory ?? {};
  const out: string[][] = [];
  for (const s of slugs) {
    const slug = s.trim();
    if (!slug) return null;
    const raw = byCat[slug];
    if (!raw) return null;
    for (const ids of parseDraftRoomItemIdArrays(raw)) {
      out.push(ids);
    }
  }
  return validateDraftMatrixAgainstSnapshot(snapshot, out);
}

function normalizeCatalogItemId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

/** Матрица `itemId` только из снимка — если при сохранении сметы в строки записали `itemId`. */
function buildItemIdsMatrixFromSnapshotLines(snapshot: EstimateSnapshot): string[][] | null {
  const matrix: string[][] = [];
  for (const room of snapshot.rooms) {
    const row: string[] = [];
    for (const line of room.lines ?? []) {
      const id = normalizeCatalogItemId(line.itemId);
      if (!id) return null;
      row.push(id);
    }
    matrix.push(row);
  }
  return matrix;
}

/** По каждому помещению — `itemId` в том же порядке, что и в `parseDraftRooms` / при сохранении снимка. */
export function parseDraftRoomItemIdArrays(draftRaw: string): string[][] {
  return parseDraftRooms(draftRaw).map((r) => r.items.map((it) => it.itemId));
}

type CatalogSectionJson = { name: string; slug: string; items: Array<{ id: string }> };

/** Глобальный порядок помещений: массив `itemId` по строкам, согласованный со `snapshot.rooms`. */
export function buildGlobalDraftItemIdsMatrix(
  preset: ContractEstimatePreset,
  snapshot: EstimateSnapshot
): string[][] | null {
  if (!snapshot?.rooms?.length) return null;
  const byCat = preset.calculatorDraftByCategory ?? {};
  const meta = parseDraftMultiCategoryMeta(preset.calculatorDraft);

  const orderedMultiSlugs = resolveMultiCategorySlugOrder(preset);
  if (orderedMultiSlugs.length > 1 && Object.keys(byCat).length > 0) {
    const fromSlugs = buildGlobalDraftItemIdsMatrixFromOrderedSlugs(
      preset,
      orderedMultiSlugs,
      snapshot
    );
    if (fromSlugs) return fromSlugs;
    return null;
  }

  const out: string[][] = [];

  if (meta?.categories && meta.categories.length > 1) {
    for (const cat of meta.categories) {
      const slug = (cat.slug || '').trim();
      if (!slug) return null;
      const raw = byCat[slug];
      if (!raw) return null;
      const perRoom = parseDraftRoomItemIdArrays(raw);
      let count = Math.max(0, Number(cat.roomCount) || 0);
      let idx = 0;
      while (count-- > 0) {
        if (idx >= perRoom.length) return null;
        out.push(perRoom[idx]!);
        idx += 1;
      }
    }
    if (out.length < snapshot.rooms.length) {
      const primary = preset.calculatorDraft;
      const tail = parseDraftRoomItemIdArrays(primary);
      let t = 0;
      while (out.length < snapshot.rooms.length) {
        if (t >= tail.length) return null;
        out.push(tail[t]!);
        t += 1;
      }
    }
  } else {
    const raw = preset.calculatorDraft;
    for (const ids of parseDraftRoomItemIdArrays(raw)) {
      out.push(ids);
    }
  }

  return validateDraftMatrixAgainstSnapshot(snapshot, out);
}

async function buildItemIdsMatrixByRecalculate(
  preset: ContractEstimatePreset,
  snapshot: EstimateSnapshot
): Promise<string[][] | null> {
  const byCat = preset.calculatorDraftByCategory ?? {};
  const slugs = resolveMultiCategorySlugOrder(preset);
  const rooms: Array<{ name: string; items: Array<{ itemId: string; quantity: number }> }> = [];
  const roomDraftRaws: string[] = [];

  if (slugs.length > 1 && Object.keys(byCat).length > 0) {
    for (const s of slugs) {
      const slug = s.trim();
      if (!slug) return null;
      const raw = byCat[slug];
      if (!raw) return null;
      for (const room of parseDraftRooms(raw)) {
        rooms.push(room);
        roomDraftRaws.push(raw);
      }
    }
  } else {
    const raw = preset.calculatorDraft;
    for (const room of parseDraftRooms(raw)) {
      rooms.push(room);
      roomDraftRaws.push(raw);
    }
  }

  if (rooms.length !== snapshot.rooms.length) return null;

  const rows = await Promise.all(
    snapshot.rooms.map(async (_, gri) => {
      const items = rooms[gri]!.items;
      const linesLen = snapshot.rooms[gri]!.lines.length;
      if (items.length !== linesLen) return null;
      const customItems = parseEstimateCustomItemsFromDraft(
        roomDraftRaws[gri] ?? preset.calculatorDraft
      );
      const { catalog, custom } = splitDraftLineItems(items, customItems);
      const customIds = custom.map((c) => c.itemId);
      if (catalog.length === 0) {
        return customIds.length === linesLen ? customIds : items.map((it) => it.itemId);
      }
      const res = await apiFetch(joinApiPath('service-catalog/calculate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: catalog }),
      });
      if (!res.ok) return items.map((it) => it.itemId);
      const data = (await res.json()) as { lines?: Array<{ itemId?: unknown }> };
      const rawLines = Array.isArray(data.lines) ? data.lines : [];
      const fromApi = rawLines
        .map((ln) => normalizeCatalogItemId(ln?.itemId))
        .filter((x): x is string => Boolean(x));
      const merged = [...fromApi, ...customIds];
      if (merged.length === linesLen) return merged;
      return items.map((it) => it.itemId);
    })
  );

  if (rows.some((r) => r === null)) return null;
  return rows as string[][];
}

async function fetchItemIdToStageLabelMap(slug: string): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const res = await apiFetch(
      joinApiPath(`service-catalog/categories/${encodeURIComponent(slug)}`)
    );
    if (!res.ok) return map;
    const data = (await res.json()) as {
      name?: string;
      slug?: string;
      itemSections?: CatalogSectionJson[];
      items?: Array<{ id: string }>;
    };
    const sections: CatalogSectionJson[] =
      data.itemSections && data.itemSections.length > 0
        ? data.itemSections
        : data.items?.length
          ? [{ name: data.name ?? slug, slug: data.slug ?? slug, items: data.items }]
          : [];
    for (const sec of sections) {
      const label = (sec.name || '').trim() || '—';
      for (const it of sec.items ?? []) {
        if (it?.id && !map.has(it.id)) map.set(it.id, label);
      }
    }
  } catch {
    // ignore
  }
  return map;
}

export type WorkScopeStageMapsLoad = {
  maps: Map<string, Map<string, string>> | null;
  /** `null`, если черновик не совпал со снимком сметы по числу строк. */
  matrix: string[][] | null;
};

export async function loadStageLabelMapsForPreset(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): Promise<WorkScopeStageMapsLoad> {
  const snapshot = getBaseSnapshotWithMarkupForPreset(preset, groups);
  let matrix = snapshot
    ? (buildItemIdsMatrixFromSnapshotLines(snapshot) ??
      buildGlobalDraftItemIdsMatrix(preset, snapshot))
    : null;
  if (!matrix && snapshot?.rooms.length) {
    matrix = await buildItemIdsMatrixByRecalculate(preset, snapshot);
  }
  if (!matrix || !snapshot?.rooms.length) return { maps: null, matrix };

  const meta = parseDraftMultiCategoryMeta(preset.calculatorDraft);
  const slugs = new Set<string>();
  const ordered = resolveMultiCategorySlugOrder(preset);
  if (ordered.length > 1) {
    ordered.forEach((s) => slugs.add(s));
  } else if (meta?.categories && meta.categories.length > 1) {
    for (const cat of meta.categories) {
      const s = (cat.slug || '').trim();
      if (s) slugs.add(s);
    }
    const primary = (preset.categorySlug || '').trim();
    if (primary) slugs.add(primary);
  } else {
    const s = (preset.categorySlug || '').trim();
    if (!s) return { maps: null, matrix };
    slugs.add(s);
  }

  const out = new Map<string, Map<string, string>>();
  await Promise.all(
    [...slugs].map(async (slug) => {
      const m = await fetchItemIdToStageLabelMap(slug);
      out.set(slug, m);
    })
  );
  return { maps: out, matrix };
}

export type WorkScopeLineRow = {
  id: string;
  label: string;
  amount: number;
  gri: number;
  li: number;
  line: EstimateSnapshotLine;
};

export type WorkScopeStageRow = {
  id: string;
  label: string;
  amount: number;
  lines: WorkScopeLineRow[];
};

export type WorkScopeRoomRow = {
  id: string;
  label: string;
  amount: number;
  gri: number;
  stages: WorkScopeStageRow[];
};

export type WorkScopeCategoryRow = {
  id: string;
  label: string;
  amount: number;
  categorySlug: string;
  rooms: WorkScopeRoomRow[];
};

export function linesInWorkScopeRoom(room: WorkScopeRoomRow): WorkScopeLineRow[] {
  return room.stages.flatMap((s) => s.lines);
}

type Section = { categoryName: string; categorySlug: string; rooms: EstimateSnapshotRoom[] };

function buildSectionsFromOrderedSlugs(
  preset: ContractEstimatePreset,
  snapshot: EstimateSnapshot,
  slugs: string[]
): Section[] | null {
  const byCat = preset.calculatorDraftByCategory ?? {};
  const meta = parseDraftMultiCategoryMeta(preset.calculatorDraft);
  const nameBySlug = new Map<string, string>();
  if (meta?.categories) {
    for (const c of meta.categories) {
      const s = (c.slug || '').trim();
      if (s) nameBySlug.set(s, (c.name || '').trim() || s);
    }
  }
  const sections: Section[] = [];
  let cursor = 0;
  for (const slugRaw of slugs) {
    const slug = slugRaw.trim();
    if (!slug) return null;
    const raw = byCat[slug];
    if (!raw) return null;
    const perRoom = parseDraftRoomItemIdArrays(raw);
    if (perRoom.length === 0) return null;
    const rooms = snapshot.rooms.slice(cursor, cursor + perRoom.length);
    if (rooms.length !== perRoom.length) return null;
    cursor += perRoom.length;
    sections.push({
      categoryName: nameBySlug.get(slug) ?? slug,
      categorySlug: slug,
      rooms: [...rooms],
    });
  }
  if (cursor !== snapshot.rooms.length) return null;
  return sections;
}

function buildSectionsForPreset(
  preset: ContractEstimatePreset,
  snapshot: EstimateSnapshot
): Section[] {
  const sectionMap = new Map<string, Section>();
  const meta = parseDraftMultiCategoryMeta(preset.calculatorDraft);
  const categories = meta?.categories ?? [];
  if (categories.length > 1) {
    let cursor = 0;
    for (const cat of categories) {
      const count = Math.max(0, Number(cat.roomCount) || 0);
      const rooms = snapshot.rooms.slice(cursor, cursor + count);
      cursor += count;
      if (rooms.length === 0) continue;
      const categoryName = (cat.name || '').trim() || '—';
      const categorySlug = (cat.slug || '').trim() || preset.categorySlug;
      const existing = sectionMap.get(categoryName);
      if (existing) {
        existing.rooms.push(...rooms);
      } else {
        sectionMap.set(categoryName, { categoryName, categorySlug, rooms: [...rooms] });
      }
    }
    if (cursor < snapshot.rooms.length) {
      const fallbackCategoryName = preset.categoryName.trim() || '—';
      const slug = preset.categorySlug.trim() || '';
      const existing = sectionMap.get(fallbackCategoryName);
      const tailRooms = snapshot.rooms.slice(cursor);
      if (existing) existing.rooms.push(...tailRooms);
      else
        sectionMap.set(fallbackCategoryName, {
          categoryName: fallbackCategoryName,
          categorySlug: slug,
          rooms: [...tailRooms],
        });
    }
    return [...sectionMap.values()];
  }

  const orderedSlugs = resolveMultiCategorySlugOrder(preset);
  if (orderedSlugs.length > 1 && preset.calculatorDraftByCategory) {
    const built = buildSectionsFromOrderedSlugs(preset, snapshot, orderedSlugs);
    if (built) return built;
  }

  return [
    {
      categoryName: preset.categoryName.trim() || '—',
      categorySlug: preset.categorySlug.trim() || '',
      rooms: [...snapshot.rooms],
    },
  ];
}

function groupLinesIntoStages(args: {
  gri: number;
  lines: EstimateSnapshotLine[];
  itemIds: string[] | undefined;
  itemIdToStage: Map<string, string> | undefined;
}): WorkScopeStageRow[] {
  const { gri, lines, itemIds, itemIdToStage } = args;
  const stageMapReady = Boolean(itemIdToStage && itemIdToStage.size > 0);
  if (!itemIds || !stageMapReady || itemIds.length !== lines.length) {
    const lineRows: WorkScopeLineRow[] = lines.map((line, li) => ({
      id: `wsl:${gri}:${li}`,
      label: line.name?.trim() || '—',
      amount: line.amount,
      gri,
      li,
      line,
    }));
    const amount = lineRows.reduce((s, l) => s + l.amount, 0);
    return [{ id: `wst:${gri}:0`, label: '', amount, lines: lineRows }];
  }

  type Bucket = { label: string; rows: WorkScopeLineRow[]; order: number };
  const buckets = new Map<string, Bucket>();
  let order = 0;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    const itemId = itemIds[li]!;
    const stageLabel = (itemIdToStage.get(itemId) ?? '—').trim() || '—';
    let b = buckets.get(stageLabel);
    if (!b) {
      b = { label: stageLabel, rows: [], order: order++ };
      buckets.set(stageLabel, b);
    }
    b.rows.push({
      id: `wsl:${gri}:${li}`,
      label: line.name?.trim() || '—',
      amount: line.amount,
      gri,
      li,
      line,
    });
  }

  const list = [...buckets.values()].sort((a, b) => a.order - b.order);
  if (list.length <= 1) {
    const flat = list[0]?.rows ?? [];
    const amount = flat.reduce((s, l) => s + l.amount, 0);
    return [{ id: `wst:${gri}:0`, label: '', amount, lines: flat }];
  }

  return list.map((b, si) => ({
    id: `wst:${gri}:${si}`,
    label: b.label,
    amount: b.rows.reduce((s, l) => s + l.amount, 0),
    lines: b.rows,
  }));
}

/** Дерево: категория → помещение → (опционально этап/подкатегория) → позиция. */
export function buildEstimateWorkScopeTree(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[],
  stageMapsBySlug?: Map<string, Map<string, string>> | null
): WorkScopeCategoryRow[] {
  const snapshot = getBaseSnapshotWithMarkupForPreset(preset, groups);
  if (!snapshot?.rooms?.length) return [];
  const sections = buildSectionsForPreset(preset, snapshot);
  const matrix = stageMapsBySlug
    ? (buildItemIdsMatrixFromSnapshotLines(snapshot) ??
      buildGlobalDraftItemIdsMatrix(preset, snapshot))
    : null;
  const rows: WorkScopeCategoryRow[] = [];
  let gri = 0;

  sections.forEach((sec, si) => {
    const itemMap = stageMapsBySlug?.get(sec.categorySlug);
    const roomRows: WorkScopeRoomRow[] = [];
    let catAmount = 0;
    for (const room of sec.rooms) {
      const roomId = `wsr:${gri}`;
      const itemIds = matrix?.[gri];
      const stages = groupLinesIntoStages({
        gri,
        lines: room.lines ?? [],
        itemIds,
        itemIdToStage: itemMap,
      });
      const roomAmount = stages.reduce((s, st) => s + st.amount, 0);
      catAmount += roomAmount;
      roomRows.push({
        id: roomId,
        label: room.name?.trim() || 'Помещение',
        amount: roomAmount || room.total,
        gri,
        stages,
      });
      gri += 1;
    }
    rows.push({
      id: `wsc:${si}`,
      label: sec.categoryName.trim() || '—',
      amount: catAmount,
      categorySlug: sec.categorySlug,
      rooms: roomRows,
    });
  });
  return rows;
}

export type EstimateWorkScopeTreeAsyncResult = {
  tree: WorkScopeCategoryRow[];
  /**
   * Почему в UI нет групп по подкатегориям каталога (если применимо).
   * `draft_snapshot_mismatch` — не удалось сопоставить позиции черновика со строками сметы.
   */
  hint: 'draft_snapshot_mismatch' | 'no_subcategory_buckets' | null;
};

export async function buildEstimateWorkScopeTreeAsync(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): Promise<EstimateWorkScopeTreeAsyncResult> {
  const { maps, matrix } = await loadStageLabelMapsForPreset(preset, groups);
  const tree = buildEstimateWorkScopeTree(preset, groups, maps);
  if (!matrix) {
    return {
      tree,
      hint: tree.length > 0 ? 'draft_snapshot_mismatch' : null,
    };
  }
  const hasStageRows = tree.some((c) => c.rooms.some((r) => r.stages.length > 1));
  if (!hasStageRows && tree.length > 0) {
    return { tree, hint: 'no_subcategory_buckets' };
  }
  return { tree, hint: null };
}

export function collectAllLineScopeIds(tree: WorkScopeCategoryRow[]): string[] {
  const out: string[] = [];
  for (const cat of tree) {
    for (const room of cat.rooms) {
      for (const line of linesInWorkScopeRoom(room)) out.push(line.id);
    }
  }
  return out;
}

export function lineKeysFromCategoryNodeId(
  tree: WorkScopeCategoryRow[],
  categoryNodeId: string
): string[] {
  const cat = tree.find((c) => c.id === categoryNodeId);
  if (!cat) return [];
  return cat.rooms.flatMap((r) => linesInWorkScopeRoom(r).map((l) => l.id));
}

export function lineKeysFromRoomNodeId(tree: WorkScopeCategoryRow[], roomNodeId: string): string[] {
  for (const cat of tree) {
    const room = cat.rooms.find((r) => r.id === roomNodeId);
    if (room) return linesInWorkScopeRoom(room).map((l) => l.id);
  }
  return [];
}

export function lineKeysFromStageNodeId(
  tree: WorkScopeCategoryRow[],
  stageNodeId: string
): string[] {
  for (const cat of tree) {
    for (const room of cat.rooms) {
      const st = room.stages.find((s) => s.id === stageNodeId);
      if (st) return st.lines.map((l) => l.id);
    }
  }
  return [];
}

export type SiblingClaim = { presetId: string; title: string };

export function buildSiblingLineClaimIndex(
  presets: ContractEstimatePreset[],
  splitBundleId: string | undefined,
  excludePresetId: string
): Map<string, SiblingClaim[]> {
  const map = new Map<string, SiblingClaim[]>();
  if (!splitBundleId?.trim()) return map;
  for (const p of presets) {
    if (p.id === excludePresetId) continue;
    if (p.splitBundleId !== splitBundleId) continue;
    const keys = p.estimateWorkScopeKeys;
    if (!Array.isArray(keys) || keys.length === 0) continue;
    const title = p.title?.trim() || p.id;
    for (const k of keys) {
      if (typeof k !== 'string' || !k.startsWith('wsl:')) continue;
      const arr = map.get(k) ?? [];
      arr.push({ presetId: p.id, title });
      map.set(k, arr);
    }
  }
  return map;
}

export function selectionIntersectsSiblingClaims(
  selectedLineKeys: Set<string>,
  claimIndex: Map<string, SiblingClaim[]>
): SiblingClaim | null {
  for (const k of selectedLineKeys) {
    const claims = claimIndex.get(k);
    if (claims?.length) return claims[0] ?? null;
  }
  return null;
}
