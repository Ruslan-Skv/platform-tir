import { formatMoneyRublesKopecksGrouped } from '../../form/moneyWhole';
import {
  packageContractDiscountMoneyFactor,
  parsePackageContractDiscountPercent,
  resolveAddendumSlotDiscount,
} from '../../form/packageContractDiscount';
import type { PackageFormData } from '../../form/packageForm';

/** Источник строки итоговой сметы: смета договора или Д/с №1…5. */
export type FinalEstimateRowSource = 'main' | 0 | 1 | 2 | 3 | 4;

export type FinalEstimateSummaryRow = {
  key: string;
  roomName: string;
  workName: string;
  unit: string;
  quantity: number;
  amount: number;
  includedQuantity: number;
  excludedQuantity: number;
  /**
   * Части строки по источникам (смета договора / Д/с) после вычета исключений —
   * у каждой части своя скидка (Д/с может замещать договорную).
   */
  sourceAmounts: Array<{ source: FinalEstimateRowSource; amount: number }>;
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
  return formatMoneyRublesKopecksGrouped(value);
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
    /** Включённые суммы по источникам в фиксированном порядке: договор, затем Д/с №1…. */
    sourceAmounts: Array<{ source: FinalEstimateRowSource; amount: number }>;
  };
  const acc = new Map<string, Agg>();
  const addSnapshot = (
    snapshot: PackageFormData['estimate']['snapshot'] | null | undefined,
    kind: 'included' | 'excluded',
    source: FinalEstimateRowSource
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
            sourceAmounts: [],
          } satisfies Agg);
        if (kind === 'included') {
          prev.includedQuantity += quantity;
          prev.includedAmount += amount;
          const src = prev.sourceAmounts.find((x) => x.source === source);
          if (src) src.amount += amount;
          else prev.sourceAmounts.push({ source, amount });
        } else {
          prev.excludedQuantity += quantity;
          prev.excludedAmount += amount;
        }
        acc.set(key, prev);
      }
    }
  };

  addSnapshot(form.estimate.snapshot, 'included', 'main');
  const slotCount = Math.min(5, Math.max(0, Math.trunc(Number(form.addendumSlotCount) || 0)));
  for (let i = 0; i < slotCount; i++) {
    const slot = form.addendumSlots[i];
    addSnapshot(slot?.snapshot, 'included', i as FinalEstimateRowSource);
    addSnapshot(slot?.excludedSnapshot, 'excluded', i as FinalEstimateRowSource);
  }

  const rows: FinalEstimateSummaryRow[] = [];
  for (const item of acc.values()) {
    const quantity = Math.max(0, item.includedQuantity - item.excludedQuantity);
    const amount = Math.max(0, item.includedAmount - item.excludedAmount);
    if (quantity <= 0 && amount <= 0) continue;
    // Исключения вычитаем из частей по порядку (сначала смета договора, затем Д/с):
    // итог по строке совпадает со старым расчётом max(0, включено − исключено).
    let remainingExcluded = item.excludedAmount;
    const sourceAmounts = item.sourceAmounts.map((src) => {
      const net = Math.max(0, src.amount - remainingExcluded);
      remainingExcluded -= src.amount - net;
      return { source: src.source, amount: net };
    });
    rows.push({
      key: `${item.roomName}::${item.workName}::${item.unit}`,
      roomName: item.roomName,
      workName: item.workName,
      unit: item.unit,
      quantity,
      amount,
      includedQuantity: item.includedQuantity,
      excludedQuantity: item.excludedQuantity,
      sourceAmounts,
    });
  }
  rows.sort(
    (a, b) =>
      a.roomName.localeCompare(b.roomName, 'ru') || a.workName.localeCompare(b.workName, 'ru')
  );
  return { rows, totalAmount: rows.reduce((sum, row) => sum + row.amount, 0) };
}

/** Факторы скидки по источникам строк итоговой сметы (Д/с замещает договорную). */
export function buildFinalEstimateDiscountFactors(form: PackageFormData): {
  contractDiscountFactor: number;
  slotDiscountFactors: number[];
  factorFor: (source: FinalEstimateRowSource) => number;
} {
  const contractDiscountFactor = packageContractDiscountMoneyFactor(
    parsePackageContractDiscountPercent(form.contract.discountPercent)
  );
  const slotDiscountFactors = [0, 1, 2, 3, 4].map((i) =>
    packageContractDiscountMoneyFactor(resolveAddendumSlotDiscount(form, i).percent)
  );
  return {
    contractDiscountFactor,
    slotDiscountFactors,
    factorFor: (source) =>
      source === 'main' ? contractDiscountFactor : (slotDiscountFactors[source] ?? 1),
  };
}

/** Сумма строк со скидкой: каждая часть — с фактором скидки своего источника. */
export function applyFinalEstimateDiscountToRowAmount(
  row: Pick<FinalEstimateSummaryRow, 'sourceAmounts'>,
  factorFor: (source: FinalEstimateRowSource) => number
): number {
  return row.sourceAmounts.reduce((sum, part) => sum + part.amount * factorFor(part.source), 0);
}
