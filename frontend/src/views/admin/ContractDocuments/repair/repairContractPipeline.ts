import type {
  ContractDocumentPackage,
  ContractDocumentPackagePayment,
  ContractDocumentPackageStatus,
} from '@/shared/api/admin-contract-document-packages';

import { CONTRACT_SIGNED_REVERT_WINDOW_MS } from './repairContractPackageHubConstants';
import { isWithinMsSinceIso, isWithinRevertWindow } from './repairContractPackageHubUtils';
import type {
  RepairAddendumSlotEstimateBlock,
  RepairAddendumSlotStatus,
  RepairPackageFormData,
} from './repairPackageForm';
import { clampRepairAddendumSlotCount, mergeRepairPackageFormData } from './repairPackageForm';
import { computeRepairPackagePayableBreakdown } from './repairPackagePaymentTotals';

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
  /** Этап «В работе»: ≥70% по договору и акт начала работ. */
  repairWorkStarted: boolean;
  /** Этап «Закрыт»: 100% по договору и всем Д/с с данными + акт сдачи-приёмки. */
  repairContractClosed: boolean;
  hasAddendumsInPackage: boolean;
  addendumCards: RepairAddendumPipelineCard[];
  allAddendumsSigned: boolean;
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

function workStartActComplete(form: RepairPackageFormData): boolean {
  return Boolean(
    form.repairWorkStartActSignedAt?.trim() && form.repairWorkStartActPhotoUrl?.trim()
  );
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
}): { steps: RepairPipelineStepView[]; currentStepId: RepairPipelineStepId | 'refusal' } {
  const {
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
  } = input;

  if (isRefused) {
    return {
      currentStepId: 'refusal',
      steps: [],
    };
  }

  const inProjectDone = packageFlowStatus === 'CONTRACT_CONCLUDED';
  const signedDone = inProjectDone;
  const addendumsDone = !hasAddendumsInPackage || (inProjectDone && allAddendumsSigned);
  const paymentsDetail =
    contractPaidPct != null
      ? `Договор ${contractPaidPct}%${grandPaidPct != null ? ` · всего ${grandPaidPct}%` : ''}`
      : undefined;
  const workDetail = repairWorkStarted
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
        : 'Нужна 100% оплата по договору и Д/с'
      : allPaymentsComplete
        ? 'Можно подписать акт сдачи-приёмки'
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
  packageFlowStatus: ContractDocumentPackageStatus;
  form: RepairPackageFormData;
  payments?: ContractDocumentPackagePayment[];
  /** Если передан без строк журнала — сумма оплат одной цифрой (как в hub). */
  journalPaidRub?: number;
  nowMs?: number;
}): RepairPipelineModel {
  const nowMs = input.nowMs ?? Date.now();
  const payableBreakdown = computeRepairPackagePayableBreakdown(input.form);
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
    contractPaidRub,
    mainContractRub,
    REPAIR_WORK_START_MIN_CONTRACT_PAY_PCT
  );
  const workStartActDone = workStartActComplete(input.form);
  const closeActDone = closeActComplete(input.form);
  const repairWorkStarted = workStartPaymentReady && workStartActDone;
  const repairContractClosed = allPaymentsComplete && closeActDone;

  const isRefused = input.packageFlowStatus === 'REFUSED';
  const { steps, currentStepId } = buildSteps({
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
  });

  const contractSignedRevertRemainingMs = computeContractSignedRevertRemainingMs(
    input.packageFlowStatus,
    input.form.contractConcludedAt,
    nowMs
  );

  return {
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
    steps,
    currentStepId,
    listPipelineStatus: deriveListPipelineStatus({
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

/** Статус колонки списка договоров (ремонт) из сырого пакета API. */
export function repairListPipelineStatusFromPackage(
  pkg: Pick<ContractDocumentPackage, 'status' | 'formData' | 'payments'>
): RepairListPipelineStatus {
  const fd = (pkg.formData ?? {}) as Record<string, unknown>;
  if (pkg.status === 'REFUSED' || fd.repairContractClientRefused === true) return 'REFUSED';

  const form = mergeRepairPackageFormData(pkg.formData);
  const packageFlowStatus: ContractDocumentPackageStatus =
    pkg.status === 'CONTRACT_CONCLUDED' ? 'CONTRACT_CONCLUDED' : 'IN_PROGRESS';

  return computeRepairPipelineModel({
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
