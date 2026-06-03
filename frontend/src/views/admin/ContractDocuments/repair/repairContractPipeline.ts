import type {
  ContractDocumentPackage,
  ContractDocumentPackageKind,
  ContractDocumentPackagePayment,
  ContractDocumentPackageStatus,
} from '@/shared/api/admin-contract-document-packages';

import { CONTRACT_SIGNED_REVERT_WINDOW_MS } from './repairContractPackageHubConstants';
import {
  formatRepairPipelineActDate,
  isWithinMsSinceIso,
  isWithinRevertWindow,
} from './repairContractPackageHubUtils';
import { computeContractDeadlineFromWorkPeriodStart } from './repairContractWorkPeriod';
import type {
  RepairAddendumSlotEstimateBlock,
  RepairAddendumSlotStatus,
  RepairPackageFormData,
} from './repairPackageForm';
import { clampRepairAddendumSlotCount, mergeRepairPackageFormData } from './repairPackageForm';
import { computePackagePayableBreakdown } from './repairPackagePaymentTotals';

/** Допуск при сравнении сумм оплат (руб.). */
export const REPAIR_PAYMENT_TOLERANCE_RUB = 0.5;

/** Минимальная оплата по договору для этапа «В работе». */
export const REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT = 70;

export type RepairListPipelineStatus =
  | 'IN_PROJECT'
  | 'SIGNED'
  | 'WORK_IN_PROGRESS'
  | 'CLOSED'
  | 'REFUSED';

export type RepairPipelineStepId =
  | 'in_project'
  | 'signed'
  | 'addendums'
  | 'payments'
  | 'work'
  | 'closed';

export type RepairPipelineStepVisualState = 'upcoming' | 'current' | 'completed' | 'skipped';

export interface RepairPaymentAllocations {
  contractPaidRub: number;
  byAddendum: Map<number, number>;
}

export interface RepairAddendumPipelineCard {
  slotIndex0: number;
  ordinal: number;
  hasData: boolean;
  slotStatus: RepairAddendumSlotStatus;
  totalRub: number | null;
  paidRub: number;
  paidPct: number | null;
  signedAt: string;
  hasAttachedPresets: boolean;
  canSign: boolean;
  canUnmarkSigned: boolean;
  signedRevertRemainingMs: number;
}

export interface RepairPipelineStepView {
  id: RepairPipelineStepId;
  label: string;
  state: RepairPipelineStepVisualState;
  detail?: string;
}

export interface RepairPipelineModel {
  packageKind: ContractDocumentPackageKind;
  packageFlowStatus: ContractDocumentPackageStatus;
  isRefused: boolean;
  refusalReason: string;
  payableBreakdown: ReturnType<typeof computeRepairPackagePayableBreakdown>;
  allocations: RepairPaymentAllocations;
  contractPaidPct: number | null;
  grandPaidPct: number | null;
  allPaymentsComplete: boolean;
  workStartPaymentReady: boolean;
  workStartActComplete: boolean;
  closeActComplete: boolean;
  /**
   * Этап «В работе»:
   * — Ремонт: ≥70% по договору и акт начала работ;
   * — Окна: ≥70% предоплаты по договору (в т.ч. Д/с) и дата начала отсчёта срока.
   */
  repairWorkStarted: boolean;
  /** Этап «Закрыт»: 100% по договору и всем Д/с с данными + акт сдачи-приёмки. */
  repairContractClosed: boolean;
  hasAddendumsInPackage: boolean;
  addendumCards: RepairAddendumPipelineCard[];
  allAddendumsSigned: boolean;
  /** «Окна»: дата начала срока (день достижения 70% оплаты в журнале). */
  windowsWorkPeriodStartDate: string | null;
  /** «Окна»: расчётная дата окончания (начало + рабочие дни без выходных). */
  windowsContractDeadline: {
    iso: string;
    labelRu: string;
    workingDays: number;
    startLabelRu: string;
  } | null;
  steps: RepairPipelineStepView[];
  currentStepId: RepairPipelineStepId | 'refusal';
  listPipelineStatus: RepairListPipelineStatus;
  contractSignedRevertRemainingMs: number;
  canRevertContractConcluded: boolean;
}

