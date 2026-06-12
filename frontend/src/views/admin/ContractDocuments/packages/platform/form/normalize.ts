import {
  normalizeProductAddendumSpecificationLines,
  windowsAddendumSlotHasSpecificationContent,
} from '../../families/product-like/addendum/addendumSpecification';
import {
  defaultAddendumSlots,
  defaultPackageFormData,
  defaultPackageManagerQuestionnaire1Block,
  defaultPackagePostWorkQuestionnaire2Block,
} from './defaults';
import { resolveExecutorBankFields } from './executorBankFields';
import type {
  PackageAddendumSlotEstimateBlock,
  PackageAddendumSlotStatus,
  PackageAddendumSlotsTuple,
  PackageCustomerBlock,
  PackageEstimateBlock,
  PackageFormData,
  PackageIssuedInvoice,
  PackageManagerQuestionnaire1Block,
  PackagePostWorkQuestionnaire2Block,
} from './types';

function normalizeIssuedInvoices(raw: unknown): PackageIssuedInvoice[] {
  if (!Array.isArray(raw)) return [];
  const out: PackageIssuedInvoice[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const number = typeof o.number === 'string' ? o.number.trim() : '';
    const date = typeof o.date === 'string' ? o.date.trim() : '';
    const amountRub = Number(o.amountRub);
    const basis = typeof o.basis === 'string' ? o.basis.trim() : '';
    const paymentType = o.paymentType;
    if (!id || !number || !date || !basis || !Number.isFinite(amountRub) || amountRub <= 0) {
      continue;
    }
    if (
      paymentType !== 'PREPAYMENT' &&
      paymentType !== 'ADVANCE' &&
      paymentType !== 'FINAL' &&
      paymentType !== 'AMENDMENT'
    ) {
      continue;
    }
    const row: PackageIssuedInvoice = {
      id,
      number,
      date,
      amountRub,
      basis,
      paymentType,
    };
    const addendumNumber = Number(o.addendumNumber);
    if (Number.isFinite(addendumNumber) && addendumNumber >= 1 && addendumNumber <= 5) {
      row.addendumNumber = addendumNumber;
    }
    out.push(row);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number));
}

export function normalizePackageCustomerBlock(
  raw: Partial<PackageCustomerBlock> | PackageCustomerBlock | undefined | null
): PackageCustomerBlock {
  const base = defaultPackageFormData().customer;
  if (!raw || typeof raw !== 'object') return base;
  const o = { ...base, ...raw } as PackageCustomerBlock & { phones?: unknown };

  let slots: string[] = [];
  if (Array.isArray(o.phones) && o.phones.length > 0) {
    slots = o.phones.map((x) => (typeof x === 'string' ? x : ''));
  } else if ((o.phone ?? '').trim()) {
    slots = [String(o.phone)];
  } else {
    slots = [''];
  }

  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const s of slots) {
    const t = s.trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      ordered.push(t);
    }
  }
  const hadTrailingBlank = slots.length > 0 && String(slots[slots.length - 1] ?? '').trim() === '';
  const phonesOut = ordered.length === 0 ? [''] : hadTrailingBlank ? [...ordered, ''] : ordered;
  const phoneOut = ordered[0] ?? '';

  return {
    ...o,
    phones: phonesOut,
    phone: phoneOut,
  };
}

function normalizeAddendumSlotStatus(raw: unknown): PackageAddendumSlotStatus {
  if (raw === 'PAID') return 'PAID';
  if (raw === 'SIGNED') return 'SIGNED';
  return 'OPEN';
}

