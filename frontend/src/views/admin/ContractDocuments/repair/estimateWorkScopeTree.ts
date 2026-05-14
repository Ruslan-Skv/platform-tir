import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';

import {
  type EstimateSnapshot,
  type EstimateSnapshotLine,
  type EstimateSnapshotRoom,
  getBaseSnapshotWithMarkupForPreset,
} from './repairApplyEstimatePresetIds';

type DraftMultiCategoryMeta = {
  categories?: Array<{ slug: string; name: string; roomCount: number; total: number }>;
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

export type WorkScopeLineRow = {
  id: string;
  label: string;
  amount: number;
  gri: number;
  li: number;
  line: EstimateSnapshotLine;
};

export type WorkScopeRoomRow = {
  id: string;
  label: string;
  amount: number;
  gri: number;
  lines: WorkScopeLineRow[];
};

export type WorkScopeCategoryRow = {
  id: string;
  label: string;
  amount: number;
  rooms: WorkScopeRoomRow[];
};

type Section = { categoryName: string; rooms: EstimateSnapshotRoom[] };

function buildSectionsForPreset(
  preset: ContractEstimatePreset,
  snapshot: EstimateSnapshot
): Section[] {
  const sectionMap = new Map<string, { categoryName: string; rooms: EstimateSnapshotRoom[] }>();
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
      const existing = sectionMap.get(categoryName);
      if (existing) existing.rooms.push(...rooms);
      else sectionMap.set(categoryName, { categoryName, rooms: [...rooms] });
    }
    if (cursor < snapshot.rooms.length) {
      const fallbackCategoryName = preset.categoryName.trim() || '—';
      const existing = sectionMap.get(fallbackCategoryName);
      const tailRooms = snapshot.rooms.slice(cursor);
      if (existing) existing.rooms.push(...tailRooms);
      else
        sectionMap.set(fallbackCategoryName, {
          categoryName: fallbackCategoryName,
          rooms: [...tailRooms],
        });
    }
    return [...sectionMap.values()];
  }
  return [
    {
      categoryName: preset.categoryName.trim() || '—',
      rooms: [...snapshot.rooms],
    },
  ];
}

/** Дерево категория → помещение → позиция с устойчивыми id для `estimateWorkScopeKeys`. */
export function buildEstimateWorkScopeTree(
  preset: ContractEstimatePreset,
  groups: ContractEstimateGroup[]
): WorkScopeCategoryRow[] {
  const snapshot = getBaseSnapshotWithMarkupForPreset(preset, groups);
  if (!snapshot?.rooms?.length) return [];
  const sections = buildSectionsForPreset(preset, snapshot);
  const rows: WorkScopeCategoryRow[] = [];
  let gri = 0;
  sections.forEach((sec, si) => {
    const roomRows: WorkScopeRoomRow[] = [];
    let catAmount = 0;
    for (const room of sec.rooms) {
      const roomId = `wsr:${gri}`;
      const lineRows: WorkScopeLineRow[] = (room.lines ?? []).map((line, li) => ({
        id: `wsl:${gri}:${li}`,
        label: line.name?.trim() || '—',
        amount: line.amount,
        gri,
        li,
        line,
      }));
      const roomAmount = lineRows.reduce((s, ln) => s + ln.amount, 0);
      catAmount += roomAmount;
      roomRows.push({
        id: roomId,
        label: room.name?.trim() || 'Помещение',
        amount: roomAmount || room.total,
        gri,
        lines: lineRows,
      });
      gri += 1;
    }
    rows.push({
      id: `wsc:${si}`,
      label: sec.categoryName.trim() || '—',
      amount: catAmount,
      rooms: roomRows,
    });
  });
  return rows;
}

export function collectAllLineScopeIds(tree: WorkScopeCategoryRow[]): string[] {
  const out: string[] = [];
  for (const cat of tree) {
    for (const room of cat.rooms) {
      for (const line of room.lines) out.push(line.id);
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
  return cat.rooms.flatMap((r) => r.lines.map((l) => l.id));
}

export function lineKeysFromRoomNodeId(tree: WorkScopeCategoryRow[], roomNodeId: string): string[] {
  for (const cat of tree) {
    const room = cat.rooms.find((r) => r.id === roomNodeId);
    if (room) return room.lines.map((l) => l.id);
  }
  return [];
}

export type SiblingClaim = { presetId: string; title: string };

/** Для каждой строки сметы — в каких других экземплярах того же «семейства» она уже включена. */
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