export function computeRepairPaymentAllocations(
  rows: ContractDocumentPackagePayment[]
): RepairPaymentAllocations {
  let contractPaidRub = 0;
  const byAddendum = new Map<number, number>();
  for (const r of rows) {
    const n = Number.parseFloat(r.amount);
    if (!Number.isFinite(n)) continue;
    if (r.paymentType === 'AMENDMENT' && r.addendumNumber != null && r.addendumNumber >= 1) {
      byAddendum.set(r.addendumNumber, (byAddendum.get(r.addendumNumber) ?? 0) + n);
    } else {
      contractPaidRub += n;
    }
  }
  return { contractPaidRub, byAddendum };
}

export function addendumSlotHasData(slot: RepairAddendumSlotEstimateBlock | undefined): boolean {
  if (!slot) return false;
  const t = slot.snapshot?.total;
  if (typeof t === 'number' && Number.isFinite(t)) return true;
  return (
    (slot.selectedPresetIds?.length ?? 0) > 0 || (slot.excludedSelectedPresetIds?.length ?? 0) > 0
  );
}

/** Номера Д/с (1…5) с расчётами, которые ещё не отмечены как подписанные (после «Договор подписан»). */
export function getUnsignedAddendumOrdinals(
  form: RepairPackageFormData,
  packageFlowStatus: ContractDocumentPackageStatus
): number[] {
  if (packageFlowStatus !== 'CONTRACT_CONCLUDED') return [];
  const count = clampRepairAddendumSlotCount(form.addendumSlotCount);
  const ordinals: number[] = [];
  for (let i = 0; i < count; i++) {
    const slot = form.addendumSlots[i];
    if (addendumSlotHasData(slot) && slot?.status === 'OPEN') ordinals.push(i + 1);
  }
  return ordinals;
}

function paidPctRounded(paidRub: number, totalRub: number | null): number | null {
  if (totalRub == null || !Number.isFinite(totalRub) || totalRub <= 0) return null;
  const pct = (paidRub / totalRub) * 100;
  const treatAsFull = paidRub >= totalRub - REPAIR_PAYMENT_TOLERANCE_RUB;
  return treatAsFull ? 100 : Math.round(pct);
}

function isPaidAtLeastPct(paidRub: number, totalRub: number | null, minPct: number): boolean {
  if (totalRub == null || !Number.isFinite(totalRub) || totalRub <= 0) return false;
  return paidRub >= totalRub * (minPct / 100) - REPAIR_PAYMENT_TOLERANCE_RUB;
}

/** 100% оплачено: только при известной сумме > 0 и достаточной оплате (0% при пустой сумме — не «оплачено»). */
function isFullyPaidRub(paidRub: number, totalRub: number | null): boolean {
  if (totalRub == null || !Number.isFinite(totalRub) || totalRub <= 0) return false;
  return paidRub >= totalRub - REPAIR_PAYMENT_TOLERANCE_RUB;
}

function hasPositivePayableGrandTotal(
  breakdown: ReturnType<typeof computeRepairPackagePayableBreakdown>
): boolean {
  const gt = breakdown.grandTotalRub;
  return gt != null && Number.isFinite(gt) && gt > 0;
}

function repairWorkStartActComplete(form: RepairPackageFormData): boolean {
  return Boolean(
    form.repairWorkStartActSignedAt?.trim() && form.repairWorkStartActPhotoUrl?.trim()
  );
}

/**
 * Дата начала отсчёта срока по «Окнам»: день проводки в журнале, на которой сумма оплат
 * по договору (включая Д/с) достигла ≥70% от общей стоимости.
 */
export function inferWindowsPrepayment70StartDate(
  payments: ContractDocumentPackagePayment[] | undefined,
  grandTotalRub: number | null
): string | null {
  if (
    !payments?.length ||
    grandTotalRub == null ||
    !Number.isFinite(grandTotalRub) ||
    grandTotalRub <= 0
  ) {
    return null;
  }
  const threshold =
    grandTotalRub * (REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT / 100) - REPAIR_PAYMENT_TOLERANCE_RUB;
  const sorted = [...payments].sort((a, b) => {
    const da = (a.paymentDate ?? '').trim();
    const db = (b.paymentDate ?? '').trim();
    return da.localeCompare(db);
  });
  let cumulative = 0;
  for (const row of sorted) {
    const n = Number.parseFloat(row.amount);
    if (!Number.isFinite(n) || n <= 0) continue;
    cumulative += n;
    if (cumulative >= threshold) {
      const d = row.paymentDate?.trim();
      return d || null;
    }
  }
  return null;
}

