import type { ServiceCatalogCategoryDetail } from '@/shared/api/service-catalog';
import {
  type EstimateCalculatorDraftCustomItems,
  normalizeEstimateCustomWorkItemDef,
} from '@/views/admin/ContractDocuments/packages/platform/estimates/estimateCustomWorkItems';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string | null;
  unit: string;
  price?: number;
}

export interface CategoryItemSection {
  name: string;
  slug: string;
  items: ServiceCatalogItem[];
}

export type CategoryData = ServiceCatalogCategoryDetail;

export function workGroupKey(section: CategoryItemSection, sectionIdx: number): string {
  return `${section.slug}::${sectionIdx}`;
}

export function getTableSectionsForData(data: CategoryData): CategoryItemSection[] {
  if (data.itemSections && data.itemSections.length > 0) {
    return data.itemSections;
  }
  if (data.items.length > 0) {
    return [{ name: data.name, slug: data.slug, items: data.items }];
  }
  return [];
}

export const publicWorkGroupsStorageKey = (categorySlug: string) =>
  `public.service-catalog.category.work-groups.${encodeURIComponent(categorySlug)}`;

export function readCollapsedWorkGroupKeysFromStorage(categorySlug: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(publicWorkGroupsStorageKey(categorySlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

export function writeCollapsedWorkGroupKeysToStorage(
  categorySlug: string,
  keys: Set<string>
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(publicWorkGroupsStorageKey(categorySlug), JSON.stringify([...keys]));
  } catch {
    // квота / приватный режим
  }
}

export const newCalcId = () => `calc-${Math.random().toString(36).slice(2, 10)}`;

export const calculatorDraftStorageKey = (categorySlug: string) =>
  `public.service-catalog.category.calculator-draft.${encodeURIComponent(categorySlug)}`;

/** Сериализуемый снапшот черновика калькулятора (без result API — пересчитается после загрузки). */
export type PersistedCalculatorDraftV1 = {
  v: 1;
  activeCalcId: string;
  /** Виды работ только для этого расчёта (ключ — `est-custom:…`). */
  customItems?: EstimateCalculatorDraftCustomItems;
  calcs: Array<{
    id: string;
    name: string;
    collapsed: boolean;
    lines: Array<{ itemId: string; quantity: number }>;
  }>;
};

export interface CalculatorLine {
  itemId: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
}

/** Сколько позиций этапа (по `itemId`) уже в расчёте активного помещения. */
export function countSelectedInSectionForLines(
  section: CategoryItemSection,
  lines: CalculatorLine[]
): number {
  if (section.items.length === 0 || lines.length === 0) return 0;
  const ids = new Set(section.items.map((i) => i.id));
  return lines.filter((l) => ids.has(l.itemId)).length;
}

export interface CalculateResult {
  total: number;
  lines: {
    itemId: string;
    name: string;
    categoryName: string;
    unit: string;
    quantity: number;
    price: number;
    amount: number;
  }[];
  showPricesInPublic: boolean;
}

export type CalculatorDraft = {
  id: string;
  name: string;
  lines: CalculatorLine[];
  result: CalculateResult | null;
  loading: boolean;
  collapsed: boolean;
};

export function readCalculatorDraftFromStorage(slug: string): PersistedCalculatorDraftV1 | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(calculatorDraftStorageKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const p = parsed as Partial<PersistedCalculatorDraftV1>;
    if (p.v !== 1 || typeof p.activeCalcId !== 'string' || !Array.isArray(p.calcs)) return null;
    return p as PersistedCalculatorDraftV1;
  } catch {
    return null;
  }
}

export function writeCalculatorDraftToStorage(
  slug: string,
  calculations: CalculatorDraft[],
  activeCalcId: string,
  customItems: EstimateCalculatorDraftCustomItems
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedCalculatorDraftV1 = {
      v: 1,
      activeCalcId,
      ...(Object.keys(customItems).length > 0 ? { customItems } : {}),
      calcs: calculations.map((c) => ({
        id: c.id,
        name: c.name,
        collapsed: c.collapsed,
        lines: c.lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
      })),
    };
    localStorage.setItem(calculatorDraftStorageKey(slug), JSON.stringify(payload));
  } catch {
    // квота / приватный режим
  }
}

/**
 * Восстанавливает черновик из localStorage, подставляя актуальные name/unit/price из каталога.
 */
