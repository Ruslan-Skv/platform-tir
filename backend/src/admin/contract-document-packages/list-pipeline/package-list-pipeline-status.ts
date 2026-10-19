import { ContractDocumentPackageKind, ContractDocumentPackageStatus } from '@prisma/client';

/** Статусы колонки/фильтров списка договоров (паритет с фронтом). */
export type PackageListPipelineStatus =
  | 'IN_PROJECT'
  | 'SIGNED'
  | 'WORK_IN_PROGRESS'
  | 'CLOSED'
  | 'REFUSED';

export const PACKAGE_PAYMENT_TOLERANCE_RUB = 0.5;
export const PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT = 70;

const PRODUCT_KINDS = new Set<ContractDocumentPackageKind>([
  ContractDocumentPackageKind.WINDOWS,
  ContractDocumentPackageKind.DOORS,
  ContractDocumentPackageKind.BLINDS,
  ContractDocumentPackageKind.CEILINGS,
]);

export type PackageListPaymentRow = {
  amount: string | number;
  paymentType?: string | null;
  addendumNumber?: number | null;
  paymentDate?: string | Date | null;
};

export type PayableBreakdown = {
  mainContractRub: number | null;
  addendumTotalsRub: Array<{ slotIndex1: number; totalRub: number | null }>;
  grandTotalRub: number | null;
};

/** Промежуточные значения расчёта статуса — для диагностической выгрузки пакета. */
export type PackageListPipelineExplain = {
  status: PackageListPipelineStatus;
  payable: PayableBreakdown;
  allocations: {
    contractPaidRub: number;
    journalTotalRub: number;
    byAddendum: Array<{ slotIndex1: number; paidRub: number }>;
    /** Сумма договора за вычетом уменьшений от отрицательных Д/с. */
    effectiveMainRub: number | null;
    /** На сколько отрицательные Д/с уменьшили сумму договора. */
    reductionRub: number;
    /** Покрыто оплатами по договору (не больше effectiveMainRub). */
    mainCoveredRub: number;
  };
  addendumCards: Array<{
    slotIndex1: number;
    hasData: boolean;
    slotStatus: string;
    /** Итог Д/с из сводки; может быть отрицательным («уменьшение договора»). */
    totalRub: number | null;
    /** Сколько нужно доплатить по Д/с: null — итог неизвестен, 0 — платить нечего. */
    payableRub: number | null;
    /** Собственные проводки по основанию этого Д/с. */
    ownPaidRub: number;
    /** Покрыто всего: собственные проводки + перелив из оплат по договору. */
    coveredRub: number;
    fullyPaid: boolean;
    /** Отрицательный Д/с уменьшает сумму, которую клиент должен по договору. */
    reducesContract: boolean;
  }>;
  flags: {
    isRefused: boolean;
    /** Упрощённый конвейер (мебель и др.): оплаты и акты не влияют на статус. */
    simplifiedPipeline: boolean;
    isProductKind: boolean;
    hasAddendumsInPackage: boolean;
    /** Эффективная сумма договора покрыта оплатами по договору. */
    mainFullyCovered: boolean;
    allAddendumsFullyPaid: boolean;
    hasPositiveGrand: boolean;
    allPaymentsComplete: boolean;
    workStartPaymentReady: boolean;
    workStartActDone: boolean;
    workStarted: boolean;
    closeActDone: boolean;
    closeActChecks: {
      hasCloseActSignedAt: boolean;
      hasCloseActPhotoUrl: boolean;
      repairContractClosedFlag: boolean;
      contractClosedFlag: boolean;
    };
    contractClosed: boolean;
  };
};

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function parseRubAmount(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) return raw;
  const s = String(raw)
    .trim()
    .replace(/\s+/g, '')
    .replace(/руб\.?/gi, '')
    .replace(',', '.');
  if (!s) return null;
  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseDiscountPercent(raw: unknown): number {
  return Math.min(100, parseRubAmount(raw) ?? 0);
}

/** Процент наценки: ≥ 0 без верхнего предела — наценка может превышать 100. */
function parseMarkupPercent(raw: unknown): number {
  return parseRubAmount(raw) ?? 0;
}

function applyDiscount(amount: number, discountPercent: number): number {
  if (!Number.isFinite(amount) || amount < 0) return 0;
  const p = Math.min(100, Math.max(0, discountPercent));
  return amount * Math.max(0, 1 - p / 100);
}