function formatWindowsWorkStepDetail(input: {
  repairWorkStarted: boolean;
  workStartPaymentReady: boolean;
  grandPaidPct: number | null;
  workPeriodDays: string;
  workStartedAt: string;
  deadlineLabelRu?: string | null;
}): string {
  const {
    repairWorkStarted,
    workStartPaymentReady,
    grandPaidPct,
    workPeriodDays,
    workStartedAt,
    deadlineLabelRu,
  } = input;
  if (repairWorkStarted) {
    const days = workPeriodDays.trim() || '—';
    const startLabel = formatRepairPipelineActDate(workStartedAt) || '—';
    const deadlinePart = deadlineLabelRu ? ` Окончание срока: ${deadlineLabelRu}.` : '';
    return `Предоплата ≥${REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT}% получена. Отсчёт: ${days} раб. дн. с ${startLabel} (без выходных).${deadlinePart}`;
  }
  if (workStartPaymentReady) {
    return `Предоплата ≥${REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT}% получена — отсчёт срока начинается автоматически с даты этой оплаты`;
  }
  return `Предоплата ${grandPaidPct ?? 0}% (нужно ≥${REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT}% от суммы договора)`;
}

function closeActComplete(form: RepairPackageFormData): boolean {
  if (form.repairContractCloseActSignedAt?.trim() && form.repairContractCloseActPhotoUrl?.trim()) {
    return true;
  }
  const anyForm = form as unknown as Record<string, unknown>;
  return anyForm.repairContractClosed === true;
}

function computeContractSignedRevertRemainingMs(
  packageFlowStatus: ContractDocumentPackageStatus,
  contractConcludedAt: string | undefined,
  nowMs: number
): number {
  if (packageFlowStatus !== 'CONTRACT_CONCLUDED') return 0;
  const iso = contractConcludedAt?.trim();
  if (!iso) return 0;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return 0;
  return Math.max(0, ts + CONTRACT_SIGNED_REVERT_WINDOW_MS - nowMs);
}

function buildAddendumCards(
  form: RepairPackageFormData,
  allocations: RepairPaymentAllocations,
  payableBreakdown: ReturnType<typeof computeRepairPackagePayableBreakdown>,
  packageFlowStatus: ContractDocumentPackageStatus,
  nowMs: number
): RepairAddendumPipelineCard[] {
  const count = clampRepairAddendumSlotCount(form.addendumSlotCount);
  const cards: RepairAddendumPipelineCard[] = [];
  for (let i = 0; i < count; i++) {
    const slot = form.addendumSlots[i];
    if (!addendumSlotHasData(slot)) continue;
    const ordinal = i + 1;
    const totalRub =
      payableBreakdown.addendumTotalsRub.find((a) => a.slotIndex1 === ordinal)?.totalRub ?? null;
    const paidRub = allocations.byAddendum.get(ordinal) ?? 0;
    const hasAttachedPresets =
      (slot?.selectedPresetIds?.length ?? 0) > 0 ||
      (slot?.excludedSelectedPresetIds?.length ?? 0) > 0;
    const slotStatus = slot?.status ?? 'OPEN';
    const signedAt = slot?.signedAt ?? '';
    let signedRevertRemainingMs = 0;
    if (slotStatus === 'SIGNED' && signedAt.trim()) {
      const ts = Date.parse(signedAt.trim());
      if (Number.isFinite(ts)) {
        signedRevertRemainingMs = Math.max(0, ts + CONTRACT_SIGNED_REVERT_WINDOW_MS - nowMs);
      }
    }
    cards.push({
      slotIndex0: i,
      ordinal,
      hasData: true,
      slotStatus,
      totalRub,
      paidRub,
      paidPct: paidPctRounded(paidRub, totalRub),
      signedAt,
      hasAttachedPresets,
      canSign: packageFlowStatus === 'CONTRACT_CONCLUDED' && slotStatus === 'OPEN',
      canUnmarkSigned:
        slotStatus === 'SIGNED' && isWithinMsSinceIso(signedAt, CONTRACT_SIGNED_REVERT_WINDOW_MS),
      signedRevertRemainingMs,
    });
  }
  return cards;
}