function normalizeAddendumSlots(raw: unknown): PackageAddendumSlotsTuple {
  const base = defaultAddendumSlots();
  if (!Array.isArray(raw)) return base;
  const out = [...base] as PackageAddendumSlotEstimateBlock[];
  for (let i = 0; i < 5; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const ids = Array.isArray(o.selectedPresetIds)
      ? o.selectedPresetIds
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim())
      : [];
    const excludedIds = Array.isArray(o.excludedSelectedPresetIds)
      ? o.excludedSelectedPresetIds
          .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          .map((x) => x.trim())
      : [];
    let snapshot: PackageEstimateBlock['snapshot'] = null;
    if (o.snapshot && typeof o.snapshot === 'object' && !Array.isArray(o.snapshot)) {
      const s = o.snapshot as { total?: unknown; rooms?: unknown };
      if (typeof s.total === 'number' && Number.isFinite(s.total) && Array.isArray(s.rooms)) {
        snapshot = {
          total: s.total,
          rooms: s.rooms as NonNullable<PackageEstimateBlock['snapshot']>['rooms'],
        };
      }
    }
    let excludedSnapshot: PackageEstimateBlock['snapshot'] = null;
    if (
      o.excludedSnapshot &&
      typeof o.excludedSnapshot === 'object' &&
      !Array.isArray(o.excludedSnapshot)
    ) {
      const s = o.excludedSnapshot as { total?: unknown; rooms?: unknown };
      if (typeof s.total === 'number' && Number.isFinite(s.total) && Array.isArray(s.rooms)) {
        excludedSnapshot = {
          total: s.total,
          rooms: s.rooms as NonNullable<PackageEstimateBlock['snapshot']>['rooms'],
        };
      }
    }
    out[i] = {
      status: normalizeAddendumSlotStatus(o.status),
      signedAt: typeof o.signedAt === 'string' ? o.signedAt : '',
      paidAt: typeof o.paidAt === 'string' ? o.paidAt : '',
      workPeriodIncreaseDays:
        typeof o.workPeriodIncreaseDays === 'string' ? o.workPeriodIncreaseDays : '',
      selectedPresetIds: ids,
      snapshot,
      excludedSelectedPresetIds: excludedIds,
      excludedSnapshot,
      notes: typeof o.notes === 'string' ? o.notes : '',
      excludedNotes: typeof o.excludedNotes === 'string' ? o.excludedNotes : '',
      specificationAddedLines: normalizeProductAddendumSpecificationLines(
        o.specificationAddedLines
      ),
      specificationExcludedLines: normalizeProductAddendumSpecificationLines(
        o.specificationExcludedLines
      ),
    };
  }
  return out as PackageAddendumSlotsTuple;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function mergeDeep<T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = out[key];
    if (isPlainObject(pv) && isPlainObject(bv)) {
      out[key] = mergeDeep(bv as Record<string, unknown>, pv);
    } else if (pv !== undefined) {
      out[key] = pv;
    }
  }
  return out as T;
}

function normalizeManagerQuestionnaire1AfterLoad(
  mq: PackageManagerQuestionnaire1Block & { trafficSource?: string; whyChosenUs?: string }
): PackageManagerQuestionnaire1Block {
  const { trafficSource: legacyTrafficRaw, whyChosenUs: legacyWhyRaw, ...restUnknown } = mq;
  const legacyTraffic = typeof legacyTrafficRaw === 'string' ? legacyTrafficRaw.trim() : '';
  const legacyWhy = typeof legacyWhyRaw === 'string' ? legacyWhyRaw.trim() : '';

  const merged: PackageManagerQuestionnaire1Block = {
    ...defaultPackageManagerQuestionnaire1Block(),
    ...restUnknown,
    trafficSourceCheckedIds: Array.isArray(mq.trafficSourceCheckedIds)
      ? [...mq.trafficSourceCheckedIds]
      : [],
    trafficSourceRecommendationWho: mq.trafficSourceRecommendationWho ?? '',
    trafficSourcePreviousContractNumber: mq.trafficSourcePreviousContractNumber ?? '',
    trafficSourceOtherText: mq.trafficSourceOtherText ?? '',
    whyChosenCheckedIds: Array.isArray(mq.whyChosenCheckedIds) ? [...mq.whyChosenCheckedIds] : [],
    whyChosenRelativesWho: mq.whyChosenRelativesWho ?? '',
    whyChosenMasterContractOrAddress: mq.whyChosenMasterContractOrAddress ?? '',
    whyChosenManagerAdvisedName: mq.whyChosenManagerAdvisedName ?? '',
    whyChosenReviewSite: mq.whyChosenReviewSite ?? '',
    whyChosenOtherReason: mq.whyChosenOtherReason ?? '',
  };

  const hasNewTraffic =
    merged.trafficSourceCheckedIds.length > 0 ||
    merged.trafficSourceRecommendationWho.trim() !== '' ||
    merged.trafficSourcePreviousContractNumber.trim() !== '' ||
    merged.trafficSourceOtherText.trim() !== '';

  const hasNewWhy =
    merged.whyChosenCheckedIds.length > 0 ||
    merged.whyChosenRelativesWho.trim() !== '' ||
    merged.whyChosenMasterContractOrAddress.trim() !== '' ||
    merged.whyChosenManagerAdvisedName.trim() !== '' ||
    merged.whyChosenReviewSite.trim() !== '' ||
    merged.whyChosenOtherReason.trim() !== '';

  let out = merged;
  if (legacyTraffic && !hasNewTraffic) {
    out = {
      ...out,
      trafficSourceCheckedIds: ['traffic_other'],
      trafficSourceOtherText: legacyTraffic,
    };
  }
  if (legacyWhy && !hasNewWhy) {
    out = {
      ...out,
      whyChosenCheckedIds: ['why_other'],
      whyChosenOtherReason: legacyWhy,
    };
  }
  return out;
}

