import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import { getCrmCustomer } from '@/shared/api/admin-crm';
import { crmDetailWithPreferredObjectAddress } from '@/views/admin/CRM/Customers/shared/crmCustomerExtendedProfile';

import { clampEstimateAdditionalMarkupPercent } from '../../../platform/estimates/applyEstimatePresetIds';
import { parseDraftRooms } from '../../../platform/estimates/contractDocumentsEstimateSnapshot';
import {
  type EstimateCrmCustomerFields,
  emptyEstimateCrmCustomerFields,
  estimateFieldsFromCrmCustomerDetail,
} from '../../../platform/estimates/estimateCrmCustomer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const REPAIR_MEASUREMENT_DATA_MARKER = '[REPAIR_MEASUREMENT_DATA_V1]';

export { API_URL };

export const ESTIMATES_LIST_HREF = '/admin/contract-documents/estimates';

export function applyDraftToLocalCalculator(categorySlug: string, draft: string) {
  const key = calculatorDraftStorageKey(categorySlug);
  window.localStorage.setItem(key, draft);
}

export function calculatorDraftStorageKey(categorySlug: string) {
  return `public.service-catalog.category.calculator-draft.${encodeURIComponent(categorySlug)}`;
}

/** Как в `ServiceCategoryPage`: свёрнутые группы видов работ по категории. */
function calculatorWorkGroupsStorageKey(categorySlug: string) {
  return `public.service-catalog.category.work-groups.${encodeURIComponent(categorySlug)}`;
}

/** Новый расчёт: не подтягивать черновики с публичного каталога / прошлых сессий. */
export function clearStoredCalculatorStateForNewEstimate(categorySlugs: string[]) {
  if (typeof window === 'undefined') return;
  for (const slug of categorySlugs) {
    if (!slug) continue;
    try {
      window.localStorage.removeItem(calculatorDraftStorageKey(slug));
      window.localStorage.removeItem(calculatorWorkGroupsStorageKey(slug));
    } catch {
      // квота / приватный режим
    }
  }
}

export function sortPresetsInGroupByListOrder(
  a: ContractEstimatePreset,
  b: ContractEstimatePreset
): number {
  const ai = a.inGroupListOrder;
  const bi = b.inGroupListOrder;
  if (ai != null && bi != null && ai !== bi) return ai - bi;
  if (ai != null && bi == null) return -1;
  if (ai == null && bi != null) return 1;
  const at = Date.parse(a.updatedAt ?? '');
  const bt = Date.parse(b.updatedAt ?? '');
  if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) return bt - at;
  return a.id.localeCompare(b.id);
}

/** Порядок внутри объекта: вставка сразу после указанного расчёта (между соседями — середина диапазона). */
export function computeInGroupListOrderAfterPreset(
  presets: ContractEstimatePreset[],
  groupId: string,
  afterPresetId: string
): number {
  const members = presets.filter((p) => p.groupId === groupId).sort(sortPresetsInGroupByListOrder);
  const i = members.findIndex((p) => p.id === afterPresetId);
  if (i < 0) {
    let max = 0;
    for (const p of members) {
      const o = p.inGroupListOrder;
      if (typeof o === 'number' && Number.isFinite(o) && o > max) max = o;
    }
    return max + 10;
  }
  const cur = members[i]!;
  const curOrd =
    typeof cur.inGroupListOrder === 'number' && Number.isFinite(cur.inGroupListOrder)
      ? cur.inGroupListOrder
      : (i + 1) * 10;
  const next = members[i + 1];
  if (!next) return curOrd + 10;
  const nextOrd =
    typeof next.inGroupListOrder === 'number' && Number.isFinite(next.inGroupListOrder)
      ? next.inGroupListOrder
      : curOrd + 20;
  if (nextOrd > curOrd + 1) return Math.floor((curOrd + nextOrd) / 2);
  return curOrd + 10;
}

export type WorkspaceBaseline = {
  categorySlugs: string[];
  name: string;
  draftsByCategory: Record<string, string | null>;
  customer: EstimateCrmCustomerFields;
};

export function estimateCustomerFieldsFromPreset(
  preset: ContractEstimatePreset | undefined
): EstimateCrmCustomerFields {
  if (!preset) return emptyEstimateCrmCustomerFields();
  const id = preset.crmCustomerId?.trim() ?? '';
  return {
    crmCustomerId: id || null,
    customerName: (preset.customerName ?? '').trim(),
    objectAddress: (preset.objectAddress ?? '').trim(),
  };
}