function buildSteps(input: {
  packageKind: ContractDocumentPackageKind;
  packageFlowStatus: ContractDocumentPackageStatus;
  isRefused: boolean;
  hasAddendumsInPackage: boolean;
  allAddendumsSigned: boolean;
  contractPaidPct: number | null;
  grandPaidPct: number | null;
  allPaymentsComplete: boolean;
  repairWorkStarted: boolean;
  repairContractClosed: boolean;
  workStartPaymentReady: boolean;
  workStartActComplete: boolean;
  closeActComplete: boolean;
  windowsWorkStepDetail?: string;
}): { steps: RepairPipelineStepView[]; currentStepId: RepairPipelineStepId | 'refusal' } {
  const {
    packageKind,
    packageFlowStatus,
    isRefused,
    hasAddendumsInPackage,
    allAddendumsSigned,
    contractPaidPct,
    grandPaidPct,
    allPaymentsComplete,
    repairWorkStarted,
    repairContractClosed,
    workStartPaymentReady,
    workStartActComplete,
    closeActComplete,
    windowsWorkStepDetail,
  } = input;

  if (isRefused) {
    return {
      currentStepId: 'refusal',
      steps: [],
    };
  }

  const isWindows = packageKind === 'WINDOWS';
  const inProjectDone = packageFlowStatus === 'CONTRACT_CONCLUDED';
  const signedDone = inProjectDone;
  const addendumsDone = !hasAddendumsInPackage || (inProjectDone && allAddendumsSigned);
  const paymentsDetail =
    contractPaidPct != null
      ? isWindows
        ? `Оплата ${contractPaidPct}%${grandPaidPct != null ? ` · всего ${grandPaidPct}%` : ''}`
        : `Договор ${contractPaidPct}%${grandPaidPct != null ? ` · всего ${grandPaidPct}%` : ''}`
      : undefined;
  const workDetail = isWindows
    ? (windowsWorkStepDetail ??
      formatWindowsWorkStepDetail({
        repairWorkStarted,
        workStartPaymentReady,
        grandPaidPct,
        workPeriodDays: '',
        workStartedAt: '',
      }))
    : repairWorkStarted
      ? 'Работы начаты'
      : workStartActComplete
        ? `Акт есть, нужна оплата ≥${REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT}%`
        : workStartPaymentReady
          ? 'Можно подписать акт начала работ'
          : `Оплата по договору ${contractPaidPct ?? 0}% (нужно ≥${REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT}%)`;
  const closedDetail = repairContractClosed
    ? 'Договор закрыт'
    : closeActComplete
      ? allPaymentsComplete
        ? 'Акт сдачи-приёмки подписан'
        : hasAddendumsInPackage
          ? 'Нужна 100% оплата по договору и Д/с'
          : 'Нужна 100% оплата'
      : allPaymentsComplete
        ? 'Можно подписать акт сдачи-приёмки'
        : isWindows
          ? hasAddendumsInPackage
            ? 'Нужна 100% оплата (договор, спецификация, счёт-заказ и Д/с)'
            : 'Нужна 100% оплата (изделия и работы по договору)'
          : 'Нужна 100% оплата';

  type StepDef = {
    id: RepairPipelineStepId;
    label: string;
    done: boolean;
    skipped?: boolean;
    detail?: string;
  };

  const defs: StepDef[] = [
    { id: 'in_project', label: 'В проекте', done: inProjectDone },
    { id: 'signed', label: 'Подписан', done: signedDone },
    {
      id: 'addendums',
      label: 'Доп. соглашения',
      done: addendumsDone,
      skipped: !hasAddendumsInPackage,
      detail: hasAddendumsInPackage
        ? allAddendumsSigned
          ? 'Все Д/с подписаны'
          : 'Подпишите Д/с с расчётами'
        : undefined,
    },
    {
      id: 'payments',
      label: 'Оплаты',
      done: inProjectDone && addendumsDone && allPaymentsComplete,
      detail: !inProjectDone ? 'Доступно после подписания договора' : paymentsDetail,
    },
    {
      id: 'work',
      label: 'В работе',
      done: repairWorkStarted,
      detail: workDetail,
    },
    {
      id: 'closed',
      label: 'Закрыт',
      done: repairContractClosed,
      detail: closedDetail,
    },
  ];

  const visible = defs.filter((d) => !d.skipped);
  let currentStepId: RepairPipelineStepId = 'closed';
  for (const d of visible) {
    if (!d.done) {
      currentStepId = d.id;
      break;
    }
  }

  const steps: RepairPipelineStepView[] = visible.map((d) => {
    let state: RepairPipelineStepVisualState = 'upcoming';
    if (d.done) state = 'completed';
    else if (d.id === currentStepId) state = 'current';
    return {
      id: d.id,
      label: d.label,
      state,
      detail: d.detail,
    };
  });

  return { steps, currentStepId };
}

