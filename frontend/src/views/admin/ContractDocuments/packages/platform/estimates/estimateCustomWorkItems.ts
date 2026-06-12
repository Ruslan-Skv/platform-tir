/** Позиции вида работ, заданные только в черновике расчёта (не в каталоге). */

export const ESTIMATE_CUSTOM_ITEM_ID_PREFIX = 'est-custom:';

export const ESTIMATE_CUSTOM_WORK_UNITS = ['м²', 'п.м.', 'шт', 'точка', 'час', '—'] as const;

export type EstimateCustomWorkItemDef = {
  name: string;
  unit: string;
  price: number;
};

export type EstimateCalculatorDraftCustomItems = Record<string, EstimateCustomWorkItemDef>;

export function isEstimateCustomItemId(itemId: string): boolean {
  return itemId.startsWith(ESTIMATE_CUSTOM_ITEM_ID_PREFIX);
}

export function createEstimateCustomItemId(): string {
  return `${ESTIMATE_CUSTOM_ITEM_ID_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function parseEstimateCustomItemsFromDraft(
  draftRaw: string
): EstimateCalculatorDraftCustomItems {
  try {
    const parsed = JSON.parse(draftRaw) as { customItems?: unknown };
    const raw = parsed?.customItems;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: EstimateCalculatorDraftCustomItems = {};
    for (const [id, def] of Object.entries(raw as Record<string, unknown>)) {
      if (!isEstimateCustomItemId(id)) continue;
      const normalized = normalizeEstimateCustomWorkItemDef(def);
      if (normalized) out[id] = normalized;
    }
    return out;
  } catch {
    return {};
  }
}

export function normalizeEstimateCustomWorkItemDef(raw: unknown): EstimateCustomWorkItemDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  const name = typeof d.name === 'string' ? d.name.trim() : '';
  const unit = typeof d.unit === 'string' ? d.unit.trim() : '';
  const price =
    typeof d.price === 'number'
      ? d.price
      : typeof d.price === 'string'
        ? Number(d.price.replace(',', '.').trim())
        : NaN;
  if (!name || !unit || !Number.isFinite(price) || price < 0) return null;
  return { name, unit, price };
}

export function parseCustomWorkFormInput(
  nameRaw: string,
  unitRaw: string,
  priceRaw: string
): EstimateCustomWorkItemDef | null {
  const name = nameRaw.trim();
  const unit = unitRaw.trim();
  const price = Number(priceRaw.replace(',', '.').trim());
  if (!name || !unit || !Number.isFinite(price) || price < 0) return null;
  return { name, unit, price };
}

export function splitDraftLineItems(
  items: Array<{ itemId: string; quantity: number }>,
  customItems: EstimateCalculatorDraftCustomItems
): {
  catalog: Array<{ itemId: string; quantity: number }>;
  custom: Array<{ itemId: string; quantity: number; def: EstimateCustomWorkItemDef }>;
} {
  const catalog: Array<{ itemId: string; quantity: number }> = [];
  const custom: Array<{ itemId: string; quantity: number; def: EstimateCustomWorkItemDef }> = [];
  for (const it of items) {
    const def = customItems[it.itemId];
    if (isEstimateCustomItemId(it.itemId) && def) {
      custom.push({ itemId: it.itemId, quantity: it.quantity, def });
    } else if (!isEstimateCustomItemId(it.itemId)) {
      catalog.push(it);
    }
  }
  return { catalog, custom };
}

export function buildCustomSnapshotLines(
  custom: Array<{ itemId: string; quantity: number; def: EstimateCustomWorkItemDef }>
): Array<{
  itemId: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
}> {
  return custom.map(({ itemId, quantity, def }) => ({
    itemId,
    name: def.name,
    unit: def.unit,
    quantity,
    price: def.price,
    amount: def.price * quantity,
  }));
}

export function mergeCalculateResultWithCustomLines<
  T extends {
    itemId: string;
    name: string;
    unit: string;
    quantity: number;
    price: number;
    amount: number;
  },
>(
  apiResult: { total: number; lines: T[]; showPricesInPublic?: boolean },
  custom: Array<{ itemId: string; quantity: number; def: EstimateCustomWorkItemDef }>,
  categoryName: string
): { total: number; lines: T[]; showPricesInPublic: boolean } {
  const customLines = custom.map(({ itemId, quantity, def }) => ({
    itemId,
    name: def.name,
    categoryName,
    unit: def.unit,
    quantity,
    price: def.price,
    amount: def.price * quantity,
  })) as unknown as T[];
  const customTotal = customLines.reduce((s, l) => s + l.amount, 0);
  return {
    total: apiResult.total + customTotal,
    lines: [...apiResult.lines, ...customLines],
    showPricesInPublic: Boolean(apiResult.showPricesInPublic ?? true),
  };
}
