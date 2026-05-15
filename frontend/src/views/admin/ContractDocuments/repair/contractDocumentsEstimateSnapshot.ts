import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';
import { apiFetch } from '@/shared/lib/api-fetch';
import { getApiBaseUrl } from '@/shared/lib/auth-session';

import {
  buildCustomSnapshotLines,
  parseEstimateCustomItemsFromDraft,
  splitDraftLineItems,
} from './estimateCustomWorkItems';

function joinApiPath(path: string): string {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const p = path.replace(/^\//, '');
  return `${base}/${p}`;
}

function draftLineQuantityPositive(raw: unknown): number | null {
  const n =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? Number(String(raw).replace(',', '.').trim())
        : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

type PersistedCalculatorDraftV1 = {
  v: 1;
  activeCalcId: string;
  calcs: Array<{
    id: string;
    name: string;
    collapsed: boolean;
    lines: Array<{ itemId: string; quantity: number | string }>;
  }>;
};

export type EstimateSnapshot = NonNullable<ContractEstimatePreset['snapshot']>;

function normalizeCatalogItemId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s.length > 0 ? s : null;
}

/** Комнаты и позиции черновика калькулятора (как при построении снимка сметы). */
export function parseDraftRooms(
  draftRaw: string
): Array<{ name: string; items: Array<{ itemId: string; quantity: number }> }> {
  try {
    const parsed = JSON.parse(draftRaw) as PersistedCalculatorDraftV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.calcs)) return [];
    return parsed.calcs
      .map((calc) => ({
        name: calc.name?.trim() || 'Помещение',
        items: (calc.lines ?? [])
          .map((line) => {
            const qty = draftLineQuantityPositive(line?.quantity);
            const itemId = normalizeCatalogItemId(line?.itemId);
            if (!itemId || qty == null) return null;
            return { itemId, quantity: qty };
          })
          .filter((x): x is { itemId: string; quantity: number } => x != null),
      }))
      .filter((room) => room.items.length > 0);
  } catch {
    return [];
  }
}

export async function buildEstimateSnapshot(draftRaw: string): Promise<EstimateSnapshot | null> {
  const rooms = parseDraftRooms(draftRaw);
  if (rooms.length === 0) return null;
  const customItems = parseEstimateCustomItemsFromDraft(draftRaw);
  const roomSnapshots = await Promise.all(
    rooms.map(async (room) => {
      const { catalog, custom } = splitDraftLineItems(room.items, customItems);
      const customLines = buildCustomSnapshotLines(custom);
      const customTotal = customLines.reduce((s, l) => s + l.amount, 0);

      if (catalog.length === 0) {
        return {
          name: room.name,
          total: customTotal,
          lines: customLines,
        };
      }

      const res = await apiFetch(joinApiPath('service-catalog/calculate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: catalog }),
      });
      if (!res.ok) {
        return {
          name: room.name,
          total: customTotal,
          lines: [
            ...catalog.map((item) => ({
              name: `Позиция ${item.itemId}`,
              unit: 'ед.',
              quantity: item.quantity,
              price: 0,
              amount: 0,
              itemId: item.itemId,
            })),
            ...customLines,
          ],
        };
      }
      const data = (await res.json()) as {
        total?: number;
        lines?: Array<{
          itemId?: string;
          name: string;
          unit: string;
          quantity: number;
          price: number;
          amount: number;
        }>;
      };
      const apiLines = Array.isArray(data.lines) ? data.lines : [];
      const mapped =
        apiLines.length > 0
          ? apiLines.map((line, idx) => {
              const fromApi = normalizeCatalogItemId(line.itemId);
              const fromItem = catalog[idx] ? normalizeCatalogItemId(catalog[idx]!.itemId) : null;
              const itemId = fromApi ?? fromItem;
              return {
                name: line.name,
                unit: line.unit,
                quantity: line.quantity,
                price: line.price,
                amount: line.amount,
                ...(itemId ? { itemId } : {}),
              };
            })
          : catalog.map((item) => ({
              name: `Позиция ${item.itemId}`,
              unit: 'ед.',
              quantity: item.quantity,
              price: 0,
              amount: 0,
              itemId: item.itemId,
            }));
      const catalogTotal = typeof data.total === 'number' ? data.total : 0;
      return {
        name: room.name,
        total: catalogTotal + customTotal,
        lines: [...mapped, ...customLines],
      };
    })
  );
  return {
    rooms: roomSnapshots,
    total: roomSnapshots.reduce((sum, room) => sum + room.total, 0),
  };
}