export function hydrateCalculatorDraftFromStorage(
  slug: string,
  data: CategoryData
): {
  calculations: CalculatorDraft[];
  activeCalcId: string;
  customItems: EstimateCalculatorDraftCustomItems;
} | null {
  const raw = readCalculatorDraftFromStorage(slug);
  if (!raw || raw.calcs.length === 0) return null;

  const customItems: EstimateCalculatorDraftCustomItems = {};
  if (raw.customItems && typeof raw.customItems === 'object') {
    for (const [id, def] of Object.entries(raw.customItems)) {
      const normalized = normalizeEstimateCustomWorkItemDef(def);
      if (normalized) customItems[id] = normalized;
    }
  }
  const idToItem = new Map(data.items.map((i) => [i.id, i]));
  const calculations: CalculatorDraft[] = raw.calcs.map((c) => {
    const lines: CalculatorLine[] = [];
    for (const l of c.lines) {
      if (!l || typeof l.itemId !== 'string') continue;
      const q = typeof l.quantity === 'number' && !Number.isNaN(l.quantity) ? l.quantity : 0;
      if (q <= 0) continue;
      const customDef = customItems[l.itemId];
      if (customDef) {
        lines.push({
          itemId: l.itemId,
          name: customDef.name,
          unit: customDef.unit,
          price: customDef.price,
          quantity: q,
        });
        continue;
      }
      const item = idToItem.get(l.itemId);
      if (!item || item.price === undefined) continue;
      lines.push({
        itemId: item.id,
        name: item.name,
        unit: item.unit,
        price: item.price,
        quantity: q,
      });
    }
    const id = typeof c.id === 'string' && c.id.length > 0 ? c.id : newCalcId();
    return {
      id,
      name: typeof c.name === 'string' && c.name.length > 0 ? c.name : 'Помещение',
      collapsed: Boolean(c.collapsed),
      lines,
      result: null,
      loading: false,
    };
  });

  if (calculations.length === 0) return null;

  const activeRaw =
    typeof raw.activeCalcId === 'string' && calculations.some((c) => c.id === raw.activeCalcId)
      ? raw.activeCalcId
      : calculations[0].id;

  return { calculations, activeCalcId: activeRaw, customItems };
}

export const formatPrice = (n: number) =>
  new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n) + ' ₽';

/** Парсинг query-параметра preset: "itemId1:qty1,itemId2:qty2" */
export function parsePresetParam(
  preset: string | null
): Array<{ itemId: string; quantity: number }> {
  if (!preset || typeof preset !== 'string') return [];
  const result: Array<{ itemId: string; quantity: number }> = [];
  for (const part of preset.split(',')) {
    const sep = part.indexOf(':');
    if (sep < 0) continue;
    const itemId = part.slice(0, sep).trim();
    const qty = parseFloat(part.slice(sep + 1));
    if (itemId && !isNaN(qty) && qty > 0) {
      result.push({ itemId, quantity: qty });
    }
  }
  return result;
}

export type RoomPreset = { name: string; items: Array<{ itemId: string; quantity: number }> };

export const decodeBase64 = (value: string) => {
  const decoded = atob(value);
  return decodeURIComponent(decoded);
};

export const decodeRoomsParam = (value: string | null): RoomPreset[] => {
  if (!value) return [];
  try {
    const json = decodeBase64(value);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((room) => ({
        name: typeof room?.name === 'string' ? room.name : 'Помещение',
        items: Array.isArray(room?.items) ? room.items : [],
      }))
      .filter((room) => room.items.length > 0);
  } catch {
    return [];
  }
};

export const getCancelledOrderIds = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem('cancelled_service_order_ids');
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

export const addCancelledOrderId = (orderId: string) => {
  if (typeof window === 'undefined') return;
  const current = new Set(getCancelledOrderIds());
  current.add(orderId);
  window.sessionStorage.setItem('cancelled_service_order_ids', JSON.stringify([...current]));
};

export const removeCancelledOrderId = (orderId: string) => {
  if (typeof window === 'undefined') return;
  const current = new Set(getCancelledOrderIds());
  current.delete(orderId);
  window.sessionStorage.setItem('cancelled_service_order_ids', JSON.stringify([...current]));
};

export const getDetachedServiceCategories = (): Array<{
  orderId: string;
  categorySlug?: string;
  categoryName?: string;
}> => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem('detached_service_categories');
    return raw
      ? (JSON.parse(raw) as Array<{
          orderId: string;
          categorySlug?: string;
          categoryName?: string;
        }>)
      : [];
  } catch {
    return [];
  }
};

export const addDetachedServiceCategory = (
  orderId: string,
  categorySlug: string,
  categoryName?: string
) => {
  if (typeof window === 'undefined') return;
  const current = getDetachedServiceCategories();
  current.push({ orderId, categorySlug, categoryName });
  window.sessionStorage.setItem('detached_service_categories', JSON.stringify(current));
  window.dispatchEvent(new Event('cart-service-detached'));
};

export const removeDetachedServiceCategory = (
  orderId: string,
  categorySlug: string,
  categoryName?: string
) => {
  if (typeof window === 'undefined') return;
  const current = getDetachedServiceCategories().filter(
    (entry) =>
      !(
        entry.orderId === orderId &&
        (entry.categorySlug === categorySlug || entry.categoryName === categoryName)
      )
  );
  window.sessionStorage.setItem('detached_service_categories', JSON.stringify(current));
  window.dispatchEvent(new Event('cart-service-restored'));
};