const ADDENDUM_DATE_SLOT_COUNT = 5;

function normalizeAddendumDocumentDates(raw: unknown): [string, string, string, string, string] {
  const empty: [string, string, string, string, string] = ['', '', '', '', ''];
  if (!Array.isArray(raw)) return empty;
  const out: string[] = [...empty];
  for (let i = 0; i < ADDENDUM_DATE_SLOT_COUNT; i++) {
    const v = raw[i];
    out[i] = typeof v === 'string' ? v : '';
  }
  return out as [string, string, string, string, string];
}

/** Сколько вкладок Д/с №1…№5 показано в редакторе пакета (0…5). */
export function clampPackageAddendumSlotCount(raw: unknown): number {
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

function _normalizeAddendumSlotCount(raw: unknown): number {
  return clampPackageAddendumSlotCount(raw);
}

/** Слот можно убрать кнопкой «− Д/с»: дата в шапке не считается заполнением. */
export function isPackageAddendumSlotRemovable(
  slot: PackageAddendumSlotEstimateBlock | undefined
): boolean {
  if (!slot) return true;
  if ((slot.workPeriodIncreaseDays ?? '').trim() !== '') return false;
  const hasSelected = (slot.selectedPresetIds?.length ?? 0) > 0;
  const hasExcluded = (slot.excludedSelectedPresetIds?.length ?? 0) > 0;
  const snapshotTotal = slot.snapshot?.total;
  const hasSnapshotTotal = typeof snapshotTotal === 'number' && Number.isFinite(snapshotTotal);
  const hasSnapshot = Boolean(slot.snapshot?.rooms?.length) || hasSnapshotTotal;
  const excludedTotal = slot.excludedSnapshot?.total;
  const hasExcludedSnapshotTotal =
    typeof excludedTotal === 'number' && Number.isFinite(excludedTotal);
  const hasExcludedSnapshot =
    Boolean(slot.excludedSnapshot?.rooms?.length) || hasExcludedSnapshotTotal;
  const hasNotes = (slot.notes ?? '').trim() !== '' || (slot.excludedNotes ?? '').trim() !== '';
  const hasSpec = windowsAddendumSlotHasSpecificationContent(slot);
  const isSigned =
    slot.status === 'SIGNED' || slot.status === 'PAID' || (slot.signedAt ?? '').trim() !== '';
  const isPaid = (slot.paidAt ?? '').trim() !== '';
  return !(
    hasSelected ||
    hasExcluded ||
    hasSnapshot ||
    hasExcludedSnapshot ||
    hasNotes ||
    hasSpec ||
    isSigned ||
    isPaid
  );
}

function isPackageAddendumSlotUnused(
  slot: PackageAddendumSlotEstimateBlock | undefined,
  documentDate: string | undefined
): boolean {
  if ((documentDate ?? '').trim() !== '') return false;
  return isPackageAddendumSlotRemovable(slot);
}

/** Дата в шапке Д/с: только для неподписанных слотов, если поле пустое. */
export function applyOpenAddendumDocumentDateAutofill(
  form: PackageFormData,
  todayDdMmYyyy: string
): { form: PackageFormData; changed: boolean } {
  const nextDates = [...form.addendumDocumentDates] as PackageFormData['addendumDocumentDates'];
  let changed = false;
  for (let i = 0; i < form.addendumSlotCount; i++) {
    const slot = form.addendumSlots[i];
    const status = slot?.status ?? 'OPEN';
    if (status === 'SIGNED' || status === 'PAID') continue;
    if (nextDates[i]?.trim()) continue;
    nextDates[i] = todayDdMmYyyy;
    changed = true;
  }
  if (!changed) return { form, changed: false };
  return { form: { ...form, addendumDocumentDates: nextDates }, changed: true };
}

export function isPackageAddendumSlotEditable(
  slot: PackageAddendumSlotEstimateBlock | undefined
): boolean {
  if (!slot) return true;
  return slot.status !== 'SIGNED' && slot.status !== 'PAID';
}

/** После загрузки: не показывать пустой хвост; не скрывать слот с данными. */
function resolvePackageAddendumSlotCountAfterLoad(
  storedCount: unknown,
  slots: PackageAddendumSlotsTuple,
  dates: [string, string, string, string, string]
): number {
  let count = clampPackageAddendumSlotCount(storedCount);

  let minFromData = 0;
  for (let i = 4; i >= 0; i--) {
    if (!isPackageAddendumSlotUnused(slots[i], dates[i])) {
      minFromData = i + 1;
      break;
    }
  }
  if (minFromData > count) count = minFromData;

  return count;
}

function normalizePostWorkQuestionnaire2AfterLoad(
  q: PackagePostWorkQuestionnaire2Block | undefined | null
): PackagePostWorkQuestionnaire2Block {
  const base = defaultPackagePostWorkQuestionnaire2Block();
  if (!q || typeof q !== 'object') return base;
  const rt: Partial<PackagePostWorkQuestionnaire2Block['ratingTrades']> =
    q.ratingTrades && typeof q.ratingTrades === 'object' ? q.ratingTrades : {};
  const ratingMasters =
    q.ratingMasters === 1 ||
    q.ratingMasters === 2 ||
    q.ratingMasters === 3 ||
    q.ratingMasters === 4 ||
    q.ratingMasters === 5
      ? q.ratingMasters
      : rt.windows === 1 ||
          rt.windows === 2 ||
          rt.windows === 3 ||
          rt.windows === 4 ||
          rt.windows === 5
        ? rt.windows
        : null;
  return {
    ...base,
    ...q,
    ratingMasters,
    ratingTrades: {
      ...base.ratingTrades,
      ...rt,
    },
  };
}

export function mergePackageFormData(raw: unknown): PackageFormData {
  const base = defaultPackageFormData();
  if (!isPlainObject(raw)) return base;
  const merged = mergeDeep(
    base as unknown as Record<string, unknown>,
    raw
  ) as unknown as PackageFormData;
  const mergedCustomer = normalizePackageCustomerBlock(merged.customer);
  const executorBank = resolveExecutorBankFields(merged.executor);
  const mergedExecutor = {
    ...merged.executor,
    bankName: merged.executor.bankName?.trim() || executorBank.bankName,
    bankBik: merged.executor.bankBik?.trim() || executorBank.bankBik,
    bankCorrAccount: merged.executor.bankCorrAccount?.trim() || executorBank.bankCorrAccount,
    bankSettlementAccount:
      merged.executor.bankSettlementAccount?.trim() || executorBank.bankSettlementAccount,
    bankDetails: merged.executor.bankDetails?.trim() || executorBank.bankDetailsComposed,
  };
  const addendumDocumentDates = normalizeAddendumDocumentDates(
    (merged as unknown as Record<string, unknown>).addendumDocumentDates
  );
  const addendumSlots = normalizeAddendumSlots(
    (merged as unknown as Record<string, unknown>).addendumSlots
  );
  const addendumSlotCount = resolvePackageAddendumSlotCountAfterLoad(
    (merged as unknown as Record<string, unknown>).addendumSlotCount,
    addendumSlots,
    addendumDocumentDates
  );
  return {
    ...merged,
    customer: mergedCustomer,
    executor: mergedExecutor,
    selectedRepairInstallerIds: Array.isArray(
      (merged as unknown as Record<string, unknown>).selectedRepairInstallerIds
    )
      ? (
          (merged as unknown as Record<string, unknown>).selectedRepairInstallerIds as unknown[]
        ).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      : [],
    finalEstimateInstallerAssignments: isPlainObject(
      (merged as unknown as Record<string, unknown>).finalEstimateInstallerAssignments
    )
      ? Object.fromEntries(
          Object.entries(
            (merged as unknown as Record<string, unknown>)
              .finalEstimateInstallerAssignments as Record<string, unknown>
          )
            .map(([key, value]) => [
              key.trim(),
              isPlainObject(value) ? String(value.installerId ?? '').trim() : '',
            ])
            .filter(([key, installerId]) => key.length > 0 && installerId.length > 0)
            .map(([key, installerId]) => [key, { installerId }])
        )
      : {},
    managerQuestionnaire1: normalizeManagerQuestionnaire1AfterLoad(
      merged.managerQuestionnaire1 as PackageManagerQuestionnaire1Block & {
        trafficSource?: string;
        whyChosenUs?: string;
      }
    ),
    postWorkQuestionnaire2: normalizePostWorkQuestionnaire2AfterLoad(merged.postWorkQuestionnaire2),
    addendumSlotCount,
    addendumDocumentDates,
    addendumSlots,
    contractPaidAt:
      typeof (merged as unknown as Record<string, unknown>).contractPaidAt === 'string'
        ? String((merged as unknown as Record<string, unknown>).contractPaidAt)
        : '',
    repairWorkStartActSignedAt:
      typeof (merged as unknown as Record<string, unknown>).repairWorkStartActSignedAt === 'string'
        ? String((merged as unknown as Record<string, unknown>).repairWorkStartActSignedAt)
        : '',
    repairWorkStartActPhotoUrl:
      typeof (merged as unknown as Record<string, unknown>).repairWorkStartActPhotoUrl === 'string'
        ? String((merged as unknown as Record<string, unknown>).repairWorkStartActPhotoUrl)
        : '',
    repairContractCloseActSignedAt:
      typeof (merged as unknown as Record<string, unknown>).repairContractCloseActSignedAt ===
      'string'
        ? String((merged as unknown as Record<string, unknown>).repairContractCloseActSignedAt)
        : '',
    repairContractCloseActPhotoUrl:
      typeof (merged as unknown as Record<string, unknown>).repairContractCloseActPhotoUrl ===
      'string'
        ? String((merged as unknown as Record<string, unknown>).repairContractCloseActPhotoUrl)
        : '',
    productSpecificationAmount: (() => {
      const rec = merged as unknown as Record<string, unknown>;
      if (typeof rec.productSpecificationAmount === 'string')
        return String(rec.productSpecificationAmount);
      if (typeof rec.windowsSpecificationAmount === 'string')
        return String(rec.windowsSpecificationAmount);
      return '';
    })(),
    productSpecificationFileUrl: (() => {
      const rec = merged as unknown as Record<string, unknown>;
      if (typeof rec.productSpecificationFileUrl === 'string')
        return String(rec.productSpecificationFileUrl);
      if (typeof rec.windowsSpecificationFileUrl === 'string')
        return String(rec.windowsSpecificationFileUrl);
      return '';
    })(),
    productSpecificationFileName: (() => {
      const rec = merged as unknown as Record<string, unknown>;
      if (typeof rec.productSpecificationFileName === 'string')
        return String(rec.productSpecificationFileName);
      if (typeof rec.windowsSpecificationFileName === 'string')
        return String(rec.windowsSpecificationFileName);
      return '';
    })(),
    estimateObjectGroupKey:
      typeof (merged as unknown as Record<string, unknown>).estimateObjectGroupKey === 'string'
        ? String((merged as unknown as Record<string, unknown>).estimateObjectGroupKey)
        : '',
    issuedInvoices: normalizeIssuedInvoices(
      (merged as unknown as Record<string, unknown>).issuedInvoices
    ),
  };
}
