import { ContractDocumentPackageKind } from '@prisma/client';

/**
 * Порт фронтендового расчёта «Начислено по заказ-наряду» мастера
 * (usePackageFinalEstimateWorkOrders.ts + finalEstimateSummary.ts):
 * строки итоговой сметы (смета + Д/с, минус исключённые) × коэффициенты
 * скидки / налога / наценки / разряда, назначенные на мастеров.
 * Изменения формул — синхронно с фронтендом.
 */

/** Дефолт наценки заказ-наряда товарных направлений (как на фронте). */
export const DEFAULT_PRODUCT_WORK_ORDER_MARKUP_PERCENT = 33;

/** Товарные направления: без налога и разряда, с наценкой из настроек направления. */
const PRODUCT_LIKE_KINDS: ReadonlySet<ContractDocumentPackageKind> = new Set([
  ContractDocumentPackageKind.WINDOWS,
  ContractDocumentPackageKind.DOORS,
  ContractDocumentPackageKind.BLINDS,
  ContractDocumentPackageKind.CEILINGS,
]);

export function isProductLikeKind(kind: ContractDocumentPackageKind): boolean {
  return PRODUCT_LIKE_KINDS.has(kind);
}

type EstimateSnapshotLine = {
  name?: unknown;
  unit?: unknown;
  quantity?: unknown;
  amount?: unknown;
};

type EstimateSnapshot = {
  rooms?: Array<{ name?: unknown; lines?: EstimateSnapshotLine[] }> | null;
} | null;

type FormDataForAccrual = {
  contract?: { discountPercent?: unknown };
  workOrder?: { taxPercent?: unknown; markupPercent?: unknown; gradeIncreasePercent?: unknown };
  estimate?: { snapshot?: EstimateSnapshot };
  addendumSlotCount?: unknown;
  addendumSlots?: Array<{
    snapshot?: EstimateSnapshot;
    excludedSnapshot?: EstimateSnapshot;
  }> | null;
  finalEstimateInstallerAssignments?: Record<string, { installerId?: unknown }> | null;
};

