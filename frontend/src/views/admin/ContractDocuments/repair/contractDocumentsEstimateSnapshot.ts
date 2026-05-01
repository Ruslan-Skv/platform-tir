import type { ContractEstimatePreset } from '@/shared/api/admin-contract-document-packages';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type PersistedCalculatorDraftV1 = {
  v: 1;
  activeCalcId: string;
  calcs: Array<{
    id: string;
    name: string;
    collapsed: boolean;
    lines: Array<{ itemId: string; quantity: number }>;
  }>;
};

export type EstimateSnapshot = NonNullable<ContractEstimatePreset['snapshot']>;

function parseDraftRooms(
  draftRaw: string
): Array<{ name: string; items: Array<{ itemId: string; quantity: number }> }> {
  try {
    const parsed = JSON.parse(draftRaw) as PersistedCalculatorDraftV1;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.calcs)) return [];
    return parsed.calcs
      .map((calc) => ({
        name: calc.name?.trim() || 'Помещение',
        items: (calc.lines ?? []).filter(
          (line) => line?.itemId && typeof line.quantity === 'number' && line.quantity > 0
        ),
      }))
      .filter((room) => room.items.length > 0);
  } catch {
    return [];
  }
}

export async function buildEstimateSnapshot(draftRaw: string): Promise<EstimateSnapshot | null> {
  const rooms = parseDraftRooms(draftRaw);
  if (rooms.length === 0) return null;
  const roomSnapshots = await Promise.all(
    rooms.map(async (room) => {
      const res = await fetch(`${API_URL}/service-catalog/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: room.items }),
      });
      if (!res.ok) {
        return {
          name: room.name,
          total: 0,
          lines: room.items.map((item) => ({
            name: `Позиция ${item.itemId}`,
            unit: 'ед.',
            quantity: item.quantity,
            price: 0,
            amount: 0,
          })),
        };
      }
      const data = (await res.json()) as {
        total?: number;
        lines?: Array<{
          name: string;
          unit: string;
          quantity: number;
          price: number;
          amount: number;
        }>;
      };
      return {
        name: room.name,
        total: typeof data.total === 'number' ? data.total : 0,
        lines: Array.isArray(data.lines)
          ? data.lines.map((line) => ({
              name: line.name,
              unit: line.unit,
              quantity: line.quantity,
              price: line.price,
              amount: line.amount,
            }))
          : [],
      };
    })
  );
  return {
    rooms: roomSnapshots,
    total: roomSnapshots.reduce((sum, room) => sum + room.total, 0),
  };
}