/** Актуальные поля заказчика из CRM (снимок в пресете может устареть). */
export async function resolveEstimateCustomerFieldsFromPreset(
  preset: ContractEstimatePreset
): Promise<EstimateCrmCustomerFields> {
  const fromPreset = estimateCustomerFieldsFromPreset(preset);
  const crmId = fromPreset.crmCustomerId?.trim();
  if (!crmId) return fromPreset;
  try {
    const detail = await getCrmCustomer(crmId);
    const fromCrm = estimateFieldsFromCrmCustomerDetail(
      crmDetailWithPreferredObjectAddress(detail, fromPreset.objectAddress || undefined)
    );
    return {
      crmCustomerId: fromCrm.crmCustomerId,
      customerName: fromCrm.customerName || fromPreset.customerName,
      objectAddress: fromCrm.objectAddress || fromPreset.objectAddress,
    };
  } catch {
    return fromPreset;
  }
}

export type AdminMultiCategoryMeta = {
  slugs: string[];
  draftsByCategory: Record<string, string>;
  categories?: Array<{ slug: string; name: string; roomCount: number; total: number }>;
};

export type PersistedCalculatorDraftV1 = {
  v: 1;
  activeCalcId: string;
  calcs: Array<{
    id: string;
    name: string;
    collapsed: boolean;
    lines: Array<{ itemId: string; quantity: number }>;
  }>;
  __adminMultiCategory?: unknown;
};

export type MeasurementRoomDraft = {
  name?: string;
  ceilingHeight?: string;
  floorArea?: string;
  wallSegments?: string[];
  doors?: Array<{ width?: string; height?: string }>;
  windows?: Array<{ width?: string; height?: string }>;
  selectedWorkItemIds?: string[];
  workItemQuantities?: Record<string, string>;
};