function clampAddendumSlotCount(raw: unknown): number {
  const x =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string'
        ? parseInt(String(raw).trim(), 10)
        : NaN;
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x > 5) return 5;
  return Math.trunc(x);
}

function isProductKind(kind: ContractDocumentPackageKind): boolean {
  return PRODUCT_KINDS.has(kind);
}

function paymentAmount(row: PackageListPaymentRow): number {
  const n = typeof row.amount === 'number' ? row.amount : Number.parseFloat(String(row.amount));
  return Number.isFinite(n) ? n : 0;
}

function paymentDateIso(row: PackageListPaymentRow): string {
  const raw = row.paymentDate;
  if (raw == null) return '';
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function computePaymentAllocations(rows: PackageListPaymentRow[]): {
  contractPaidRub: number;
  byAddendum: Map<number, number>;
  journalTotal: number;
} {
  let contractPaidRub = 0;
  const byAddendum = new Map<number, number>();
  for (const r of rows) {
    const n = paymentAmount(r);
    if (!Number.isFinite(n)) continue;
    // Возврат денег клиенту уменьшает оплаченную сумму (запись хранится с положительной суммой).
    const signed = r.paymentType === 'REFUND' ? -n : n;
    if (r.paymentType === 'AMENDMENT' && r.addendumNumber != null && r.addendumNumber >= 1) {
      byAddendum.set(r.addendumNumber, (byAddendum.get(r.addendumNumber) ?? 0) + signed);
    } else {
      contractPaidRub += signed;
    }
  }
  const journalTotal = contractPaidRub + [...byAddendum.values()].reduce((a, b) => a + b, 0);
  return { contractPaidRub, byAddendum, journalTotal };
}

function addendumSlotHasData(slot: Record<string, unknown> | null): boolean {
  if (!slot) return false;
  const snap = asObj(slot.snapshot);
  const t = snap?.total;
  if (typeof t === 'number' && Number.isFinite(t)) return true;
  const selected = slot.selectedPresetIds;
  const excluded = slot.excludedSelectedPresetIds;
  if (Array.isArray(selected) && selected.length > 0) return true;
  if (Array.isArray(excluded) && excluded.length > 0) return true;
  // Д/с продуктовых направлений может состоять только из строк «Изменений в Спецификации».
  return (
    productAddendumSpecLinesHaveContent(slot.specificationAddedLines) ||
    productAddendumSpecLinesHaveContent(slot.specificationExcludedLines)
  );
}

function readAddendumSlots(
  formData: Record<string, unknown>,
): Array<Record<string, unknown> | null> {
  const raw = formData.addendumSlots;
  const slots: Array<Record<string, unknown> | null> = [];
  if (!Array.isArray(raw)) {
    for (let i = 0; i < 5; i++) slots.push(null);
    return slots;
  }
  for (let i = 0; i < 5; i++) {
    slots.push(asObj(raw[i]));
  }
  return slots;
}

function resolveAddendumSlotCount(formData: Record<string, unknown>): number {
  let count = clampAddendumSlotCount(formData.addendumSlotCount);
  const slots = readAddendumSlots(formData);
  for (let i = 0; i < 5; i++) {
    if (addendumSlotHasData(slots[i])) count = Math.max(count, i + 1);
  }
  return clampAddendumSlotCount(count);
}

function lineQtyPrice(qtyRaw: unknown, priceRaw: unknown): number {
  const qty = parseRubAmount(qtyRaw);
  const price = parseRubAmount(priceRaw);
  if (qty == null || price == null) return 0;
  return qty * price;
}

/** Сумма строк «Изменений в Спецификации» Д/с: qty × price, только строки с данными. */
function sumProductAddendumSpecLines(raw: unknown): number {
  if (!Array.isArray(raw)) return 0;
  let sum = 0;
  for (const item of raw) {
    const line = asObj(item);
    if (!line) continue;
    const amount = lineQtyPrice(line.quantity, line.price);
    const price = parseRubAmount(line.price);
    const hasContent =
      String(line.name ?? '').trim() || (price != null && price !== 0) || amount !== 0;
    if (hasContent) sum += amount;
  }
  return sum;
}

/** Есть ли в списке строк «Изменений в Спецификации» Д/с хотя бы одна с данными. */
function productAddendumSpecLinesHaveContent(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  for (const item of raw) {
    const line = asObj(item);
    if (!line) continue;
    const price = parseRubAmount(line.price);
    if (
      String(line.name ?? '').trim() ||
      (price != null && price !== 0) ||
      lineQtyPrice(line.quantity, line.price) !== 0
    ) {
      return true;
    }
  }
  return false;
}

function sumDoorsProducts(formData: Record<string, unknown>): number {
  const lines = formData.doorsSpecificationLines;
  if (!Array.isArray(lines)) return 0;
  let sum = 0;
  for (const item of lines) {
    const line = asObj(item);
    if (!line) continue;
    const hasContent =
      String(line.name ?? '').trim() ||
      String(line.size ?? '').trim() ||
      String(line.width ?? '').trim() ||
      String(line.height ?? '').trim() ||
      String(line.color ?? '').trim() ||
      String(line.openingSide ?? '').trim() ||
      String(line.mounting ?? '').trim() ||
      String(line.control ?? '').trim() ||
      (parseRubAmount(line.unitPrice) ?? 0) !== 0 ||
      lineQtyPrice(line.quantity, line.unitPrice) !== 0;
    if (!hasContent) continue;
    sum += lineQtyPrice(line.quantity ?? '1', line.unitPrice);
  }
  return sum;
}

function sumCeilingsProducts(formData: Record<string, unknown>): number {
  const spec = asObj(formData.ceilingsSpecification);
  if (!spec) return 0;
  const ceilings = Array.isArray(spec.ceilings) ? spec.ceilings : [];
  let gross = 0;
  let goodsTotal = 0;
  for (const cRaw of ceilings) {
    const c = asObj(cRaw);
    if (!c) continue;
    for (const key of ['fabrics', 'tapes', 'profiles', 'extras', 'goods'] as const) {
      const list = Array.isArray(c[key]) ? c[key] : [];
      for (const rowRaw of list) {
        const row = asObj(rowRaw);
        if (!row) continue;
        if (key === 'fabrics') gross += lineQtyPrice(row.qtyM2, row.unitPrice);
        else if (key === 'tapes') gross += lineQtyPrice(row.qtyM, row.unitPrice);
        else {
          const line = lineQtyPrice(row.qty, row.unitPrice);
          gross += line;
          if (key === 'goods') goodsTotal += line;
        }
      }
    }
  }
  const withMarkupPct = parseMarkupPercent(spec.extraMarkupPercent);
  /*
   * Доп. наценка не применяется к блоку «Товар (светильники, LED…)» при
   * goodsNoMarkup — паритет с frontend-расчётом спецификации потолков
   * (ceilingsSpecification.ts). Без учёта флага итог завышается, и полностью
   * оплаченный договор не признаётся закрытым (план-график ОДПЖ, фильтры списка).
   */
  const noMarkupTotal = spec.goodsNoMarkup === true ? goodsTotal : 0;
  const markupable = gross - noMarkupTotal;
  const withMarkup =
    withMarkupPct > 0 ? markupable * (1 + withMarkupPct / 100) + noMarkupTotal : gross;
  return applyDiscount(withMarkup, parseDiscountPercent(spec.discountPercent));
}

function computeProductMainContractRub(formData: Record<string, unknown>): number | null {
  const estimate = asObj(formData.estimate);
  const snap = asObj(estimate?.snapshot);
  const worksRaw =
    typeof snap?.total === 'number' && Number.isFinite(snap.total) ? snap.total : null;
  const contract = asObj(formData.contract);
  const discountRaw = contract?.discountPercent;
  const worksAmount =
    worksRaw != null ? applyDiscount(worksRaw, parseDiscountPercent(discountRaw)) : 0;

  const ceilingsNet = sumCeilingsProducts(formData);
  const doorsGross = sumDoorsProducts(formData);
  const doorsNet =
    doorsGross > 0
      ? applyDiscount(doorsGross, parseDiscountPercent(formData.doorsSpecificationDiscountPercent))
      : 0;
  const productsAmount =
    ceilingsNet > 0
      ? ceilingsNet
      : doorsNet > 0
        ? doorsNet
        : (parseRubAmount(formData.productSpecificationAmount) ?? 0);

  const total = worksAmount + productsAmount;
  return total > 0 ? total : null;
}

function computePayableBreakdown(
  kind: ContractDocumentPackageKind,
  formData: Record<string, unknown>,
): PayableBreakdown {
  const contract = asObj(formData.contract);
  const discountPct = parseDiscountPercent(contract?.discountPercent);
  const mainContractRub = isProductKind(kind)
    ? computeProductMainContractRub(formData)
    : parseRubAmount(contract?.totalAmount);

  const slots = readAddendumSlots(formData);
  const count = resolveAddendumSlotCount(formData);
  const addendumTotalsRub: PayableBreakdown['addendumTotalsRub'] = [];
  let addendumSumKnown = 0;
  for (let i = 0; i < count; i++) {
    const slot = slots[i];
    const snap = asObj(slot?.snapshot);
    const rawTotal =
      typeof snap?.total === 'number' && Number.isFinite(snap.total) ? snap.total : null;
    let totalRub: number | null;
    if (isProductKind(kind)) {
      /*
       * Паритет с frontend `computeWindowsAddendumTotals`: строки спецификации
       * (добавления − исключения) + счёт-заказ за вычетом исключённого, скидка —
       * только с положительной части. Итог может быть отрицательным — такое Д/с
       * уменьшает сумму договора, платить по нему не нужно.
       */
      const excludedSnap = asObj(slot?.excludedSnapshot);
      const rawExcluded =
        typeof excludedSnap?.total === 'number' && Number.isFinite(excludedSnap.total)
          ? excludedSnap.total
          : 0;
      const accountGrossNet = (rawTotal ?? 0) - rawExcluded;
      const accountNetAfterDiscount =
        discountPct > 0 && accountGrossNet > 0
          ? applyDiscount(accountGrossNet, discountPct)
          : accountGrossNet;
      const specNetTotal =
        sumProductAddendumSpecLines(slot?.specificationAddedLines) -
        sumProductAddendumSpecLines(slot?.specificationExcludedLines);
      totalRub = specNetTotal + accountNetAfterDiscount;
    } else {
      totalRub = rawTotal != null ? applyDiscount(rawTotal, discountPct) : null;
    }
    addendumTotalsRub.push({ slotIndex1: i + 1, totalRub });
    if (totalRub != null) addendumSumKnown += totalRub;
  }
  const grandTotalRub = mainContractRub != null ? mainContractRub + addendumSumKnown : null;
  return { mainContractRub, addendumTotalsRub, grandTotalRub };
}

function isPaidAtLeastPct(paidRub: number, totalRub: number | null, minPct: number): boolean {
  if (totalRub == null || !Number.isFinite(totalRub) || totalRub <= 0) return false;
  return paidRub >= totalRub * (minPct / 100) - PACKAGE_PAYMENT_TOLERANCE_RUB;
}

function isFullyPaidRub(paidRub: number, totalRub: number | null): boolean {
  if (totalRub == null || !Number.isFinite(totalRub) || totalRub <= 0) return false;
  return paidRub >= totalRub - PACKAGE_PAYMENT_TOLERANCE_RUB;
}

function isFormWorkStartActComplete(formData: Record<string, unknown>): boolean {
  return Boolean(
    String(formData.repairWorkStartActSignedAt ?? '').trim() &&
    String(formData.repairWorkStartActPhotoUrl ?? '').trim(),
  );
}

function closeActComplete(formData: Record<string, unknown>): boolean {
  if (
    String(formData.repairContractCloseActSignedAt ?? '').trim() &&
    String(formData.repairContractCloseActPhotoUrl ?? '').trim()
  ) {
    return true;
  }
  return formData.repairContractClosed === true || formData.contractClosed === true;
}

function inferWindowsPrepayment70StartDate(
  payments: PackageListPaymentRow[],
  grandTotalRub: number | null,
): string | null {
  if (
    !payments.length ||
    grandTotalRub == null ||
    !Number.isFinite(grandTotalRub) ||
    grandTotalRub <= 0
  ) {
    return null;
  }
  const threshold =
    grandTotalRub * (PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT / 100) - PACKAGE_PAYMENT_TOLERANCE_RUB;
  const sorted = [...payments].sort((a, b) => paymentDateIso(a).localeCompare(paymentDateIso(b)));
  let cumulative = 0;
  for (const row of sorted) {
    const n = paymentAmount(row);
    if (!Number.isFinite(n) || n <= 0) continue;
    cumulative += n;
    if (cumulative >= threshold) {
      const d = paymentDateIso(row);
      return d || null;
    }
  }
  return null;
}

function deriveListPipelineStatus(input: {
  packageFlowStatus: ContractDocumentPackageStatus;
  isRefused: boolean;
  workStarted: boolean;
  contractClosed: boolean;
}): PackageListPipelineStatus {
  if (input.isRefused) return 'REFUSED';
  if (input.contractClosed) return 'CLOSED';
  if (
    input.packageFlowStatus === ContractDocumentPackageStatus.CONTRACT_CONCLUDED &&
    input.workStarted
  ) {
    return 'WORK_IN_PROGRESS';
  }
  if (input.packageFlowStatus === ContractDocumentPackageStatus.CONTRACT_CONCLUDED) return 'SIGNED';
  return 'IN_PROJECT';
}

/**
 * Полный расчёт статуса конвейера со всеми промежуточными значениями —
 * для диагностической выгрузки пакета (когда статус в списке/хабе и в план-графике
 * расходится, по этому объекту видно, какая именно проверка не прошла).
 */
export function explainPackageListPipelineStatus(input: {
  kind: ContractDocumentPackageKind;
  status: ContractDocumentPackageStatus | string | null | undefined;
  formData: unknown;
  payments?: PackageListPaymentRow[] | null;
}): PackageListPipelineExplain {
  const formData = asObj(input.formData) ?? {};
  const dbStatus = String(input.status ?? ContractDocumentPackageStatus.IN_PROGRESS);
  const product = isProductKind(input.kind);
  const simplifiedPipeline = input.kind !== ContractDocumentPackageKind.REPAIR && !product;
  const isRefused =
    dbStatus === ContractDocumentPackageStatus.REFUSED ||
    formData.repairContractClientRefused === true;

  const packageFlowStatus: ContractDocumentPackageStatus =
    dbStatus === ContractDocumentPackageStatus.CONTRACT_CONCLUDED
      ? ContractDocumentPackageStatus.CONTRACT_CONCLUDED
      : ContractDocumentPackageStatus.IN_PROGRESS;

  const payments = input.payments ?? [];
  const payable = computePayableBreakdown(input.kind, formData);
  const allocationsRaw = computePaymentAllocations(payments);
  const slots = readAddendumSlots(formData);
  const count = resolveAddendumSlotCount(formData);

  /*
   * Модель покрытия оплат — паритет с frontend `packagePaymentCoverage.ts`:
   * — отрицательные Д/с уменьшают сумму по договору (effectiveMainRub);
   * — оплаты по основаниям договора сначала закрывают effectiveMainRub, остаток
   *   «переливается» на непокрытые положительные Д/с по порядку номеров — поэтому
   *   окончательный расчёт одной суммой закрывает и договор, и Д/с;
   * — оплаты по основаниям Д/с идут только на свой Д/с;
   * — Д/с с нулевым/отрицательным итогом платить не нужно; с неизвестным — не оплачен.
   */
  let reductionRub = 0;
  for (const a of payable.addendumTotalsRub) {
    if (a.totalRub != null && Number.isFinite(a.totalRub) && a.totalRub < 0) {
      reductionRub += Math.abs(a.totalRub);
    }
  }
  const mainRaw = payable.mainContractRub;
  const effectiveMainRub =
    mainRaw != null && Number.isFinite(mainRaw) ? Math.max(0, mainRaw - reductionRub) : null;
  const mainCoveredRub =
    effectiveMainRub != null
      ? Math.min(Math.max(0, allocationsRaw.contractPaidRub), effectiveMainRub)
      : 0;
  const mainFullyCovered =
    effectiveMainRub != null &&
    (effectiveMainRub <= PACKAGE_PAYMENT_TOLERANCE_RUB ||
      isFullyPaidRub(mainCoveredRub, effectiveMainRub));

  let spillRemainingRub =
    effectiveMainRub != null ? Math.max(0, allocationsRaw.contractPaidRub - effectiveMainRub) : 0;

  const addendumCards: PackageListPipelineExplain['addendumCards'] = [];
  for (let i = 0; i < count; i++) {
    const slot = slots[i];
    if (!addendumSlotHasData(slot)) continue;
    const ordinal = i + 1;
    const totalRub =
      payable.addendumTotalsRub.find((a) => a.slotIndex1 === ordinal)?.totalRub ?? null;
    const payableRub = totalRub != null ? Math.max(0, totalRub) : null;
    const ownPaidRub = allocationsRaw.byAddendum.get(ordinal) ?? 0;
    let coveredRub = 0;
    let fullyPaid = false;
    let reducesContract = false;
    if (payableRub == null) {
      fullyPaid = false;
    } else if (payableRub <= PACKAGE_PAYMENT_TOLERANCE_RUB) {
      fullyPaid = true;
      reducesContract = (totalRub ?? 0) < 0;
    } else {
      const ownEffectiveRub = Math.min(Math.max(0, ownPaidRub), payableRub);
      const spillRub = Math.min(payableRub - ownEffectiveRub, spillRemainingRub);
      spillRemainingRub -= spillRub;
      coveredRub = ownEffectiveRub + spillRub;
      fullyPaid = isFullyPaidRub(coveredRub, payableRub);
    }
    addendumCards.push({
      slotIndex1: ordinal,
      hasData: true,
      slotStatus: String(slot?.status ?? 'OPEN'),
      totalRub,
      payableRub,
      ownPaidRub,
      coveredRub,
      fullyPaid,
      reducesContract,
    });
  }

  const hasAddendumsInPackage = addendumCards.length > 0;
  const allAddendumsFullyPaid = addendumCards.every((c) => c.fullyPaid);
  const hasPositiveGrand =
    payable.grandTotalRub != null &&
    Number.isFinite(payable.grandTotalRub) &&
    payable.grandTotalRub > 0;
  const allPaymentsComplete =
    hasPositiveGrand && mainFullyCovered && (!hasAddendumsInPackage || allAddendumsFullyPaid);

  const workStartPaymentReady = isPaidAtLeastPct(
    allocationsRaw.journalTotal,
    payable.grandTotalRub,
    PACKAGE_WORK_START_MIN_CONTRACT_PAY_PCT,
  );

  const windowsStart = product
    ? inferWindowsPrepayment70StartDate(payments, payable.grandTotalRub)
    : null;
  const workStartActDone = product
    ? workStartPaymentReady && Boolean(windowsStart)
    : isFormWorkStartActComplete(formData);
  const closeActChecks = {
    hasCloseActSignedAt: Boolean(String(formData.repairContractCloseActSignedAt ?? '').trim()),
    hasCloseActPhotoUrl: Boolean(String(formData.repairContractCloseActPhotoUrl ?? '').trim()),
    repairContractClosedFlag: formData.repairContractClosed === true,
    contractClosedFlag: formData.contractClosed === true,
  };
  const closeActDone = closeActComplete(formData);
  /*
   * «В работе» — этап только направления «Ремонт» (после подписания Акта начала работ).
   * Продуктовые направления (окна, двери, жалюзи, потолки) после подписания договора
   * остаются «Подписан» до закрытия (полная оплата + Акт сдачи).
   */
  const workStarted = !product && workStartPaymentReady && workStartActDone;
  const contractClosed = allPaymentsComplete && closeActDone;

  const status: PackageListPipelineStatus = isRefused
    ? 'REFUSED'
    : simplifiedPipeline
      ? dbStatus === ContractDocumentPackageStatus.CONTRACT_CONCLUDED
        ? 'SIGNED'
        : 'IN_PROJECT'
      : deriveListPipelineStatus({
          packageFlowStatus,
          isRefused: false,
          workStarted,
          contractClosed,
        });

  return {
    status,
    payable,
    allocations: {
      contractPaidRub: allocationsRaw.contractPaidRub,
      journalTotalRub: allocationsRaw.journalTotal,
      byAddendum: [...allocationsRaw.byAddendum.entries()].map(([slotIndex1, paidRub]) => ({
        slotIndex1,
        paidRub,
      })),
      effectiveMainRub,
      reductionRub,
      mainCoveredRub,
    },
    addendumCards,
    flags: {
      isRefused,
      simplifiedPipeline,
      isProductKind: product,
      hasAddendumsInPackage,
      mainFullyCovered,
      allAddendumsFullyPaid,
      hasPositiveGrand,
      allPaymentsComplete,
      workStartPaymentReady,
      workStartActDone,
      workStarted,
      closeActDone,
      closeActChecks,
      contractClosed,
    },
  };
}

/**
 * Статус колонки списка договоров — паритет с frontend `packageListPipelineStatusFromPackage`.
 */
export function computePackageListPipelineStatus(input: {
  kind: ContractDocumentPackageKind;
  status: ContractDocumentPackageStatus | string | null | undefined;
  formData: unknown;
  payments?: PackageListPaymentRow[] | null;
}): PackageListPipelineStatus {
  return explainPackageListPipelineStatus(input).status;
}

/** Доля оплат журнала (вкл. допники, за вычетом возвратов) от суммы к оплате, %; null — базы нет. */
export function packagePaidPercentFromExplain(explain: PackageListPipelineExplain): number | null {
  const total = explain.payable.grandTotalRub;
  if (total == null || !Number.isFinite(total) || total <= 0) return null;
  return Math.max(0, Math.round((explain.allocations.journalTotalRub / total) * 100));
}

/** Сколько процентов договора оплачено (журнал оплат / всё к оплате, вкл. допники). */
export function computePackagePaidPercent(input: {
  kind: ContractDocumentPackageKind;
  status: ContractDocumentPackageStatus | string | null | undefined;
  formData: unknown;
  payments?: PackageListPaymentRow[] | null;
}): number | null {
  return packagePaidPercentFromExplain(explainPackageListPipelineStatus(input));
}

/** Id ответственного для фильтров: responsibleManagerId → signatory → createdBy. */
export function computePackageEffectiveManagerUserId(input: {
  responsibleManagerId?: string | null;
  createdById?: string | null;
  formData: unknown;
}): string {
  const responsible = input.responsibleManagerId?.trim();
  if (responsible) return responsible;
  const formData = asObj(input.formData) ?? {};
  const executor = asObj(formData.executor);
  const signatory =
    typeof executor?.signatoryCrmUserId === 'string' ? executor.signatoryCrmUserId.trim() : '';
  if (signatory) return signatory;
  return input.createdById?.trim() ?? '';
}

export function packageMatchesListSearch(
  formData: unknown,
  searchNorm: string,
  extras?: { title?: string | null; objectName?: string | null; objectAddress?: string | null },
): boolean {
  if (!searchNorm) return true;
  const fd = asObj(formData) ?? {};
  const contract = asObj(fd.contract);
  const customer = asObj(fd.customer);
  const object = asObj(fd.object);
  const num = String(contract?.number ?? '').trim();
  let customerName = '';
  if (customer) {
    if (customer.type === 'COMPANY' || customer.type === 'ENTREPRENEUR') {
      customerName = String(customer.organizationName ?? '').trim();
    } else {
      customerName = String(customer.fullName ?? '').trim();
    }
  }
  const address =
    String(object?.objectAddress ?? object?.address ?? '').trim() ||
    String(extras?.objectAddress ?? '').trim();
  const haystack = [num, customerName, address, extras?.title ?? '', extras?.objectName ?? '']
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return haystack.includes(searchNorm);
}

function isoToFilterDay(iso: string): string | null {
  const t = iso.trim();
  if (!t) return null;
  const d = /^\d{4}-\d{2}-\d{2}/.test(t) ? new Date(`${t.slice(0, 10)}T12:00:00`) : new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function packageMatchesDateRange(
  formData: unknown,
  dateFrom: string,
  dateTo: string,
): boolean {
  if (!dateFrom && !dateTo) return true;
  const fd = asObj(formData) ?? {};
  const days: string[] = [];
  const signing = isoToFilterDay(String(fd.contractConcludedAt ?? ''));
  if (signing) days.push(signing);
  const workStart = isoToFilterDay(String(fd.repairWorkStartActSignedAt ?? ''));
  if (workStart) days.push(workStart);
  const closeAct = isoToFilterDay(String(fd.repairContractCloseActSignedAt ?? ''));
  if (closeAct) days.push(closeAct);
  if (days.length === 0) return false;
  return days.some((day) => {
    if (dateFrom && day < dateFrom) return false;
    if (dateTo && day > dateTo) return false;
    return true;
  });
}

import { PACKAGE_KIND_DIRECTION_SLUG } from '../../../common/config/package-direction-registry.config';

export { PACKAGE_KIND_DIRECTION_SLUG };

export function packageMatchesDirectionIds(
  kind: ContractDocumentPackageKind,
  directionIds: string[],
  directionIdBySlug: Map<string, string>,
): boolean {
  if (directionIds.length === 0) return true;
  const slug = PACKAGE_KIND_DIRECTION_SLUG[kind];
  const id = directionIdBySlug.get(slug);
  if (!id) return false;
  return directionIds.includes(id);
}