/** Неотрицательный процент из поля формы (строки «5», «5,5» и т.п.); пусто/мусор → 0. */
function parseNonNegativePercent(raw: unknown): number {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  if (typeof raw !== 'string') return 0;
  const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

/** Скидка договора: 0…100. */
export function parseContractDiscountPercent(raw: unknown): number {
  return Math.min(100, parseNonNegativePercent(raw));
}

/** Процент поля заказ-наряда (налог/наценка): 0…100. */
function parseWorkOrderPercent(raw: unknown): number {
  return Math.min(100, parseNonNegativePercent(raw));
}

/** Разряд повышения из поля заказ-наряда: строго 0 / 5 / 10. */
function normalizeWorkOrderGrade(v: unknown): 0 | 5 | 10 {
  return v === 5 || v === 10 ? v : 0;
}

/** Разряд мастера («6 разряд» и т.п.): ≥6 → 10%, ≥5 → 5%, иначе 0. */
export function parseInstallerGradePercent(rawGrade: string): 0 | 5 | 10 {
  const match = rawGrade.match(/\d+/);
  const rank = match ? Number.parseInt(match[0] ?? '', 10) : NaN;
  if (!Number.isFinite(rank)) return 0;
  if (rank >= 6) return 10;
  if (rank >= 5) return 5;
  return 0;
}

/** Наценка заказ-наряда товарного направления из настроек: 0…100 целое, дефолт 33. */
export function normalizeProductMarkupPercent(value: unknown): number {
  const n =
    typeof value === 'number'
      ? value
      : Number.parseFloat(
          String(value ?? '')
            .trim()
            .replace(',', '.'),
        );
  if (!Number.isFinite(n) || n < 0) return DEFAULT_PRODUCT_WORK_ORDER_MARKUP_PERCENT;
  return Math.min(100, Math.max(0, Math.trunc(n)));
}

export type AccruedInstallerTotal = {
  installerId: string;
  /** Сумма «Начислено» по заказ-наряду (копейки, без округления до рублей). */
  total: number;
  lineCount: number;
};

function toFiniteNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Строки итоговой сметы: смета договора + Д/с (включённые минус исключённые). */
function buildFinalEstimateRows(form: FormDataForAccrual): Array<{ key: string; amount: number }> {
  type Agg = {
    includedAmount: number;
    excludedAmount: number;
    includedQty: number;
    excludedQty: number;
  };
  const acc = new Map<string, Agg>();

  const addSnapshot = (snapshot: EstimateSnapshot, kind: 'included' | 'excluded') => {
    if (!snapshot?.rooms?.length) return;
    for (const room of snapshot.rooms) {
      const roomName = String(room?.name ?? '').trim() || 'Помещение';
      for (const line of room.lines ?? []) {
        const workName = String(line?.name ?? '').trim();
        if (!workName) continue;
        const unit = String(line?.unit ?? '').trim();
        const key = `${roomName}::${workName}::${unit}`;
        const quantity = toFiniteNumber(line?.quantity);
        const amount = toFiniteNumber(line?.amount);
        const prev = acc.get(key) ?? {
          includedAmount: 0,
          excludedAmount: 0,
          includedQty: 0,
          excludedQty: 0,
        };
        if (kind === 'included') {
          prev.includedAmount += amount;
          prev.includedQty += quantity;
        } else {
          prev.excludedAmount += amount;
          prev.excludedQty += quantity;
        }
        acc.set(key, prev);
      }
    }
  };

  addSnapshot(form.estimate?.snapshot ?? null, 'included');
  const slotCount = Math.min(5, Math.max(0, Math.trunc(toFiniteNumber(form.addendumSlotCount))));
  const slots = Array.isArray(form.addendumSlots) ? form.addendumSlots.slice(0, slotCount) : [];
  for (const slot of slots) {
    addSnapshot(slot?.snapshot ?? null, 'included');
    addSnapshot(slot?.excludedSnapshot ?? null, 'excluded');
  }

  const rows: Array<{ key: string; amount: number }> = [];
  for (const [key, item] of acc.entries()) {
    const quantity = Math.max(0, item.includedQty - item.excludedQty);
    const amount = Math.max(0, item.includedAmount - item.excludedAmount);
    if (quantity <= 0 && amount <= 0) continue;
    rows.push({ key, amount });
  }
  return rows;
}

/**
 * «Начислено» по мастерам для пакета: назначенные на строки сметы мастера
 * получают сумму строки с коэффициентами заказ-наряда своего направления.
 */
export function computeInstallerAccrual(params: {
  kind: ContractDocumentPackageKind;
  formData: unknown;
  /** Наценка заказ-наряда товарного направления (из настроек направления). */
  productMarkupPercent?: number;
  /** Текущие мастера справочника: id → разряд («5 разряд» и т.п.). */
  installerGradeById: Map<string, string>;
}): Map<string, AccruedInstallerTotal> {
  const form = (
    params.formData && typeof params.formData === 'object'
      ? (params.formData as FormDataForAccrual)
      : {}
  ) as FormDataForAccrual;

  const discountFactor = 1 - parseContractDiscountPercent(form.contract?.discountPercent) / 100;
  const assignments =
    form.finalEstimateInstallerAssignments &&
    typeof form.finalEstimateInstallerAssignments === 'object'
      ? form.finalEstimateInstallerAssignments
      : {};

  const product = isProductLikeKind(params.kind);
  const productMarkupFactor = 1 - normalizeProductMarkupPercent(params.productMarkupPercent) / 100;
  const taxFactor = 1 - parseWorkOrderPercent(form.workOrder?.taxPercent) / 100;
  const markupFactor = 1 - parseWorkOrderPercent(form.workOrder?.markupPercent) / 100;
  const fallbackGrade = normalizeWorkOrderGrade(form.workOrder?.gradeIncreasePercent);

  const result = new Map<string, AccruedInstallerTotal>();
  for (const row of buildFinalEstimateRows(form)) {
    const installerId = assignments[row.key]?.installerId;
    if (typeof installerId !== 'string' || !installerId.trim()) continue;
    const grade = params.installerGradeById.has(installerId)
      ? parseInstallerGradePercent(params.installerGradeById.get(installerId) ?? '')
      : fallbackGrade;
    const priceFactor = product
      ? discountFactor * productMarkupFactor
      : discountFactor * taxFactor * markupFactor * (1 + grade / 100);
    const prev = result.get(installerId) ?? { installerId, total: 0, lineCount: 0 };
    prev.total += row.amount * priceFactor;
    prev.lineCount += 1;
    result.set(installerId, prev);
  }
  return result;
}