function parsePositive(raw: string | undefined): number {
  const parsed = Number((raw ?? '').replace(',', '.').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function parseMeasurementRooms(comments: string | null | undefined): MeasurementRoomDraft[] {
  const source = comments ?? '';
  const markerIndex = source.indexOf(REPAIR_MEASUREMENT_DATA_MARKER);
  if (markerIndex < 0) return [];
  const jsonRaw = source.slice(markerIndex + REPAIR_MEASUREMENT_DATA_MARKER.length).trim();
  try {
    const parsed = JSON.parse(jsonRaw) as { rooms?: MeasurementRoomDraft[] };
    return Array.isArray(parsed.rooms) ? parsed.rooms : [];
  } catch {
    return [];
  }
}

function buildRoomMetrics(room: MeasurementRoomDraft) {
  const floorArea = parsePositive(room.floorArea);
  const perimeter = (room.wallSegments ?? []).reduce((sum, seg) => sum + parsePositive(seg), 0);
  const ceilingHeight = parsePositive(room.ceilingHeight);
  const doors = room.doors ?? [];
  const windows = room.windows ?? [];
  const doorsArea = doors.reduce(
    (sum, d) => sum + parsePositive(d.width) * parsePositive(d.height),
    0
  );
  const windowsArea = windows.reduce(
    (sum, w) => sum + parsePositive(w.width) * parsePositive(w.height),
    0
  );
  const grossWallArea = perimeter * ceilingHeight;
  const netWallArea = Math.max(0, grossWallArea - doorsArea - windowsArea);
  const baseboardPerimeter = Math.max(
    0,
    perimeter - doors.reduce((sum, d) => sum + parsePositive(d.width), 0)
  );
  return { floorArea, perimeter, netWallArea, baseboardPerimeter, doorsArea, windowsArea };
}

function resolveAutoQuantityByName(
  itemName: string,
  metrics: ReturnType<typeof buildRoomMetrics>
): number {
  const name = itemName.toLowerCase();
  if (name.includes('плинтус')) return metrics.baseboardPerimeter;
  if (name.includes('пол')) return metrics.floorArea;
  if (name.includes('откос')) return metrics.doorsArea + metrics.windowsArea;
  if (name.includes('стен')) return metrics.netWallArea;
  return 0;
}

export async function buildDraftsFromMeasurement(
  rooms: MeasurementRoomDraft[],
  categorySlugs: string[]
): Promise<{ draftSlugs: string[]; draftsByCategory: Record<string, string> }> {
  const itemIdToSlug = new Map<string, string>();
  const itemIdToName = new Map<string, string>();
  await Promise.all(
    categorySlugs.map(async (slug) => {
      try {
        const res = await fetch(`${API_URL}/service-catalog/categories/${slug}`);
        if (!res.ok) return;
        const data = (await res.json()) as { items?: Array<{ id: string; name: string }> };
        for (const item of data.items ?? []) {
          itemIdToSlug.set(item.id, slug);
          itemIdToName.set(item.id, item.name);
        }
      } catch {
        // ignore category fetch errors
      }
    })
  );

  const bySlug = new Map<string, PersistedCalculatorDraftV1>();
  for (const room of rooms) {
    const roomName = (room.name ?? '').trim() || 'Помещение';
    const selectedIds = Array.isArray(room.selectedWorkItemIds) ? room.selectedWorkItemIds : [];
    const quantities = room.workItemQuantities ?? {};
    const metrics = buildRoomMetrics(room);
    for (const itemId of selectedIds) {
      const slug = itemIdToSlug.get(itemId);
      if (!slug) continue;
      const manualQuantity = parsePositive(quantities[itemId]);
      const autoQuantity = resolveAutoQuantityByName(itemIdToName.get(itemId) ?? '', metrics);
      const quantity = manualQuantity > 0 ? manualQuantity : autoQuantity > 0 ? autoQuantity : 1;
      if (!bySlug.has(slug)) bySlug.set(slug, { v: 1, activeCalcId: '', calcs: [] });
      const draft = bySlug.get(slug)!;
      let calc = draft.calcs.find((c) => c.name === roomName);
      if (!calc) {
        calc = {
          id: `calc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: roomName,
          collapsed: false,
          lines: [],
        };
        draft.calcs.push(calc);
      }
      const existingLine = calc.lines.find((line) => line.itemId === itemId);
      if (existingLine) existingLine.quantity += quantity;
      else calc.lines.push({ itemId, quantity });
      if (!draft.activeCalcId) draft.activeCalcId = calc.id;
    }
  }

  const draftsByCategory = Object.fromEntries(
    [...bySlug.entries()].map(([slug, draft]) => [slug, JSON.stringify(draft)])
  ) as Record<string, string>;
  return {
    draftSlugs: normalizeUniqueCategorySlugs(Object.keys(draftsByCategory)),
    draftsByCategory,
  };
}

export function normalizeUniqueCategorySlugs(slugs: string[]): string[] {
  return [...new Set(slugs.map((x) => x.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'ru')
  );
}

export function countCalculatorSelectedLines(draftsByCategory: Record<string, string>): number {
  let total = 0;
  for (const draft of Object.values(draftsByCategory)) {
    for (const room of parseDraftRooms(draft)) {
      total += room.items.length;
    }
  }
  return total;
}

export function parsePersistedCalculatorDraft(
  draft: string | null
): PersistedCalculatorDraftV1 | null {
  if (!draft) return null;
  try {
    const parsed = JSON.parse(draft) as PersistedCalculatorDraftV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.calcs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function extractRoomNamesFromDraft(draft: string | null): string[] {
  const parsed = parsePersistedCalculatorDraft(draft);
  if (!parsed) return [];
  return parsed.calcs.map((c) => (typeof c.name === 'string' ? c.name.trim() : '')).filter(Boolean);
}

export function shouldAutofillTargetRooms(targetDraft: string | null): boolean {
  const parsed = parsePersistedCalculatorDraft(targetDraft);
  if (!parsed) return true;
  if (parsed.calcs.length === 0) return true;
  // Не трогаем категорию, если уже есть введённые позиции.
  if (parsed.calcs.some((c) => Array.isArray(c.lines) && c.lines.length > 0)) return false;
  // Один дефолтный пустой calc можно заменить.
  if (parsed.calcs.length === 1) {
    const name = (parsed.calcs[0].name || '').trim().toLowerCase();
    return !name || name === 'помещение' || name === 'помещение 1';
  }
  // Несколько пустых помещений считаем уже осознанной структурой — не перезаписываем.
  return false;
}

export function buildDraftWithRoomNames(roomNames: string[]): string {
  const ts = Date.now();
  const calcs = roomNames.map((name, idx) => ({
    id: `calc_${ts}_${idx + 1}`,
    name,
    collapsed: false,
    lines: [] as Array<{ itemId: string; quantity: number }>,
  }));
  const payload: PersistedCalculatorDraftV1 = {
    v: 1,
    activeCalcId: calcs[0]?.id ?? '',
    calcs,
  };
  return JSON.stringify(payload);
}

export function mergeRoomStructureIntoDraft(
  targetDraft: string | null,
  sourceRoomNames: string[]
): string | null {
  const parsed = parsePersistedCalculatorDraft(targetDraft);
  if (!parsed) {
    return buildDraftWithRoomNames(sourceRoomNames);
  }
  if (sourceRoomNames.length === 0) return targetDraft;

  const nextCalcs = [...parsed.calcs];
  let changed = false;
  const ts = Date.now();

  for (let i = 0; i < sourceRoomNames.length; i++) {
    const sourceName = sourceRoomNames[i];
    const cur = nextCalcs[i];
    if (!cur) {
      nextCalcs.push({
        id: `calc_${ts}_${i + 1}`,
        name: sourceName,
        collapsed: false,
        lines: [],
      });
      changed = true;
      continue;
    }
    if ((cur.name || '') !== sourceName) {
      nextCalcs[i] = { ...cur, name: sourceName };
      changed = true;
    }
  }

  if (!changed) return targetDraft;
  const nextPayload: PersistedCalculatorDraftV1 = {
    ...parsed,
    calcs: nextCalcs,
    activeCalcId:
      parsed.activeCalcId && nextCalcs.some((c) => c.id === parsed.activeCalcId)
        ? parsed.activeCalcId
        : (nextCalcs[0]?.id ?? ''),
  };
  return JSON.stringify(nextPayload);
}

export function extractMultiCategoryMetaFromDraft(draft: string): AdminMultiCategoryMeta | null {
  try {
    const parsed = JSON.parse(draft) as Record<string, unknown>;
    const raw = parsed.__adminMultiCategory;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const m = raw as { slugs?: unknown; draftsByCategory?: unknown };
    if (!Array.isArray(m.slugs) || !m.draftsByCategory || typeof m.draftsByCategory !== 'object') {
      return null;
    }
    const slugs = normalizeUniqueCategorySlugs(
      m.slugs.filter((x): x is string => typeof x === 'string')
    );
    const draftsByCategory: Record<string, string> = {};
    for (const slug of slugs) {
      const v = (m.draftsByCategory as Record<string, unknown>)[slug];
      if (typeof v === 'string' && v.trim()) draftsByCategory[slug] = v;
    }
    return Object.keys(draftsByCategory).length > 0 ? { slugs, draftsByCategory } : null;
  } catch {
    return null;
  }
}

export function encodePrimaryDraftWithMultiMeta(
  primaryDraft: string,
  meta: AdminMultiCategoryMeta | null
): string {
  if (!meta || meta.slugs.length <= 1) return primaryDraft;
  try {
    const parsed = JSON.parse(primaryDraft) as Record<string, unknown>;
    parsed.__adminMultiCategory = meta;
    return JSON.stringify(parsed);
  } catch {
    return primaryDraft;
  }
}

export function clampWithEllipsis(value: string, max: number): string {
  const normalized = value.trim();
  if (normalized.length <= max) return normalized;
  if (max <= 1) return normalized.slice(0, max);
  return `${normalized.slice(0, max - 1)}…`;
}

export function sanitizeEstimatePresetForApi(
  input: ContractEstimatePreset
): ContractEstimatePreset {
  const { additionalMarkupPercent: rawMarkup, ...restIn } = input;
  const base: ContractEstimatePreset = {
    ...restIn,
    id: clampWithEllipsis(input.id || `est_${Date.now()}`, 80),
    title: clampWithEllipsis(input.title || 'Расчёт', 160),
    categorySlug: clampWithEllipsis(input.categorySlug || 'repair', 120),
    categoryName: clampWithEllipsis(input.categoryName || 'Расчёт', 200),
    groupId: input.groupId ? clampWithEllipsis(input.groupId, 48) : undefined,
  };
  const crmId = input.crmCustomerId?.trim();
  if (crmId) base.crmCustomerId = clampWithEllipsis(crmId, 80);
  const custName = input.customerName?.trim();
  if (custName) base.customerName = clampWithEllipsis(custName, 200);
  const objAddr = input.objectAddress?.trim();
  if (objAddr) base.objectAddress = clampWithEllipsis(objAddr, 500);
  if (typeof rawMarkup === 'number' && Number.isFinite(rawMarkup)) {
    return {
      ...base,
      additionalMarkupPercent: clampEstimateAdditionalMarkupPercent(rawMarkup),
    };
  }
  return base;
}