function deriveListPipelineStatus(input: {
  packageKind: ContractDocumentPackageKind;
  packageFlowStatus: ContractDocumentPackageStatus;
  isRefused: boolean;
  repairWorkStarted: boolean;
  repairContractClosed: boolean;
}): RepairListPipelineStatus {
  if (input.isRefused) return 'REFUSED';
  if (input.repairContractClosed) return 'CLOSED';
  if (input.packageFlowStatus === 'CONTRACT_CONCLUDED' && input.repairWorkStarted) {
    return 'WORK_IN_PROGRESS';
  }
  if (input.packageFlowStatus === 'CONTRACT_CONCLUDED') return 'SIGNED';
  return 'IN_PROJECT';
}

export function computeRepairPipelineModel(input: {
  packageKind?: ContractDocumentPackageKind;
  packageFlowStatus: ContractDocumentPackageStatus;
  form: RepairPackageFormData;
  payments?: ContractDocumentPackagePayment[];
  /** Если передан без строк журнала — сумма оплат одной цифрой (как в hub). */
  journalPaidRub?: number;
  nowMs?: number;
}): RepairPipelineModel {
  const packageKind = input.packageKind ?? 'REPAIR';
  const isWindows = packageKind === 'WINDOWS';
  const nowMs = input.nowMs ?? Date.now();
  const payableBreakdown = computePackagePayableBreakdown(input.form, packageKind);
  const allocations = input.payments
    ? computeRepairPaymentAllocations(input.payments)
    : { contractPaidRub: 0, byAddendum: new Map<number, number>() };

  const mainContractRub = payableBreakdown.mainContractRub;
  const contractPaidRub = allocations.contractPaidRub;
  const contractPaidPct = paidPctRounded(contractPaidRub, mainContractRub);
  const grandTotal = payableBreakdown.grandTotalRub;
  const journalTotal =
    input.journalPaidRub ??
    contractPaidRub + [...allocations.byAddendum.values()].reduce((a, b) => a + b, 0);
  const grandPaidPct = paidPctRounded(journalTotal, grandTotal);

  const addendumCards = buildAddendumCards(
    input.form,
    allocations,
    payableBreakdown,
    input.packageFlowStatus,
    nowMs
  );
  const hasAddendumsInPackage = addendumCards.length > 0;
  const allAddendumsSigned =
    !hasAddendumsInPackage ||
    addendumCards.every((c) => c.slotStatus === 'SIGNED' || c.slotStatus === 'PAID');

  const contractFullyPaid = isFullyPaidRub(contractPaidRub, mainContractRub);
  const allAddendumsFullyPaid = addendumCards.every((c) => isFullyPaidRub(c.paidRub, c.totalRub));
  const allPaymentsComplete =
    hasPositivePayableGrandTotal(payableBreakdown) &&
    contractFullyPaid &&
    (!hasAddendumsInPackage || allAddendumsFullyPaid);

  const workStartPaymentReady = isPaidAtLeastPct(
    journalTotal,
    grandTotal,
    REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT
  );
  const windowsWorkPeriodStartDate = isWindows
    ? inferWindowsPrepayment70StartDate(input.payments, grandTotal)
    : null;
  const windowsContractDeadline =
    isWindows && windowsWorkPeriodStartDate
      ? (() => {
          const deadline = computeContractDeadlineFromWorkPeriodStart(
            windowsWorkPeriodStartDate,
            input.form.contract.workPeriod
          );
          if (!deadline) return null;
          return {
            ...deadline,
            startLabelRu: formatRepairPipelineActDate(windowsWorkPeriodStartDate),
          };
        })()
      : null;
  const workStartActDone = isWindows
    ? workStartPaymentReady && Boolean(windowsWorkPeriodStartDate)
    : repairWorkStartActComplete(input.form);
  const closeActDone = closeActComplete(input.form);
  const repairWorkStarted = workStartPaymentReady && workStartActDone;
  const windowsWorkStepDetail = isWindows
    ? formatWindowsWorkStepDetail({
        repairWorkStarted,
        workStartPaymentReady,
        grandPaidPct,
        workPeriodDays: input.form.contract.workPeriod,
        workStartedAt:
          windowsWorkPeriodStartDate ?? input.form.repairWorkStartActSignedAt?.trim() ?? '',
        deadlineLabelRu: windowsContractDeadline?.labelRu ?? null,
      })
    : undefined;
  const repairContractClosed = allPaymentsComplete && closeActDone;

  const isRefused = input.packageFlowStatus === 'REFUSED';
  const { steps, currentStepId } = buildSteps({
    packageKind,
    packageFlowStatus: input.packageFlowStatus,
    isRefused,
    hasAddendumsInPackage,
    allAddendumsSigned,
    contractPaidPct,
    grandPaidPct,
    allPaymentsComplete,
    repairWorkStarted,
    repairContractClosed,
    workStartPaymentReady,
    workStartActComplete: workStartActDone,
    closeActComplete: closeActDone,
    windowsWorkStepDetail,
  });

  const contractSignedRevertRemainingMs = computeContractSignedRevertRemainingMs(
    input.packageFlowStatus,
    input.form.contractConcludedAt,
    nowMs
  );

  return {
    packageKind,
    packageFlowStatus: input.packageFlowStatus,
    isRefused,
    refusalReason: input.form.contractRefusalReason?.trim() ?? '',
    payableBreakdown,
    allocations,
    contractPaidPct,
    grandPaidPct,
    allPaymentsComplete,
    workStartPaymentReady,
    workStartActComplete: workStartActDone,
    closeActComplete: closeActDone,
    repairWorkStarted,
    repairContractClosed,
    hasAddendumsInPackage,
    addendumCards,
    allAddendumsSigned,
    windowsWorkPeriodStartDate,
    windowsContractDeadline,
    steps,
    currentStepId,
    listPipelineStatus: deriveListPipelineStatus({
      packageKind,
      packageFlowStatus: input.packageFlowStatus,
      isRefused,
      repairWorkStarted,
      repairContractClosed,
    }),
    contractSignedRevertRemainingMs,
    canRevertContractConcluded:
      input.packageFlowStatus === 'CONTRACT_CONCLUDED' &&
      isWithinMsSinceIso(input.form.contractConcludedAt, CONTRACT_SIGNED_REVERT_WINDOW_MS),
  };
}

