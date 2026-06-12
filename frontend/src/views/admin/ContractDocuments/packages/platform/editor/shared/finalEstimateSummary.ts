import type { PackageFormData } from '../../form/packageForm';
import { formatPackageMoneyValue } from '../estimateTab/estimateTabUi';

export type FinalEstimateSummaryRow = {
  key: string;
  roomName: string;
  workName: string;
  unit: string;
  quantity: number;
  amount: number;
  includedQuantity: number;
  excludedQuantity: number;
};

export type InstallerGradePercent = 0 | 5 | 10;

export function parseInstallerGradePercent(rawGrade: string): InstallerGradePercent {
  const match = rawGrade.match(/\d+/);
  const rank = match ? Number.parseInt(match[0] ?? '', 10) : NaN;
  if (!Number.isFinite(rank)) return 0;
  if (rank >= 6) return 10;
  if (rank >= 5) return 5;
  return 0;
}

export function formatInstallerGradeShort(rawGrade: string): string {
  const match = rawGrade.match(/\d+/);
  const rank = match ? Number.parseInt(match[0] ?? '', 10) : NaN;
  if (!Number.isFinite(rank)) return rawGrade.trim() || '—';
  return `${rank}р`;
}

export function formatInstallerNameShort(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((x) => x.length > 0);
  if (parts.length === 0) return '—';
  const surname = parts[0] ?? '';
  const initials = parts
    .slice(1, 3)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}.`)
    .join('');
  return `${surname}${initials ? ` ${initials}` : ''}`;
}

export function formatMoneyRubShort(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 0.005) return `${rounded}`;
  return formatPackageMoneyValue(value);
}

export function parsePercentForWorkOrder(raw: string): number {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
}

export function normalizeWorkOrderGrade(v: unknown): InstallerGradePercent {
  return v === 5 || v === 10 ? v : 0;
}

export function buildFinalEstimateSummary(form: PackageFormData): {
  rows: FinalEstimateSummaryRow[];
  totalAmount: number;
} {
  type Agg = {
    roomName: string;
    workName: string;
    unit: string;
    includedQuantity: number;
    includedAmount: number;
    excludedQuantity: number;
    excludedAmount: number;
  };
  const acc = new Map<string, Agg>();
  const addSnapshot = (
    snapshot: PackageFormData['estimate']['snapshot'] | null | undefined,
    kind: 'included' | 'excluded'
  ) => {
    if (!snapshot?.rooms?.length) return;
    for (const room of snapshot.rooms) {
      const roomName = (room.name || '').trim() || 'Помещение';
      for (const line of room.lines ?? []) {
        const workName = (line.name || '').trim();
        if (!workName) continue;
        const unit = (line.unit || '').trim();
        const key = `${roomName}::${workName}::${unit}`;
        const quantity = Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0;
        const amount = Number.isFinite(Number(line.amount)) ? Number(line.amount) : 0;
        const prev =
          acc.get(key) ??
          ({
            roomName,
            workName,
            unit,
            includedQuantity: 0,
            includedAmount: 0,
            excludedQuantity: 0,
            excludedAmount: 0,
          } satisfies Agg);
        if (kind === 'included') {
          prev.includedQuantity += quantity;
          prev.includedAmount += amount;
        } else {
          prev.excludedQuantity += quantity;
          prev.excludedAmount += amount;
        }
        acc.set(key, prev);
      }
    }
  };

  addSnapshot(form.estimate.snapshot, 'included');
  for (const slot of form.addendumSlots.slice(0, form.addendumSlotCount)) {
    addSnapshot(slot.snapshot, 'included');
    addSnapshot(slot.excludedSnapshot, 'excluded');
  }

  const rows: FinalEstimateSummaryRow[] = [];
  for (const item of acc.values()) {
    const quantity = Math.max(0, item.includedQuantity - item.excludedQuantity);
    const amount = Math.max(0, item.includedAmount - item.excludedAmount);
    if (quantity <= 0 && amount <= 0) continue;
    rows.push({
      key: `${item.roomName}::${item.workName}::${item.unit}`,
      roomName: item.roomName,
      workName: item.workName,
      unit: item.unit,
      quantity,
      amount,
      includedQuantity: item.includedQuantity,
      excludedQuantity: item.excludedQuantity,
    });
  }
  rows.sort(
    (a, b) =>
      a.roomName.localeCompare(b.roomName, 'ru') || a.workName.localeCompare(b.workName, 'ru')
  );
  return { rows, totalAmount: rows.reduce((sum, row) => sum + row.amount, 0) };
}
