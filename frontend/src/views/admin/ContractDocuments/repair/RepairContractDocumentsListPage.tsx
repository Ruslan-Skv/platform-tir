'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type ContractDocumentObject,
  autoSyncContractDocumentObjects,
  getContractDocumentObjects,
} from '@/shared/api/admin-contract-document-objects';
import {
  type ContractDocumentPackage,
  type ContractDocumentPackageKind,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  createContractDocumentPackage,
  getContractDocumentEstimatePresets,
  getContractDocumentPackage,
  getContractDocumentPackages,
  getContractDocumentSignatoryProfiles,
  getRepairContractPackageTrash,
  trashContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';
import {
  type CrmDirection,
  type CrmUser,
  type Measurement,
  getCrmDirections,
  getCrmUsers,
  getMeasurements,
} from '@/shared/api/admin-crm';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { AdminTablePagination } from '@/shared/ui/admin/AdminTablePagination';
import {
  AdminListRefreshButton,
  AdminToolbarTrashButton,
  useAdminTrashCount,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import { CopyIcon } from '@/shared/ui/icons/CopyIcon';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import { adminContractDocumentsContractsRepairPackageHref } from '@/views/admin/ContractDocuments/contractDocumentsContractsRoutes';

import styles from '../ContractDocuments.module.css';
import { CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS } from '../contractDocumentsListKinds';
import { RepairContractPackageHubIcon } from './RepairContractPackageHubIcon';
import { RepairContractPackageHubModal } from './RepairContractPackageHubModal';
import { RepairContractTrashModal } from './RepairContractTrashModal';
import { RepairContractWorkOrdersHubIcon } from './RepairContractWorkOrdersHubIcon';
import { RepairContractWorkOrdersHubListModal } from './RepairContractWorkOrdersHubListModal';
import { buildFormDataForRepairPackageCopy } from './cloneRepairPackageFormDataForCopy';
import {
  REPAIR_COPY_CONTRACT_NUMBER_BASELINE_KEY,
  getDisplayContractNumber,
} from './packageContractDisplay';
import { applyRepairContractDiscountToNullableBase } from './repairContractDiscount';
import { REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE } from './repairContractPackageHubConstants';
import {
  type RepairListPipelineStatus,
  repairListPipelineStatusFromPackage,
  repairListPipelineStatusLabel,
} from './repairContractPipeline';
import {
  type ContractsListViewMode,
  REPAIR_CONTRACTS_PAGE_LIMIT_OPTIONS,
  type RepairContractsPageLimit,
  loadRepairContractsListFilters,
  persistRepairContractsListFilters,
  reloadRepairContractsListFiltersFromStorage,
} from './repairContractsListFilters';
import {
  type RepairContractsListSortBy,
  type RepairContractsListSortOrder,
} from './repairContractsListSort';
import { type RepairPackageFormData, mergeRepairPackageFormData } from './repairPackageForm';
import { formatRepairWorkOrderHubModalTitle } from './repairWorkOrderHubTabs';

type RepairListActPhotoItem = {
  key: string;
  title: string;
  dateLabel: string;
  src: string;
};

function formatRepairListActDate(raw: string): string {
  const t = raw.trim();
  if (!t) return '—';
  const d = /\d{4}-\d{2}-\d{2}/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Дата акта начала работ для колонки «Акт нр». */
function repairListWorkStartActDateCell(form: RepairPackageFormData): string {
  const signedAt = form.repairWorkStartActSignedAt?.trim();
  if (!signedAt) return '—';
  return formatRepairListActDate(signedAt);
}

/** Дата акта сдачи-приёмки для колонки «Акт с/п». */
function repairListContractCloseActDateCell(form: RepairPackageFormData): string {
  const signedAt = form.repairContractCloseActSignedAt?.trim();
  if (!signedAt) return '—';
  return formatRepairListActDate(signedAt);
}

function repairListAttachedActPhotosFromForm(
  form: RepairPackageFormData
): RepairListActPhotoItem[] {
  const items: RepairListActPhotoItem[] = [];
  const workPhoto = form.repairWorkStartActPhotoUrl?.trim();
  if (workPhoto) {
    items.push({
      key: 'work-start',
      title: 'Акт начала работ',
      dateLabel: formatRepairListActDate(form.repairWorkStartActSignedAt ?? ''),
      src: publicUploadUrl(workPhoto),
    });
  }
  const closePhoto = form.repairContractCloseActPhotoUrl?.trim();
  if (closePhoto) {
    items.push({
      key: 'contract-close',
      title: 'Акт сдачи-приёмки (закрытие договора)',
      dateLabel: formatRepairListActDate(form.repairContractCloseActSignedAt ?? ''),
      src: publicUploadUrl(closePhoto),
    });
  }
  return items;
}

/** Иконка «фото актов» в списке договоров (как в редакторе, 14×14). */
function RepairListActPhotosTriggerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width={18} height={18} x={3} y={3} rx={2} ry={2} />
      <circle cx={8.5} cy={8.5} r={1.5} />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

const listMoneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

function parseAmountToNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatListMoney(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return listMoneyFormatter.format(n);
}

const listPercentFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

/** Оплаты в руб. и доля от базы (СД итог. или СД нач., если колонок Д/с нет). */
function formatListPaidWithPercent(paidRub: number, baseTotalRub: number | null): string {
  const money = formatListMoney(paidRub);
  if (
    baseTotalRub == null ||
    Number.isNaN(baseTotalRub) ||
    !Number.isFinite(baseTotalRub) ||
    baseTotalRub <= 0
  ) {
    return money;
  }
  const pct = (paidRub / baseTotalRub) * 100;
  const pctStr = listPercentFormatter.format(pct);
  return `${money} (${pctStr}%)`;
}

/** Сколько осталось оплатить по базе (СД итог. или СД нач.); при неизвестной базе — null. */
function repairListRemainingToPayRub(baseTotalRub: number | null, paidRub: number): number | null {
  if (baseTotalRub == null || Number.isNaN(baseTotalRub) || !Number.isFinite(baseTotalRub)) {
    return null;
  }
  return Math.max(0, baseTotalRub - paidRub);
}

function sumPackagePaymentsRub(pkg: ContractDocumentPackage): number {
  let s = 0;
  for (const p of pkg.payments ?? []) {
    const n = parseAmountToNumber(p.amount);
    if (n != null) s += n;
  }
  return s;
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function repairListHasAttachedEstimate(fd: Record<string, unknown>): boolean {
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
function repairListSnapshotTotalAfterDiscountRub(
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
  return applyRepairContractDiscountToNullableBase(base, discountPercentRaw);
}

/** Стоимость в списке — только из прикреплённой сметы (снимок), с учётом скидки по договору. */
function repairListContractTotalAmount(fd: Record<string, unknown>): number | null {
  if (!repairListHasAttachedEstimate(fd)) return null;
  const est = asObj(fd.estimate);
  const c = asObj(fd.contract);
  return repairListSnapshotTotalAfterDiscountRub(est?.snapshot, String(c?.discountPercent ?? ''));
}

/** Статусы вкладки Д/с после подписания (в интерфейсе: «Д/с подписано» / «Д/с оплачено»). */
function repairListIsAddendumSignedLikeStatus(
  status: string | undefined
): status is 'SIGNED' | 'PAID' {
  return status === 'SIGNED' || status === 'PAID';
}

/** Максимальный номер слота Д/с (1…5), у которого хотя бы в одном пакете статус подписано/оплачено. */
function repairListMaxSignedAddendumSlotCount(packages: ContractDocumentPackage[]): number {
  let max = 0;
  for (const pkg of packages) {
    const form = mergeRepairPackageFormData(pkg.formData);
    for (let i = 0; i < 5; i++) {
      const st = form.addendumSlots[i]?.status;
      if (repairListIsAddendumSignedLikeStatus(st)) {
        max = Math.max(max, i + 1);
      }
    }
  }
  return max;
}

function repairListSignedAddendumRub(
  form: RepairPackageFormData,
  slotIndex0: number
): number | null {
  const slot = form.addendumSlots[slotIndex0];
  if (!slot || !repairListIsAddendumSignedLikeStatus(slot.status)) return null;
  return repairListSnapshotTotalAfterDiscountRub(
    slot.snapshot,
    String(form.contract.discountPercent ?? '')
  );
}

function repairListSignedAddendaSumRub(form: RepairPackageFormData, addendumColumnCount: number) {
  let sum = 0;
  for (let i = 0; i < addendumColumnCount; i++) {
    const v = repairListSignedAddendumRub(form, i);
    if (v != null) sum += v;
  }
  return sum;
}

/** «СД итог.» = «СД нач.» + суммы подписанных Д/с по колонкам таблицы. */
function repairListContractAndSignedAddendaTotalRub(
  form: RepairPackageFormData,
  mainRub: number | null,
  addendumColumnCount: number
): number | null {
  if (mainRub == null) return null;
  return mainRub + repairListSignedAddendaSumRub(form, addendumColumnCount);
}

function repairListCustomerName(fd: Record<string, unknown>): string {
  const c = asObj(fd.customer);
  if (!c) return '—';
  const type = c.type;
  if (type === 'COMPANY' || type === 'ENTREPRENEUR') {
    const org = String(c.organizationName ?? '').trim();
    return org || '—';
  }
  return String(c.fullName ?? '').trim() || '—';
}

function repairListObjectAddress(fd: Record<string, unknown>): string {
  const o = asObj(fd.object);
  return String(o?.objectAddress ?? '').trim() || '—';
}

function repairListWorkDescription(fd: Record<string, unknown>): string {
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

function repairListManagerCrmUserId(form: RepairPackageFormData): string {
  return form.executor.signatoryCrmUserId?.trim() ?? '';
}

/** Подпись в списке: ФИО из формы, иначе из CRM, иначе название карточки. */
function repairListManagerDisplayLabel(form: RepairPackageFormData, crmUsers: CrmUser[]): string {
  const nom = form.executor.directorNameNominative?.trim();
  if (nom) return nom;
  const id = repairListManagerCrmUserId(form);
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

function repairListAttachedPresetIds(fd: Record<string, unknown>): string[] {
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

function repairListPackageDirectionIds(
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
  for (const presetId of repairListAttachedPresetIds(fd)) {
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
function repairListContractSigningDateIso(pkg: ContractDocumentPackage): string {
  const fd = pkg.formData ?? {};
  const topLevel = typeof fd.contractConcludedAt === 'string' ? fd.contractConcludedAt.trim() : '';
  if (topLevel) return topLevel;
  return mergeRepairPackageFormData(fd).contractConcludedAt?.trim() ?? '';
}

function repairListIsoToFilterDay(iso: string): string | null {
  const t = iso.trim();
  if (!t) return null;
  const d = /\d{4}-\d{2}-\d{2}/.test(t) ? new Date(`${t}T12:00:00`) : new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Дни для фильтра «Дата от / до»: колонки Дата, Акт нр, Акт с/п. */
function repairListFilterDateDays(pkg: ContractDocumentPackage): string[] {
  const form = mergeRepairPackageFormData(pkg.formData ?? {});
  const days: string[] = [];
  const signing = repairListIsoToFilterDay(repairListContractSigningDateIso(pkg));
  if (signing) days.push(signing);
  const workStart = repairListIsoToFilterDay(form.repairWorkStartActSignedAt ?? '');
  if (workStart) days.push(workStart);
  const closeAct = repairListIsoToFilterDay(form.repairContractCloseActSignedAt ?? '');
  if (closeAct) days.push(closeAct);
  return days;
}

function repairListDayInDateRange(day: string, dateFrom: string, dateTo: string): boolean {
  if (dateFrom && day < dateFrom) return false;
  if (dateTo && day > dateTo) return false;
  return true;
}

/** Строка попадает в фильтр, если хотя бы одна из дат (Дата / Акт нр / Акт с/п) в диапазоне. */
function repairListMatchesDateRange(
  pkg: ContractDocumentPackage,
  dateFrom: string,
  dateTo: string
): boolean {
  const days = repairListFilterDateDays(pkg);
  if (days.length === 0) return false;
  return days.some((day) => repairListDayInDateRange(day, dateFrom, dateTo));
}

function normalizeRepairListSearch(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function repairListMatchesSearch(pkg: ContractDocumentPackage, searchNorm: string): boolean {
  if (!searchNorm) return true;
  const fd = (pkg.formData ?? {}) as Record<string, unknown>;
  const num = getDisplayContractNumber({ formData: fd });
  const haystack = normalizeRepairListSearch(
    [num, repairListCustomerName(fd), repairListObjectAddress(fd)].join(' ')
  );
  return haystack.includes(searchNorm);
}

/** Колонка «Дата» — только дата подписания договора. */
function formatSigningDateOnly(r: ContractDocumentPackage): string {
  const iso = repairListContractSigningDateIso(r);
  if (!iso) return '—';
  return formatRepairListActDate(iso);
}

/** Статус для фильтра и колонки: ремонт — полный конвейер, остальные направления — упрощённо. */
function listPipelineStatus(pkg: ContractDocumentPackage): RepairListPipelineStatus {
  if (pkg.kind !== 'REPAIR') {
    if (pkg.status === 'REFUSED') return 'REFUSED';
    if (pkg.status === 'CONTRACT_CONCLUDED') return 'SIGNED';
    return 'IN_PROJECT';
  }
  return repairListPipelineStatusFromPackage(pkg);
}

function repairListPipelineStatusBadgeClass(st: RepairListPipelineStatus): string {
  const base = styles.repairContractsListStatusBadge;
  switch (st) {
    case 'IN_PROJECT':
      return `${base} ${styles.repairContractsListStatusBadgeInProject}`;
    case 'SIGNED':
      return `${base} ${styles.repairContractsListStatusBadgeSigned}`;
    case 'WORK_IN_PROGRESS':
      return `${base} ${styles.repairContractsListStatusBadgeWork}`;
    case 'CLOSED':
      return `${base} ${styles.repairContractsListStatusBadgeClosed}`;
    case 'REFUSED':
      return `${base} ${styles.repairContractsListStatusBadgeRefused}`;
  }
}

function ellipsizeOneLine(s: string, maxLen: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

/** Удаление: нельзя при оплатах или при прикреплённой смете (основной договор). */
function repairContractsListFilterFieldClass(
  base: string,
  active: boolean,
  activeClass: string
): string {
  return active ? `${base} ${activeClass}` : base;
}

function repairPackageDeletionAllowed(pkg: ContractDocumentPackage): boolean {
  const paymentCount = pkg.payments?.length ?? 0;
  if (paymentCount > 0) return false;
  const fd = (pkg.formData ?? {}) as Record<string, unknown>;
  if (repairListHasAttachedEstimate(fd)) return false;
  return true;
}

const REPAIR_LIST_PIPELINE_STATUS_ORDER: Record<RepairListPipelineStatus, number> = {
  IN_PROJECT: 0,
  SIGNED: 1,
  WORK_IN_PROGRESS: 2,
  CLOSED: 3,
  REFUSED: 4,
};

function repairListSigningDateMs(pkg: ContractDocumentPackage): number | null {
  const iso = repairListContractSigningDateIso(pkg);
  if (!iso) return null;
  const d = /\d{4}-\d{2}-\d{2}/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function repairListActSignedAtMs(isoRaw: string | undefined): number | null {
  const iso = isoRaw?.trim();
  if (!iso) return null;
  const d = /\d{4}-\d{2}-\d{2}/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function repairListWorkStartActDateMs(pkg: ContractDocumentPackage): number | null {
  const form = mergeRepairPackageFormData(pkg.formData ?? {});
  return repairListActSignedAtMs(form.repairWorkStartActSignedAt);
}

function repairListCloseActDateMs(pkg: ContractDocumentPackage): number | null {
  const form = mergeRepairPackageFormData(pkg.formData ?? {});
  return repairListActSignedAtMs(form.repairContractCloseActSignedAt);
}

function repairListPackageKindLabel(kind: ContractDocumentPackageKind): string {
  return CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS[kind] ?? kind;
}

type ObjectRowMoneyAggregate = {
  totalRub: number | null;
  totalWithAddendaRub: number | null;
  paidRub: number;
  remainingRub: number | null;
};

function aggregatePackagesMoney(
  packages: ContractDocumentPackage[],
  addendumColumnCount: number
): ObjectRowMoneyAggregate {
  let paidRub = 0;
  let totalSum: number | null = null;
  let totalWithAddendaSum: number | null = null;
  let remainingSum: number | null = null;
  for (const pkg of packages) {
    const fd = pkg.formData ?? {};
    const form = mergeRepairPackageFormData(fd);
    const paid = sumPackagePaymentsRub(pkg);
    paidRub += paid;
    const totalRub = repairListContractTotalAmount(fd);
    const totalWithAddendaRub = repairListContractAndSignedAddendaTotalRub(
      form,
      totalRub,
      addendumColumnCount
    );
    const paymentBaseRub = addendumColumnCount > 0 ? totalWithAddendaRub : totalRub;
    const rem = repairListRemainingToPayRub(paymentBaseRub, paid);
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

function repairListRowRemainingRub(
  pkg: ContractDocumentPackage,
  addendumColumnCount: number
): number | null {
  const fd = pkg.formData ?? {};
  const form = mergeRepairPackageFormData(fd);
  const paidRub = sumPackagePaymentsRub(pkg);
  const totalRub = repairListContractTotalAmount(fd);
  const totalWithAddendaRub = repairListContractAndSignedAddendaTotalRub(
    form,
    totalRub,
    addendumColumnCount
  );
  const paymentBaseRub = addendumColumnCount > 0 ? totalWithAddendaRub : totalRub;
  return repairListRemainingToPayRub(paymentBaseRub, paidRub);
}

/** Числовые колонки с пустыми значениями: asc — пустые внизу, desc — пустые вверху. */
function repairListCompareNullableNumber(
  a: number | null,
  b: number | null,
  sortOrder: RepairContractsListSortOrder
): number {
  if (a == null && b == null) return 0;
  if (a == null) return sortOrder === 'asc' ? 1 : -1;
  if (b == null) return sortOrder === 'asc' ? -1 : 1;
  const diff = a - b;
  return sortOrder === 'asc' ? diff : -diff;
}

function repairListCompareStrings(
  a: string,
  b: string,
  sortOrder: RepairContractsListSortOrder
): number {
  const diff = a.localeCompare(b, 'ru', { sensitivity: 'base', numeric: true });
  return sortOrder === 'asc' ? diff : -diff;
}

function compareRepairContractListRows(
  a: ContractDocumentPackage,
  b: ContractDocumentPackage,
  sortBy: RepairContractsListSortBy,
  sortOrder: RepairContractsListSortOrder,
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
      return repairListCompareStrings(String(na), String(nb), sortOrder);
    }
    case 'date':
      return repairListCompareNullableNumber(
        repairListSigningDateMs(a),
        repairListSigningDateMs(b),
        sortOrder
      );
    case 'status': {
      const oa = REPAIR_LIST_PIPELINE_STATUS_ORDER[listPipelineStatus(a)];
      const ob = REPAIR_LIST_PIPELINE_STATUS_ORDER[listPipelineStatus(b)];
      const diff = oa - ob;
      return sortOrder === 'asc' ? diff : -diff;
    }
    case 'customer': {
      const fa = (a.formData ?? {}) as Record<string, unknown>;
      const fb = (b.formData ?? {}) as Record<string, unknown>;
      return repairListCompareStrings(
        repairListCustomerName(fa),
        repairListCustomerName(fb),
        sortOrder
      );
    }
    case 'manager': {
      const la = repairListManagerDisplayLabel(
        mergeRepairPackageFormData(a.formData ?? {}),
        crmUsers
      );
      const lb = repairListManagerDisplayLabel(
        mergeRepairPackageFormData(b.formData ?? {}),
        crmUsers
      );
      return repairListCompareStrings(la, lb, sortOrder);
    }
    case 'remaining':
      return repairListCompareNullableNumber(
        repairListRowRemainingRub(a, addendumColumnCount),
        repairListRowRemainingRub(b, addendumColumnCount),
        sortOrder
      );
    case 'workStartAct':
      return repairListCompareNullableNumber(
        repairListWorkStartActDateMs(a),
        repairListWorkStartActDateMs(b),
        sortOrder
      );
    case 'closeAct':
      return repairListCompareNullableNumber(
        repairListCloseActDateMs(a),
        repairListCloseActDateMs(b),
        sortOrder
      );
    default:
      return 0;
  }
}

function RepairContractsListSortableTh({
  column,
  title,
  sortBy,
  sortOrder,
  onSort,
}: {
  column: RepairContractsListSortBy;
  title: string;
  sortBy: RepairContractsListSortBy;
  sortOrder: RepairContractsListSortOrder;
  onSort: (column: RepairContractsListSortBy) => void;
}) {
  const isActive = sortBy === column;
  return (
    <th
      className={dataTableStyles.sortable}
      onClick={(e) => {
        e.stopPropagation();
        onSort(column);
      }}
      aria-sort={isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className={dataTableStyles.headerContent}>
        {title}
        <span
          className={`${dataTableStyles.sortIcon} ${
            isActive ? dataTableStyles.sortIconActive : dataTableStyles.sortIconIdle
          }`}
          aria-hidden
        >
          {isActive ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
        </span>
      </span>
    </th>
  );
}

export function RepairContractDocumentsListPage() {
  const router = useRouter();
  const initialListFiltersRef = useRef(loadRepairContractsListFilters());
  const initialListFilters = initialListFiltersRef.current;
  const listFiltersHydratedRef = useRef(false);
  const skipListFiltersPersistRef = useRef(true);

  const [rows, setRows] = useState<ContractDocumentPackage[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [managerOptions, setManagerOptions] = useState<ContractSignatoryProfile[]>([]);
  const [estimatePresets, setEstimatePresets] = useState<ContractEstimatePreset[]>([]);
  const [measurementsById, setMeasurementsById] = useState<Map<string, Measurement>>(new Map());
  const [search, setSearch] = useState(initialListFilters.search);
  const [managerFilter, setManagerFilter] = useState(initialListFilters.managerFilter);
  const [statusFilter, setStatusFilter] = useState<'' | RepairListPipelineStatus>(
    initialListFilters.statusFilter as '' | RepairListPipelineStatus
  );
  const [directionFilter, setDirectionFilter] = useState(initialListFilters.directionFilter);
  const [dateFrom, setDateFrom] = useState(initialListFilters.dateFrom);
  const [dateTo, setDateTo] = useState(initialListFilters.dateTo);
  const [listSortBy, setListSortBy] = useState<RepairContractsListSortBy>(
    initialListFilters.sortBy
  );
  const [listSortOrder, setListSortOrder] = useState<RepairContractsListSortOrder>(
    initialListFilters.sortOrder
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<RepairContractsPageLimit>(initialListFilters.pageLimit);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDirectionModalOpen, setCreateDirectionModalOpen] = useState(false);
  const [createDirectionBusyKind, setCreateDirectionBusyKind] =
    useState<ContractDocumentPackageKind | null>(null);
  const [copyingPackageId, setCopyingPackageId] = useState<string | null>(null);
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);
  const [packagePendingDelete, setPackagePendingDelete] = useState<ContractDocumentPackage | null>(
    null
  );
  const [trashOpen, setTrashOpen] = useState(false);
  const [documentObjects, setDocumentObjects] = useState<ContractDocumentObject[]>([]);
  const [listViewMode, setListViewMode] = useState<ContractsListViewMode>(
    initialListFilters.listViewMode
  );
  /** В режиме «По объектам» раскрыт только один объект. */
  const [expandedObjectId, setExpandedObjectId] = useState<string | null>(null);

  const fetchRepairTrashTotal = useCallback(
    () => getRepairContractPackageTrash({ page: 1, limit: 1 }),
    []
  );
  const { trashCount, refreshTrashCount } = useAdminTrashCount(fetchRepairTrashTotal);
  const [packageHubPackageId, setPackageHubPackageId] = useState<string | null>(null);
  const [workOrdersHubPackageId, setWorkOrdersHubPackageId] = useState<string | null>(null);
  const [actPhotosModal, setActPhotosModal] = useState<{
    items: RepairListActPhotoItem[];
    contractLabel: string;
  } | null>(null);

  const addendumColumnCount = useMemo(
    () => repairListMaxSignedAddendumSlotCount(rows.filter((r) => r.kind === 'REPAIR')),
    [rows]
  );
  const repairListTableColSpan = 15 + addendumColumnCount + (addendumColumnCount > 0 ? 1 : 0);

  const presetById = useMemo(
    () => new Map(estimatePresets.map((p) => [p.id, p])),
    [estimatePresets]
  );

  const searchNorm = useMemo(() => normalizeRepairListSearch(search), [search]);

  const hasActiveFilters = Boolean(
    searchNorm || managerFilter || statusFilter || directionFilter || dateFrom || dateTo
  );

  const objectsById = useMemo(
    () => new Map(documentObjects.map((o) => [o.id, o])),
    [documentObjects]
  );

  const visibleRows = useMemo(() => {
    let list = [...rows];

    if (searchNorm) {
      list = list.filter((r) => repairListMatchesSearch(r, searchNorm));
    }

    if (managerFilter) {
      list = list.filter((r) => {
        const form = mergeRepairPackageFormData(r.formData ?? {});
        return repairListManagerCrmUserId(form) === managerFilter;
      });
    }

    if (statusFilter) {
      list = list.filter((r) => listPipelineStatus(r) === statusFilter);
    }

    if (directionFilter) {
      list = list.filter((r) =>
        repairListPackageDirectionIds(r, directions, presetById, measurementsById).includes(
          directionFilter
        )
      );
    }

    if (dateFrom || dateTo) {
      list = list.filter((r) => repairListMatchesDateRange(r, dateFrom, dateTo));
    }

    list.sort((a, b) => {
      const cmp = compareRepairContractListRows(
        a,
        b,
        listSortBy,
        listSortOrder,
        crmUsers,
        addendumColumnCount
      );
      if (cmp !== 0) return cmp;
      return listSortOrder === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
    });

    return list;
  }, [
    rows,
    searchNorm,
    managerFilter,
    statusFilter,
    directionFilter,
    dateFrom,
    dateTo,
    directions,
    presetById,
    measurementsById,
    listSortBy,
    listSortOrder,
    crmUsers,
    addendumColumnCount,
  ]);

  type ListDisplayItem =
    | { type: 'object'; objectId: string; packages: ContractDocumentPackage[] }
    | { type: 'package'; package: ContractDocumentPackage; childOfObject?: boolean };

  const tableDisplayItems = useMemo((): ListDisplayItem[] => {
    if (listViewMode === 'flat') {
      return visibleRows.map((pkg) => ({ type: 'package', package: pkg }));
    }

    const byObject = new Map<string, ContractDocumentPackage[]>();
    const ungrouped: ContractDocumentPackage[] = [];
    for (const pkg of visibleRows) {
      const oid = pkg.documentObjectId?.trim();
      if (oid) {
        const arr = byObject.get(oid) ?? [];
        arr.push(pkg);
        byObject.set(oid, arr);
      } else {
        ungrouped.push(pkg);
      }
    }

    const objectIds = [
      ...new Set([...documentObjects.map((o) => o.id), ...byObject.keys()]),
    ].filter((id) => (byObject.get(id)?.length ?? 0) > 0);

    objectIds.sort((a, b) => {
      const na = objectsById.get(a)?.name ?? byObject.get(a)?.[0]?.documentObject?.name ?? a;
      const nb = objectsById.get(b)?.name ?? byObject.get(b)?.[0]?.documentObject?.name ?? b;
      return repairListCompareStrings(String(na), String(nb), listSortOrder);
    });

    const items: ListDisplayItem[] = [];
    for (const oid of objectIds) {
      const pkgs = byObject.get(oid) ?? [];
      items.push({ type: 'object', objectId: oid, packages: pkgs });
      if (expandedObjectId === oid) {
        for (const pkg of pkgs) {
          items.push({ type: 'package', package: pkg, childOfObject: true });
        }
      }
    }
    for (const pkg of ungrouped) {
      items.push({ type: 'package', package: pkg });
    }
    return items;
  }, [listViewMode, visibleRows, documentObjects, objectsById, expandedObjectId, listSortOrder]);

  const objectGroupCount = useMemo(() => {
    if (listViewMode === 'flat') return 0;
    return tableDisplayItems.filter((i) => i.type === 'object').length;
  }, [listViewMode, tableDisplayItems]);

  const totalVisible = listViewMode === 'flat' ? visibleRows.length : tableDisplayItems.length;
  const paginatedDisplayItems = useMemo(
    () => tableDisplayItems.slice((page - 1) * limit, page * limit),
    [tableDisplayItems, page, limit]
  );

  useEffect(() => {
    setPage(1);
  }, [searchNorm, managerFilter, statusFilter, directionFilter, dateFrom, dateTo, listViewMode]);

  useEffect(() => {
    if (listViewMode === 'flat') setExpandedObjectId(null);
  }, [listViewMode]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalVisible / limit));
    if (page > totalPages) setPage(totalPages);
  }, [totalVisible, limit, page]);

  const handleListSortChange = useCallback(
    (column: RepairContractsListSortBy) => {
      if (listSortBy === column) {
        setListSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
      } else {
        setListSortBy(column);
        setListSortOrder('asc');
      }
    },
    [listSortBy]
  );

  const emptyFilteredListMessage = useMemo(() => {
    if (rows.length === 0 || !hasActiveFilters) return '';
    return 'Нет договоров по выбранным фильтрам.';
  }, [rows.length, hasActiveFilters]);

  useEffect(() => {
    const saved = reloadRepairContractsListFiltersFromStorage();
    setSearch(saved.search);
    setManagerFilter(saved.managerFilter);
    setStatusFilter(saved.statusFilter as '' | RepairListPipelineStatus);
    setDirectionFilter(saved.directionFilter);
    setDateFrom(saved.dateFrom);
    setDateTo(saved.dateTo);
    setListSortBy(saved.sortBy);
    setListSortOrder(saved.sortOrder);
    setLimit(saved.pageLimit);
    setListViewMode(saved.listViewMode);
    listFiltersHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!listFiltersHydratedRef.current) return;
    if (skipListFiltersPersistRef.current) {
      skipListFiltersPersistRef.current = false;
      return;
    }
    persistRepairContractsListFilters({
      search,
      managerFilter,
      statusFilter,
      directionFilter,
      dateFrom,
      dateTo,
      sortBy: listSortBy,
      sortOrder: listSortOrder,
      pageLimit: limit,
      listViewMode,
    });
  }, [
    search,
    managerFilter,
    statusFilter,
    directionFilter,
    dateFrom,
    dateTo,
    listSortBy,
    listSortOrder,
    limit,
    listViewMode,
  ]);

  useEffect(() => {
    if (!managerFilter) return;
    if (!managerOptions.some((p) => p.crmUserId === managerFilter)) {
      setManagerFilter('');
    }
  }, [managerFilter, managerOptions]);

  useEffect(() => {
    if (!directionFilter) return;
    if (!directions.some((d) => d.id === directionFilter)) {
      setDirectionFilter('');
    }
  }, [directionFilter, directions]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        await autoSyncContractDocumentObjects();
      } catch {
        /* группировка по адресу не должна блокировать список */
      }
      const [data, objects, users, dirs, signatories, presetsRes, measurementsRes] =
        await Promise.all([
          getContractDocumentPackages(),
          getContractDocumentObjects().catch(() => [] as ContractDocumentObject[]),
          getCrmUsers().catch(() => [] as CrmUser[]),
          getCrmDirections().catch(() => [] as CrmDirection[]),
          getContractDocumentSignatoryProfiles('REPAIR').catch(() => ({
            items: [] as ContractSignatoryProfile[],
            updatedAt: null,
          })),
          getContractDocumentEstimatePresets('REPAIR').catch(() => ({
            items: [] as ContractEstimatePreset[],
            groups: [],
            updatedAt: null,
          })),
          getMeasurements({ page: 1, limit: 500 }).catch(() => ({
            data: [] as Measurement[],
            total: 0,
            page: 1,
            limit: 500,
            totalPages: 0,
          })),
        ]);
      setRows(data);
      setDocumentObjects(objects);
      setCrmUsers(users);
      setDirections(dirs);
      const profiles = (signatories.items ?? [])
        .filter((p) => Boolean(p.crmUserId?.trim()))
        .sort((a, b) =>
          (a.title || '').localeCompare(b.title || '', 'ru', { sensitivity: 'base' })
        );
      setManagerOptions(profiles);
      setEstimatePresets(presetsRes.items ?? []);
      setMeasurementsById(new Map(measurementsRes.data.map((m) => [m.id, m])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
      void refreshTrashCount();
    }
  }, [refreshTrashCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (kind: ContractDocumentPackageKind) => {
    setCreating(true);
    setCreateDirectionBusyKind(kind);
    setError(null);
    try {
      const created = await createContractDocumentPackage({
        kind,
        title: undefined,
        formData: {},
      });
      setCreateDirectionModalOpen(false);
      router.push(adminContractDocumentsContractsRepairPackageHref(created.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать');
    } finally {
      setCreateDirectionBusyKind(null);
      setCreating(false);
    }
  };

  const handleCopyPackage = async (packageId: string) => {
    setCopyingPackageId(packageId);
    setError(null);
    try {
      const pkg = await getContractDocumentPackage(packageId);
      const formDataBase = buildFormDataForRepairPackageCopy(pkg.formData);
      const contractBlock = asObj(formDataBase.contract);
      const baselineNumber =
        typeof contractBlock?.number === 'string' ? contractBlock.number.trim() : '';
      const formData = {
        ...formDataBase,
        [REPAIR_COPY_CONTRACT_NUMBER_BASELINE_KEY]: baselineNumber,
      };
      const baseTitle = pkg.title?.trim();
      const created = await createContractDocumentPackage({
        kind: 'REPAIR',
        title: baseTitle ? `${baseTitle} (копия)` : undefined,
        formData,
      });
      await load();
      router.push(adminContractDocumentsContractsRepairPackageHref(created.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось скопировать договор');
    } finally {
      setCopyingPackageId(null);
    }
  };

  const requestDeletePackage = (pkg: ContractDocumentPackage) => {
    if (!repairPackageDeletionAllowed(pkg)) return;
    setPackagePendingDelete(pkg);
  };

  const handleConfirmDeletePackage = () => {
    const pkg = packagePendingDelete;
    if (!pkg?.id) return;
    const id = pkg.id;
    void (async () => {
      setDeletingPackageId(id);
      setError(null);
      try {
        await trashContractDocumentPackage(id);
        setPackagePendingDelete(null);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось переместить договор в корзину');
      } finally {
        setDeletingPackageId(null);
      }
    })();
  };

  const deleteConfirmMessage =
    packagePendingDelete != null
      ? (() => {
          const n = getDisplayContractNumber({
            formData: (packagePendingDelete.formData ?? {}) as Record<string, unknown>,
          });
          const suffix = n && String(n).trim() !== '' && n !== '—' ? ` «${n}»` : '';
          return `Переместить договор${suffix} в корзину? Он исчезнет из списка, восстановить можно из корзины.`;
        })()
      : '';

  return (
    <div className={`${styles.page} ${styles.pageWide} ${styles.repairContractsListPage}`}>
      <div className={styles.editorHeader}>
        <div className={styles.repairContractsListHeaderLeft}>
          <h1 className={styles.title}>Договора</h1>
          <span className={styles.repairContractsListCount}>
            {visibleRows.length} договоров
            {objectGroupCount > 0 ? ` · ${objectGroupCount} объектов` : ''}
          </span>
        </div>
        <div className={styles.headerButtonsRow}>
          <button
            type="button"
            className={styles.contractsListHeaderAddBtn}
            disabled={
              creating || loading || copyingPackageId !== null || deletingPackageId !== null
            }
            onClick={() => setCreateDirectionModalOpen(true)}
          >
            {creating ? 'Создание…' : '+ Новый договор'}
          </button>
          <AdminListRefreshButton
            disabled={
              loading || creating || copyingPackageId !== null || deletingPackageId !== null
            }
            busy={loading}
            title="Обновить список"
            aria-label={loading ? 'Обновление списка договоров' : 'Обновить список договоров'}
            onClick={() => void load()}
          />
          <AdminToolbarTrashButton
            trashCount={trashCount}
            onClick={() => setTrashOpen(true)}
            title="Корзина договоров"
            aria-label="Корзина договоров"
          />
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.repairContractsListFilters}>
        <input
          type="search"
          placeholder="Поиск по номеру договора, ФИО заказчика, адресу..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
          className={repairContractsListFilterFieldClass(
            styles.repairContractsListSearchInput,
            Boolean(search.trim()),
            styles.repairContractsListFilterActive
          )}
          aria-label="Поиск по номеру договора, ФИО заказчика, адресу"
        />
        <select
          id="repair_list_status_filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter((e.target.value || '') as '' | RepairListPipelineStatus)}
          disabled={loading}
          className={repairContractsListFilterFieldClass(
            styles.repairContractsListSelect,
            Boolean(statusFilter),
            styles.repairContractsListFilterActive
          )}
          aria-label="Статус"
        >
          <option value="">Все статусы</option>
          <option value="IN_PROJECT">В проекте</option>
          <option value="SIGNED">Подписан</option>
          <option value="WORK_IN_PROGRESS">В работе</option>
          <option value="CLOSED">Закрыт</option>
          <option value="REFUSED">Отказ</option>
        </select>
        <select
          value={listViewMode}
          onChange={(e) => setListViewMode(e.target.value as ContractsListViewMode)}
          disabled={loading}
          className={styles.repairContractsListSelect}
          aria-label="Режим списка"
        >
          <option value="by_object">По объектам</option>
          <option value="flat">Плоский список</option>
        </select>
        <select
          id="repair_list_manager_filter"
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          disabled={loading}
          className={repairContractsListFilterFieldClass(
            styles.repairContractsListSelect,
            Boolean(managerFilter),
            styles.repairContractsListFilterActive
          )}
          aria-label="Менеджер"
        >
          <option value="">Все менеджеры</option>
          {managerOptions.map((p) => (
            <option key={p.crmUserId} value={p.crmUserId}>
              {p.title?.trim() || p.directorNameNominative?.trim() || p.crmUserId}
            </option>
          ))}
        </select>
        <select
          id="repair_list_direction_filter"
          value={directionFilter}
          onChange={(e) => setDirectionFilter(e.target.value)}
          disabled={loading}
          className={repairContractsListFilterFieldClass(
            styles.repairContractsListSelect,
            Boolean(directionFilter),
            styles.repairContractsListFilterActive
          )}
          aria-label="Направление"
        >
          <option value="">Все направления</option>
          {directions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <label className={styles.repairContractsListDateLabel}>
          <span className={styles.repairContractsListDateLabelText}>Дата от</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            disabled={loading}
            className={repairContractsListFilterFieldClass(
              styles.repairContractsListDateInput,
              Boolean(dateFrom),
              styles.repairContractsListFilterActive
            )}
            aria-label="Дата от"
          />
        </label>
        <label className={styles.repairContractsListDateLabel}>
          <span className={styles.repairContractsListDateLabelText}>Дата до</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            disabled={loading}
            className={repairContractsListFilterFieldClass(
              styles.repairContractsListDateInput,
              Boolean(dateTo),
              styles.repairContractsListFilterActive
            )}
            aria-label="Дата до"
          />
        </label>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value) as RepairContractsPageLimit);
            setPage(1);
          }}
          disabled={loading}
          className={styles.repairContractsListSelect}
          aria-label="Количество строк на странице"
        >
          {REPAIR_CONTRACTS_PAGE_LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} на странице
            </option>
          ))}
        </select>
      </div>

      <div className={`${dataTableStyles.tableContainer} ${styles.repairContractsDirectoryTable}`}>
        <div className={dataTableStyles.tableWrapper}>
          <div className={dataTableStyles.scrollContainer}>
            <table className={`${dataTableStyles.table} ${styles.repairContractsListTable}`}>
              <thead className={dataTableStyles.stickyHeader}>
                <tr>
                  <th className={styles.repairContractsListSelectCol} aria-label="Группа" />
                  <th className={styles.repairContractsListKindCol}>Направл.</th>
                  <RepairContractsListSortableTh
                    column="contractNumber"
                    title="№ дог."
                    sortBy={listSortBy}
                    sortOrder={listSortOrder}
                    onSort={handleListSortChange}
                  />
                  <RepairContractsListSortableTh
                    column="date"
                    title="Дата"
                    sortBy={listSortBy}
                    sortOrder={listSortOrder}
                    onSort={handleListSortChange}
                  />
                  <RepairContractsListSortableTh
                    column="status"
                    title="Статус"
                    sortBy={listSortBy}
                    sortOrder={listSortOrder}
                    onSort={handleListSortChange}
                  />
                  <RepairContractsListSortableTh
                    column="customer"
                    title="Заказчик"
                    sortBy={listSortBy}
                    sortOrder={listSortOrder}
                    onSort={handleListSortChange}
                  />
                  <RepairContractsListSortableTh
                    column="manager"
                    title="Менеджер"
                    sortBy={listSortBy}
                    sortOrder={listSortOrder}
                    onSort={handleListSortChange}
                  />
                  <th>Адрес объекта</th>
                  <th>Описание работ</th>
                  <th>СД нач.</th>
                  {addendumColumnCount > 0
                    ? Array.from({ length: addendumColumnCount }, (_, i) => (
                        <th key={`addendum_th_${i + 1}`}>Д/с №{i + 1}</th>
                      ))
                    : null}
                  {addendumColumnCount > 0 ? <th>СД итог.</th> : null}
                  <th>Оплачено</th>
                  <RepairContractsListSortableTh
                    column="remaining"
                    title="Остаток"
                    sortBy={listSortBy}
                    sortOrder={listSortOrder}
                    onSort={handleListSortChange}
                  />
                  <RepairContractsListSortableTh
                    column="workStartAct"
                    title="Акт нр"
                    sortBy={listSortBy}
                    sortOrder={listSortOrder}
                    onSort={handleListSortChange}
                  />
                  <RepairContractsListSortableTh
                    column="closeAct"
                    title="Акт с/п"
                    sortBy={listSortBy}
                    sortOrder={listSortOrder}
                    onSort={handleListSortChange}
                  />
                  <th className={styles.repairContractsListActionsCol} />
                </tr>
              </thead>
              <tbody className={loading ? dataTableStyles.tbodyRefreshing : undefined}>
                {loading ? (
                  <tr>
                    <td colSpan={repairListTableColSpan} className={dataTableStyles.loadingCell}>
                      Загрузка…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={repairListTableColSpan} className={dataTableStyles.emptyCell}>
                      Пока нет ни одного пакета. Нажмите «+ Новый договор».
                    </td>
                  </tr>
                ) : tableDisplayItems.length === 0 ? (
                  <tr>
                    <td colSpan={repairListTableColSpan} className={dataTableStyles.emptyCell}>
                      {emptyFilteredListMessage}
                    </td>
                  </tr>
                ) : (
                  paginatedDisplayItems.map((item) => {
                    if (item.type === 'object') {
                      const obj =
                        objectsById.get(item.objectId) ?? item.packages[0]?.documentObject;
                      const objName =
                        (obj && 'name' in obj ? obj.name : null) ??
                        item.packages[0]?.documentObject?.name ??
                        'Объект';
                      const objAddress =
                        (obj && 'address' in obj ? obj.address : null) ??
                        item.packages[0]?.documentObject?.address ??
                        repairListObjectAddress(
                          (item.packages[0]?.formData ?? {}) as Record<string, unknown>
                        );
                      const objCustomer =
                        (obj && 'customerName' in obj ? obj.customerName : null) ??
                        item.packages[0]?.documentObject?.customerName ??
                        repairListCustomerName(
                          (item.packages[0]?.formData ?? {}) as Record<string, unknown>
                        );
                      const agg = aggregatePackagesMoney(item.packages, addendumColumnCount);
                      const paymentBase =
                        addendumColumnCount > 0 ? agg.totalWithAddendaRub : agg.totalRub;
                      const expanded = expandedObjectId === item.objectId;
                      return (
                        <tr
                          key={`obj-${item.objectId}`}
                          className={`${dataTableStyles.row} ${styles.repairContractsListObjectRow} ${
                            expanded ? styles.repairContractsListObjectRowExpanded : ''
                          }`}
                        >
                          <td className={styles.repairContractsListSelectCol}>
                            <button
                              type="button"
                              className={styles.repairContractsListExpandBtn}
                              aria-expanded={expanded}
                              aria-label={expanded ? 'Свернуть договоры' : 'Развернуть договоры'}
                              onClick={() =>
                                setExpandedObjectId((current) =>
                                  current === item.objectId ? null : item.objectId
                                )
                              }
                            >
                              {expanded ? '▼' : '▶'}
                            </button>
                          </td>
                          <td className={styles.repairContractsListKindCol}>Объект</td>
                          <td>
                            <span className={styles.repairContractsListObjectAddressLabel}>
                              {objName}
                            </span>
                            <span className={styles.repairContractsListObjectBadge}>
                              {item.packages.length} дог.
                            </span>
                          </td>
                          <td>—</td>
                          <td>—</td>
                          <td>{objCustomer || '—'}</td>
                          <td>—</td>
                          <td>{ellipsizeOneLine(objAddress || '—', 64)}</td>
                          <td>—</td>
                          <td>{formatListMoney(agg.totalRub)}</td>
                          {addendumColumnCount > 0
                            ? Array.from({ length: addendumColumnCount }, (_, i) => (
                                <td key={`obj_add_${item.objectId}_${i + 1}`}>—</td>
                              ))
                            : null}
                          {addendumColumnCount > 0 ? (
                            <td>{formatListMoney(agg.totalWithAddendaRub)}</td>
                          ) : null}
                          <td>{formatListPaidWithPercent(agg.paidRub, paymentBase)}</td>
                          <td>{formatListMoney(agg.remainingRub)}</td>
                          <td>—</td>
                          <td>—</td>
                          <td className={styles.repairContractsListActionsCol} />
                        </tr>
                      );
                    }

                    const r = item.package;
                    const fd = r.formData ?? {};
                    const form = mergeRepairPackageFormData(fd);
                    const num = getDisplayContractNumber({ formData: fd });
                    const paidRub = sumPackagePaymentsRub(r);
                    const totalRub = repairListContractTotalAmount(fd);
                    const totalWithAddendaRub = repairListContractAndSignedAddendaTotalRub(
                      form,
                      totalRub,
                      addendumColumnCount
                    );
                    const paymentBaseRub = addendumColumnCount > 0 ? totalWithAddendaRub : totalRub;
                    const remainingRub = repairListRemainingToPayRub(paymentBaseRub, paidRub);
                    const workDesc = repairListWorkDescription(fd);
                    const workShort = ellipsizeOneLine(workDesc, 100);
                    const managerLabel = repairListManagerDisplayLabel(form, crmUsers);
                    const copyBusy = copyingPackageId === r.id;
                    const deleteBusy = deletingPackageId === r.id;
                    const canDeleteDraft = repairPackageDeletionAllowed(r);
                    const pipelineStatus = listPipelineStatus(r);
                    const actPhotoItems = repairListAttachedActPhotosFromForm(form);
                    const packageHref = adminContractDocumentsContractsRepairPackageHref(r.id);
                    const rowClass = item.childOfObject
                      ? `${dataTableStyles.row} ${styles.repairContractsListClickableRow} ${styles.repairContractsListChildRow}`
                      : `${dataTableStyles.row} ${styles.repairContractsListClickableRow}`;
                    return (
                      <tr
                        key={r.id}
                        className={rowClass}
                        tabIndex={0}
                        aria-label={`Открыть договор ${num}`}
                        onClick={() => router.push(packageHref)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(packageHref);
                          }
                        }}
                      >
                        <td className={styles.repairContractsListSelectCol} />
                        <td className={styles.repairContractsListKindCol}>
                          {repairListPackageKindLabel(r.kind)}
                        </td>
                        <td>{num}</td>
                        <td>{formatSigningDateOnly(r)}</td>
                        <td>
                          <span className={repairListPipelineStatusBadgeClass(pipelineStatus)}>
                            {repairListPipelineStatusLabel(pipelineStatus)}
                          </span>
                        </td>
                        <td>{repairListCustomerName(fd)}</td>
                        <td title={managerLabel}>{ellipsizeOneLine(managerLabel, 40)}</td>
                        <td>{ellipsizeOneLine(repairListObjectAddress(fd), 64)}</td>
                        <td title={workDesc.length > workShort.length ? workDesc : undefined}>
                          {workShort}
                        </td>
                        <td>{formatListMoney(totalRub)}</td>
                        {addendumColumnCount > 0
                          ? Array.from({ length: addendumColumnCount }, (_, i) => (
                              <td key={`addendum_td_${r.id}_${i + 1}`}>
                                {formatListMoney(repairListSignedAddendumRub(form, i))}
                              </td>
                            ))
                          : null}
                        {addendumColumnCount > 0 ? (
                          <td>{formatListMoney(totalWithAddendaRub)}</td>
                        ) : null}
                        <td>{formatListPaidWithPercent(paidRub, paymentBaseRub)}</td>
                        <td>{formatListMoney(remainingRub)}</td>
                        <td title="Акт начала работ">{repairListWorkStartActDateCell(form)}</td>
                        <td title="Акт сдачи-приёмки">
                          {repairListContractCloseActDateCell(form)}
                        </td>
                        <td
                          className={styles.repairContractsListActionsCol}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <div
                            className={`${styles.estimatesCardActions} ${styles.repairContractsListActionsGrid}`}
                          >
                            <div className={styles.repairContractsListActionsSlot}>
                              <AdminTableIconButton
                                disabled={
                                  loading ||
                                  creating ||
                                  copyingPackageId !== null ||
                                  deletingPackageId !== null
                                }
                                title={REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE}
                                aria-label={`${REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE} (${num})`}
                                onClick={() => setPackageHubPackageId(r.id)}
                              >
                                <RepairContractPackageHubIcon />
                              </AdminTableIconButton>
                            </div>
                            <div className={styles.repairContractsListActionsSlot}>
                              <AdminTableIconButton
                                disabled={
                                  loading ||
                                  creating ||
                                  copyingPackageId !== null ||
                                  deletingPackageId !== null
                                }
                                title={formatRepairWorkOrderHubModalTitle(num)}
                                aria-label={`Открыть ${formatRepairWorkOrderHubModalTitle(num)}`}
                                onClick={() => setWorkOrdersHubPackageId(r.id)}
                              >
                                <RepairContractWorkOrdersHubIcon />
                              </AdminTableIconButton>
                            </div>
                            <div className={styles.repairContractsListActionsSlot}>
                              <AdminTableIconButton
                                disabled={
                                  loading ||
                                  creating ||
                                  (copyingPackageId !== null && !copyBusy) ||
                                  deletingPackageId !== null
                                }
                                aria-busy={copyBusy}
                                aria-label={
                                  copyBusy
                                    ? 'Копирование договора…'
                                    : 'Копировать договор (данные без прикреплённых расчётов)'
                                }
                                title="Копировать: все вкладки, без расчётов в смете и в Д/с"
                                onClick={() => void handleCopyPackage(r.id)}
                              >
                                <CopyIcon
                                  className={
                                    copyBusy ? styles.estimatesRefreshIconSpinning : undefined
                                  }
                                />
                              </AdminTableIconButton>
                            </div>
                            <div className={styles.repairContractsListActionsSlot}>
                              <AdminTableIconButton
                                disabled={
                                  !canDeleteDraft ||
                                  loading ||
                                  creating ||
                                  copyingPackageId !== null ||
                                  (deletingPackageId !== null && !deleteBusy)
                                }
                                aria-busy={deleteBusy}
                                aria-label={
                                  deleteBusy
                                    ? 'Перемещение в корзину…'
                                    : canDeleteDraft
                                      ? 'В корзину'
                                      : 'Удаление недоступно: прикреплена смета или есть оплаты'
                                }
                                title={
                                  canDeleteDraft
                                    ? 'В корзину (если нет прикреплённой сметы и записей об оплатах)'
                                    : 'В корзину нельзя: к договору прикреплена смета или в журнале есть оплаты'
                                }
                                onClick={() => requestDeletePackage(r)}
                              >
                                <DeleteIcon
                                  className={
                                    deleteBusy ? styles.estimatesRefreshIconSpinning : undefined
                                  }
                                />
                              </AdminTableIconButton>
                            </div>
                            <div className={styles.repairContractsListActionsSlot}>
                              {actPhotoItems.length > 0 ? (
                                <AdminTableIconButton
                                  disabled={
                                    loading ||
                                    creating ||
                                    copyingPackageId !== null ||
                                    deletingPackageId !== null
                                  }
                                  title="Просмотр загруженных фото актов (статусы «В работе», «Договор закрыт»)"
                                  aria-label={`Просмотр фото актов договора ${num}`}
                                  onClick={() =>
                                    setActPhotosModal({
                                      items: actPhotoItems,
                                      contractLabel: num,
                                    })
                                  }
                                >
                                  <RepairListActPhotosTriggerIcon />
                                </AdminTableIconButton>
                              ) : (
                                <span
                                  className={styles.repairContractsListActionsIconPlaceholder}
                                  aria-hidden
                                />
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {!loading && totalVisible > 0 ? (
          <AdminTablePagination
            page={page}
            limit={limit}
            total={totalVisible}
            onPageChange={setPage}
            className={styles.repairContractsListPagination}
            activePageClassName={styles.repairContractsListPaginationPageActive}
          />
        ) : null}
      </div>

      <Modal
        isOpen={createDirectionModalOpen}
        onClose={() => {
          if (creating) return;
          setCreateDirectionModalOpen(false);
        }}
        title="Новое оформление договора"
        size="sm"
        compactOnMobile
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Выберите направление, по которому создаётся пакет документов.
          </p>
          <div data-modal-form-actions>
            <button
              type="button"
              data-modal-btn="primary"
              disabled={creating}
              aria-busy={createDirectionBusyKind === 'REPAIR'}
              onClick={() => void handleCreate('REPAIR')}
            >
              {createDirectionBusyKind === 'REPAIR' ? 'Создание…' : 'Ремонт'}
            </button>
            <button
              type="button"
              data-modal-btn="secondary"
              disabled={creating}
              aria-busy={createDirectionBusyKind === 'WINDOWS'}
              onClick={() => void handleCreate('WINDOWS')}
            >
              {createDirectionBusyKind === 'WINDOWS' ? 'Создание…' : 'Окна'}
            </button>
            <button
              type="button"
              data-modal-btn="ghost"
              disabled={creating}
              onClick={() => setCreateDirectionModalOpen(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={actPhotosModal != null}
        onClose={() => setActPhotosModal(null)}
        title={
          actPhotosModal
            ? `Фото актов (${actPhotosModal.contractLabel})`
            : 'Фото актов к статусам договора'
        }
        size="lg"
        compactOnMobile
      >
        {actPhotosModal ? (
          <div data-modal-form data-modal-density="compact">
            <p data-modal-form-hint style={{ marginTop: 0 }}>
              Снимки, загруженные при установке этапов «В работе» и «Договор закрыт».
            </p>
            <div className={styles.repairAttachedActPhotosList}>
              {actPhotosModal.items.map((it) => (
                <section key={it.key} className={styles.repairAttachedActPhotoBlock}>
                  <h3 className={styles.repairAttachedActPhotoTitle}>{it.title}</h3>
                  <p className={styles.repairAttachedActPhotoMeta}>
                    Дата по акту: <strong>{it.dateLabel}</strong>
                  </p>
                  <div className={styles.repairWorkStartModalPreview}>
                    <a
                      href={it.src}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.repairAttachedActPhotoImageLink}
                    >
                      <img src={it.src} alt={it.title} />
                    </a>
                  </div>
                  <p className={styles.repairAttachedActPhotoLinkLine}>
                    <a href={it.src} target="_blank" rel="noopener noreferrer">
                      Открыть в полном размере
                    </a>
                  </p>
                </section>
              ))}
            </div>
            <div data-modal-form-actions>
              <button
                type="button"
                data-modal-btn="secondary"
                onClick={() => setActPhotosModal(null)}
              >
                Закрыть
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmModal
        isOpen={packagePendingDelete != null}
        onClose={() => setPackagePendingDelete(null)}
        onConfirm={handleConfirmDeletePackage}
        title="Переместить в корзину?"
        message={deleteConfirmMessage}
        confirmText="В корзину"
        cancelText="Отмена"
        variant="danger"
      />

      <RepairContractTrashModal
        isOpen={trashOpen}
        onClose={() => {
          setTrashOpen(false);
          void refreshTrashCount();
        }}
        onRestored={() => {
          void load();
          void refreshTrashCount();
        }}
      />

      {packageHubPackageId ? (
        <RepairContractPackageHubModal
          packageId={packageHubPackageId}
          isOpen
          onClose={() => setPackageHubPackageId(null)}
          onUpdated={() => void load()}
        />
      ) : null}

      {workOrdersHubPackageId ? (
        <RepairContractWorkOrdersHubListModal
          packageId={workOrdersHubPackageId}
          isOpen
          onClose={() => setWorkOrdersHubPackageId(null)}
          onUpdated={() => void load()}
        />
      ) : null}
    </div>
  );
}