/** Статус колонки списка договоров из сырого пакета API. */
export function repairListPipelineStatusFromPackage(
  pkg: Pick<ContractDocumentPackage, 'kind' | 'status' | 'formData' | 'payments'>
): RepairListPipelineStatus {
  const fd = (pkg.formData ?? {}) as Record<string, unknown>;
  if (pkg.status === 'REFUSED' || fd.repairContractClientRefused === true) return 'REFUSED';

  const form = mergeRepairPackageFormData(pkg.formData);
  const packageFlowStatus: ContractDocumentPackageStatus =
    pkg.status === 'CONTRACT_CONCLUDED' ? 'CONTRACT_CONCLUDED' : 'IN_PROGRESS';
  const packageKind = pkg.kind === 'WINDOWS' ? 'WINDOWS' : 'REPAIR';

  return computeRepairPipelineModel({
    packageKind,
    packageFlowStatus,
    form,
    payments: pkg.payments as ContractDocumentPackagePayment[] | undefined,
  }).listPipelineStatus;
}

export function repairListPipelineStatusLabel(st: RepairListPipelineStatus): string {
  switch (st) {
    case 'IN_PROJECT':
      return 'В проекте';
    case 'SIGNED':
      return 'Подписан';
    case 'WORK_IN_PROGRESS':
      return 'В работе';
    case 'CLOSED':
      return 'Закрыт';
    case 'REFUSED':
      return 'Отказ';
  }
}
