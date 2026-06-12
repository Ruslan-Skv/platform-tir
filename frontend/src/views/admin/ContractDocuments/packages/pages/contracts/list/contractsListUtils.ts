import type {
  ContractDocumentPackage,
  ContractDocumentPackageKind,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmDirection, CrmUser, Measurement } from '@/shared/api/admin-crm';

import { CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS } from '../../../config/contractDocumentsListKinds';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { applyPackageContractDiscountToNullableBase } from '../../../platform/form/packageContractDiscount';
import { getDisplayContractNumber } from '../../../platform/form/packageContractDisplay';
import { type PackageFormData, mergePackageFormData } from '../../../platform/form/packageForm';
import {
  type PackageListPipelineStatus,
  packageListPipelineStatusFromPackage,
} from '../../../platform/hub/pipeline/packagePipeline';
import type { ContractsListSortBy, ContractsListSortOrder } from './contractsListSort';

export function formatContractsListActDate(raw: string): string {
  const t = raw.trim();
  if (!t) return '—';
  const d = /\d{4}-\d{2}-\d{2}/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Сколько осталось оплатить по базе (СД итог. или СД нач.); при неизвестной базе — null. */
export function contractsListRemainingToPayRub(
  baseTotalRub: number | null,
  paidRub: number
): number | null {
  if (baseTotalRub == null || Number.isNaN(baseTotalRub) || !Number.isFinite(baseTotalRub)) {
    return null;
  }
  return Math.max(0, baseTotalRub - paidRub);
}

export function sumPackagePaymentsRub(pkg: ContractDocumentPackage): number {
  let s = 0;
  for (const p of pkg.payments ?? []) {
    const n = parseAmountToNumber(p.amount);
    if (n != null) s += n;
  }
  return s;
}

function parseAmountToNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function contractsListHasAttachedEstimate(fd: Record<string, unknown>): boolean {
  const e = asObj(fd.estimate);
  if (!e) return false;
  if (typeof e.selectedPresetId === 'string' && e.selectedPresetId.trim()) return true;
  if (Array.isArray(e.selectedPresetIds)) {
    return e.selectedPresetIds.some(
      (x) => typeof x === 'string' && (x as string).trim().length > 0
    );
  }
  return false;
}

/** Сумма по снимку сметы (поле total или сумма строк), затем скидка по договору. */
export function contractsListSnapshotTotalAfterDiscountRub(
  snapRaw: unknown,
  discountPercentRaw: string
): number | null {
  if (!snapRaw || typeof snapRaw !== 'object' || Array.isArray(snapRaw)) return null;
  const snap = snapRaw as Record<string, unknown>;
  let base: number | null = null;
  if (typeof snap.total === 'number' && Number.isFinite(snap.total)) {
    base = snap.total;
  } else if (Array.isArray(snap.rooms)) {
    let sum = 0;
    for (const room of snap.rooms) {
      const r = asObj(room);
      if (!Array.isArray(r?.lines)) continue;
      for (const line of r.lines) {
        const l = asObj(line);
        if (!l) continue;
        const amt = typeof l.amount === 'number' ? l.amount : Number(l.amount);
        if (Number.isFinite(amt)) sum += amt;
      }
    }
    base = sum;
  }
  if (base == null || !Number.isFinite(base)) return null;
  return applyPackageContractDiscountToNullableBase(base, discountPercentRaw);
}

/** Стоимость в списке — только из прикреплённой сметы (снимок), с учётом скидки по договору. */
export function contractsListContractTotalAmount(fd: Record<string, unknown>): number | null {
  if (!contractsListHasAttachedEstimate(fd)) return null;
  const est = asObj(fd.estimate);
  const c = asObj(fd.contract);
  return contractsListSnapshotTotalAfterDiscountRub(
    est?.snapshot,
    String(c?.discountPercent ?? '')
  );
}

/** Статусы вкладки Д/с после подписания (в интерфейсе: «Д/с подписано» / «Д/с оплачено»). */
export function contractsListIsAddendumSignedLikeStatus(
  status: string | undefined
): status is 'SIGNED' | 'PAID' {
  return status === 'SIGNED' || status === 'PAID';
}

/** Максимальный номер слота Д/с (1…5), у которого хотя бы в одном пакете статус подписано/оплачено. */
export function contractsListMaxSignedAddendumSlotCount(
  packages: ContractDocumentPackage[]
): number {
  let max = 0;
  for (const pkg of packages) {
    const form = mergePackageFormData(pkg.formData);
    for (let i = 0; i < 5; i++) {
      const st = form.addendumSlots[i]?.status;
      if (contractsListIsAddendumSignedLikeStatus(st)) {
        max = Math.max(max, i + 1);
      }
    }
  }
  return max;
}

export function contractsListSignedAddendumRub(
  form: PackageFormData,
  slotIndex0: number
): number | null {
  const slot = form.addendumSlots[slotIndex0];
  if (!slot || !contractsListIsAddendumSignedLikeStatus(slot.status)) return null;
  return contractsListSnapshotTotalAfterDiscountRub(
    slot.snapshot,
    String(form.contract.discountPercent ?? '')
  );
}

function contractsListSignedAddendaSumRub(form: PackageFormData, addendumColumnCount: number) {
  let sum = 0;
  for (let i = 0; i < addendumColumnCount; i++) {
    const v = contractsListSignedAddendumRub(form, i);
    if (v != null) sum += v;
  }
  return sum;
}

/** «СД итог.» = «СД нач.» + суммы подписанных Д/с по колонкам таблицы. */
export function contractsListContractAndSignedAddendaTotalRub(
  form: PackageFormData,
  mainRub: number | null,
  addendumColumnCount: number
): number | null {
  if (mainRub == null) return null;
  return mainRub + contractsListSignedAddendaSumRub(form, addendumColumnCount);
}

export function contractsListCustomerName(fd: Record<string, unknown>): string {
  const c = asObj(fd.customer);
  if (!c) return '—';
  const type = c.type;
  if (type === 'COMPANY' || type === 'ENTREPRENEUR') {
    const org = String(c.organizationName ?? '').trim();
    return org || '—';
  }
  return String(c.fullName ?? '').trim() || '—';
}

export function contractsListObjectAddress(fd: Record<string, unknown>): string {
  const o = asObj(fd.object);
  return String(o?.objectAddress ?? '').trim() || '—';
}

export function contractsListWorkDescription(fd: Record<string, unknown>): string {
  const o = asObj(fd.object);
  const objDesc = String(o?.objectDescription ?? '').trim();
  if (objDesc) return objDesc;
  const q = asObj(fd.managerQuestionnaire1);
  return String(q?.orderInfo ?? '').trim() || '—';
}

function formatCrmUserName(u: CrmUser | undefined): string {
  if (!u) return '';
  const parts = [u.firstName, u.lastName].filter(Boolean);
  return parts.length ? parts.join(' ') : (u.email ?? '');
}

export function contractsListManagerCrmUserId(form: PackageFormData): string {
  return form.executor.signatoryCrmUserId?.trim() ?? '';
}

/** Подпись в списке: ФИО из формы, иначе из CRM, иначе название карточки. */
export function contractsListManagerDisplayLabel(
  form: PackageFormData,
  crmUsers: CrmUser[]
): string {
  const nom = form.executor.directorNameNominative?.trim();
  if (nom) return nom;
  const id = contractsListManagerCrmUserId(form);
  if (id) {
    const u = crmUsers.find((x) => x.id === id);
    const n = formatCrmUserName(u);
    if (n) return n;
    return id;
  }
  const title = form.executor.selectedSignatoryProfileTitle?.trim();
  if (title) return title;
  return '—';
}

const PACKAGE_KIND_DIRECTION_SLUG: Record<ContractDocumentPackageKind, string> = {
  REPAIR: 'repair',
  WINDOWS: 'windows',
  DOORS: 'doors',
  CEILINGS: 'stretch-ceilings',
  BLINDS: 'blinds',
  FURNITURE: 'furniture',
};

function contractsListAttachedPresetIds(fd: Record<string, unknown>): string[] {
  const est = asObj(fd.estimate);
  if (!est) return [];
  const ids: string[] = [];
  if (typeof est.selectedPresetId === 'string' && est.selectedPresetId.trim()) {
    ids.push(est.selectedPresetId.trim());
  }
  if (Array.isArray(est.selectedPresetIds)) {
    for (const x of est.selectedPresetIds) {
      if (typeof x === 'string' && x.trim()) ids.push(x.trim());
    }
  }
  return ids;
}

export function contractsListPackageDirectionIds(
  pkg: ContractDocumentPackage,
  directions: CrmDirection[],
  presetById: Map<string, ContractEstimatePreset>,
  measurementById: Map<string, Measurement>
): string[] {
  const out = new Set<string>();
  const slug = PACKAGE_KIND_DIRECTION_SLUG[pkg.kind];
  const fromKind = directions.find((d) => d.slug === slug);
  if (fromKind) out.add(fromKind.id);

  const fd = (pkg.formData ?? {}) as Record<string, unknown>;
  for (const presetId of contractsListAttachedPresetIds(fd)) {
    const preset = presetById.get(presetId);
    const mid = preset?.sourceMeasurementId?.trim();
    if (!mid) continue;
    const m = measurementById.get(mid);
    if (!m) continue;
    if (m.directionId) out.add(m.directionId);
    for (const aid of m.additionalDirectionIds ?? []) {
      if (aid) out.add(aid);
    }
  }
  return [...out];
}

/** ISO-дата подписания договора (`contractConcludedAt`). */
export function contractsListContractSigningDateIso(pkg: ContractDocumentPackage): string {
  const fd = pkg.formData ?? {};
  const topLevel = typeof fd.contractConcludedAt === 'string' ? fd.contractConcludedAt.trim() : '';
  if (topLevel) return topLevel;
  return mergePackageFormData(fd).contractConcludedAt?.trim() ?? '';
}

function contractsListIsoToFilterDay(iso: string): string | null {
  const t = iso.trim();
  if (!t) return null;
  const d = /\d{4}-\d{2}-\d{2}/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Дни для фильтра «Дата от / до»: колонки Дата, Акт нр, Акт с/п. */
function contractsListFilterDateDays(pkg: ContractDocumentPackage): string[] {
  const form = mergePackageFormData(pkg.formData ?? {});
  const days: string[] = [];
  const signing = contractsListIsoToFilterDay(contractsListContractSigningDateIso(pkg));
  if (signing) days.push(signing);
  const workStart = contractsListIsoToFilterDay(form.repairWorkStartActSignedAt ?? '');
  if (workStart) days.push(workStart);
  const closeAct = contractsListIsoToFilterDay(form.repairContractCloseActSignedAt ?? '');
  if (closeAct) days.push(closeAct);
  return days;
}

function contractsListDayInDateRange(day: string, dateFrom: string, dateTo: string): boolean {
  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;
  return true;
}

/** Строка попадает в фильтр, если хотя бы одна из дат (Дата / Акт нр / Акт с/п) в диапазоне. */
export function contractsListMatchesDateRange(
  pkg: ContractDocumentPackage,
  dateFrom: string,
  dateTo: string
): boolean {
  const days = contractsListFilterDateDays(pkg);
  if (days.length === 0) return false;
  return days.some((day) => contractsListDayInDateRange(day, dateFrom, dateTo));
}

export function normalizeContractsListSearch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function contractsListMatchesSearch(
  pkg: ContractDocumentPackage,
  searchNorm: string
): boolean {
  if (!searchNorm) return true;
  const fd = (pkg.formData ?? {}) as Record<string, unknown>;
  const num = getDisplayContractNumber({ formData: fd });
  const haystack = normalizeContractsListSearch(
    [num, contractsListCustomerName(fd), contractsListObjectAddress(fd)].join(' ')
  );
  return haystack.includes(searchNorm);
}

/** Колонка «Дата» — только дата подписания договора. */
export function formatSigningDateOnly(r: ContractDocumentPackage): string {
  const iso = contractsListContractSigningDateIso(r);
  if (!iso) return '—';
  return formatContractsListActDate(iso);
}

/** Статус для фильтра и колонки: «Ремонт» и «Окна» — полный конвейер, прочие — упрощённо. */
export function contractsListPipelineStatus(
  pkg: ContractDocumentPackage
): PackageListPipelineStatus {
  if (pkg.kind === 'REPAIR' || isProductDirectionPackageKind(pkg.kind)) {
    return packageListPipelineStatusFromPackage(pkg);
  }
  if (pkg.status === 'REFUSED') return 'REFUSED';
  if (pkg.status === 'CONTRACT_CONCLUDED') return 'SIGNED';
  return 'IN_PROJECT';
}

/** Удаление: нельзя при оплатах или при прикреплённой смете (основной договор). */
export function isPackageDraftDeletionAllowed(pkg: ContractDocumentPackage): boolean {
  const paymentCount = pkg.payments?.length ?? 0;
  if (paymentCount > 0) return false;
  const fd = (pkg.formData ?? {}) as Record<string, unknown>;
  if (contractsListHasAttachedEstimate(fd)) return false;
  return true;
}

const PACKAGE_LIST_PIPELINE_STATUS_ORDER: Record<PackageListPipelineStatus, number> = {
  IN_PROJECT: 0,
  SIGNED: 1,
  WORK_IN_PROGRESS: 2,
  CLOSED: 3,
  REFUSED: 4,
};

function contractsListSigningDateMs(pkg: ContractDocumentPackage): number | null {
  const iso = contractsListContractSigningDateIso(pkg);
  if (!iso) return null;
  const d = /\d{4}-\d{2}-\d{2}/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function contractsListActSignedAtMs(isoRaw: string | undefined): number | null {
  const iso = isoRaw?.trim();
  if (!iso) return null;
  const d = /\d{4}-\d{2}-\d{2}/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function contractsListWorkStartActDateMs(pkg: ContractDocumentPackage): number | null {
  const form = mergePackageFormData(pkg.formData ?? {});
  return contractsListActSignedAtMs(form.repairWorkStartActSignedAt);
}

function contractsListCloseActDateMs(pkg: ContractDocumentPackage): number | null {
  const form = mergePackageFormData(pkg.formData ?? {});
  return contractsListActSignedAtMs(form.repairContractCloseActSignedAt);
}

export function contractsListPackageKindLabel(kind: ContractDocumentPackageKind): string {
  return CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS[kind] ?? kind;
}

export type ContractsListObjectRowMoneyAggregate = {
  totalRub: number | null;
  totalWithAddendaRub: number | null;
  paidRub: number;
  remainingRub: number | null;
};

export function aggregateContractsListPackagesMoney(
  packages: ContractDocumentPackage[],
  addendumColumnCount: number
): ContractsListObjectRowMoneyAggregate {
  let paidRub = 0;
  let totalSum: number | null = null;
  let totalWithAddendaSum: number | null = null;
  let remainingSum: number | null = null;
  for (const pkg of packages) {
    const fd = pkg.formData ?? {};
    const form = mergePackageFormData(fd);
    const paid = sumPackagePaymentsRub(pkg);
    paidRub += paid;
    const totalRub = contractsListContractTotalAmount(fd);
    const totalWithAddendaRub = contractsListContractAndSignedAddendaTotalRub(
      form,
      totalRub,
      addendumColumnCount
    );
    const paymentBaseRub = addendumColumnCount > 0 ? totalWithAddendaRub : totalRub;
    const rem = contractsListRemainingToPayRub(paymentBaseRub, paid);
    if (totalRub != null) totalSum = (totalSum ?? 0) + totalRub;
    if (totalWithAddendaRub != null) {
      totalWithAddendaSum = (totalWithAddendaSum ?? 0) + totalWithAddendaRub;
    }
    if (rem != null) remainingSum = (remainingSum ?? 0) + rem;
  }
  return {
    totalRub: totalSum,
    totalWithAddendaRub: totalWithAddendaSum,
    paidRub,
    remainingRub: remainingSum,
  };
}

function contractsListRowRemainingRub(
  pkg: ContractDocumentPackage,
  addendumColumnCount: number
): number | null {
  const fd = pkg.formData ?? {};
  const form = mergePackageFormData(fd);
  const paidRub = sumPackagePaymentsRub(pkg);
  const totalRub = contractsListContractTotalAmount(fd);
  const totalWithAddendaRub = contractsListContractAndSignedAddendaTotalRub(
    form,
    totalRub,
    addendumColumnCount
  );
  const paymentBaseRub = addendumColumnCount > 0 ? totalWithAddendaRub : totalRub;
  return contractsListRemainingToPayRub(paymentBaseRub, paidRub);
}

function contractsListCompareNullableNumber(
  a: number | null,
  b: number | null,
  sortOrder: ContractsListSortOrder
): number {
  if (a == null && b == null) return 0;
  if (a == null) return sortOrder === 'asc' ? 1 : -1;
  if (b == null) return sortOrder === 'asc' ? -1 : 1;
  const diff = a - b;
  return sortOrder === 'asc' ? diff : -diff;
}

export function compareContractsListStrings(
  a: string,
  b: string,
  sortOrder: ContractsListSortOrder
): number {
  const diff = a.localeCompare(b, 'ru', { sensitivity: 'base', numeric: true });
  return sortOrder === 'asc' ? diff : -diff;
}

export function compareContractListRows(
  a: ContractDocumentPackage,
  b: ContractDocumentPackage,
  sortBy: ContractsListSortBy,
  sortOrder: ContractsListSortOrder,
  crmUsers: CrmUser[],
  addendumColumnCount: number
): number {
  switch (sortBy) {
    case 'contractNumber': {
      const na = getDisplayContractNumber({
        formData: (a.formData ?? {}) as Record<string, unknown>,
      });
      const nb = getDisplayContractNumber({
        formData: (b.formData ?? {}) as Record<string, unknown>,
      });
      return compareContractsListStrings(String(na), String(nb), sortOrder);
    }
    case 'date':
      return contractsListCompareNullableNumber(
        contractsListSigningDateMs(a),
        contractsListSigningDateMs(b),
        sortOrder
      );
    case 'status': {
      const oa = PACKAGE_LIST_PIPELINE_STATUS_ORDER[contractsListPipelineStatus(a)];
      const ob = PACKAGE_LIST_PIPELINE_STATUS_ORDER[contractsListPipelineStatus(b)];
      const diff = oa - ob;
      return sortOrder === 'asc' ? diff : -diff;
    }
    case 'customer': {
      const fa = (a.formData ?? {}) as Record<string, unknown>;
      const fb = (b.formData ?? {}) as Record<string, unknown>;
      return compareContractsListStrings(
        contractsListCustomerName(fa),
        contractsListCustomerName(fb),
        sortOrder
      );
    }
    case 'manager': {
      const la = contractsListManagerDisplayLabel(mergePackageFormData(a.formData ?? {}), crmUsers);
      const lb = contractsListManagerDisplayLabel(mergePackageFormData(b.formData ?? {}), crmUsers);
      return compareContractsListStrings(la, lb, sortOrder);
    }
    case 'remaining':
      return contractsListCompareNullableNumber(
        contractsListRowRemainingRub(a, addendumColumnCount),
        contractsListRowRemainingRub(b, addendumColumnCount),
        sortOrder
      );
    case 'workStartAct':
      return contractsListCompareNullableNumber(
        contractsListWorkStartActDateMs(a),
        contractsListWorkStartActDateMs(b),
        sortOrder
      );
    case 'closeAct':
      return contractsListCompareNullableNumber(
        contractsListCloseActDateMs(a),
        contractsListCloseActDateMs(b),
        sortOrder
      );
    default:
      return 0;
  }
}
