'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type ContractDocumentPackage,
  createContractDocumentPackage,
  deleteContractDocumentPackage,
  getContractDocumentPackage,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';
import { type CrmUser, getCrmUsers } from '@/shared/api/admin-crm';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import {
  ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF,
  adminContractDocumentsContractsRepairPackageHref,
} from '@/views/admin/ContractDocuments/contractDocumentsContractsRoutes';

import styles from '../ContractDocuments.module.css';
import { buildFormDataForRepairPackageCopy } from './cloneRepairPackageFormDataForCopy';
import {
  REPAIR_COPY_CONTRACT_NUMBER_BASELINE_KEY,
  getDisplayContractNumber,
} from './packageContractDisplay';
import { applyRepairContractDiscountToNullableBase } from './repairContractDiscount';
import { type RepairPackageFormData, mergeRepairPackageFormData } from './repairPackageForm';

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
    const slotCap = Math.min(5, Math.max(1, form.addendumSlotCount || 1));
    for (let i = 0; i < slotCap; i++) {
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

/** Ключ для фильтра по колонке «Менеджер» (CRM id или пара карточка+ФИО без id). */
function repairListManagerFilterKey(form: RepairPackageFormData): string {
  const crmId = repairListManagerCrmUserId(form);
  if (crmId) return `crm:${crmId}`;
  const title = form.executor.selectedSignatoryProfileTitle?.trim() ?? '';
  const nom = form.executor.directorNameNominative?.trim() ?? '';
  if (title || nom) return `local:${title}\u0001${nom}`;
  return '';
}

function formatSigningDateOnly(r: ContractDocumentPackage): string {
  if (r.status !== 'CONTRACT_CONCLUDED') return '—';
  const fd = r.formData ?? {};
  const iso = typeof fd.contractConcludedAt === 'string' ? fd.contractConcludedAt.trim() : '';
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

/** Этапы жизненного цикла договора в списке (фильтр и колонка «Статус»). */
type RepairListPipelineStatus = 'IN_PROJECT' | 'SIGNED' | 'WORK_IN_PROGRESS' | 'CLOSED' | 'REFUSED';

/**
 * «В работе» и «Закрыт» задаются в редакторе пакета (дата + фото соответствующего акта).
 * `repairContractClosed: true` — устаревший признак «Закрыт», сохраняем для совместимости.
 */
const REPAIR_PIPELINE_REFUSED_FD = 'repairContractClientRefused';
const REPAIR_PIPELINE_CLOSED_FD = 'repairContractClosed';
const REPAIR_PIPELINE_CLOSE_ACT_DATE_FD = 'repairContractCloseActSignedAt';
const REPAIR_PIPELINE_CLOSE_ACT_PHOTO_FD = 'repairContractCloseActPhotoUrl';
const REPAIR_PIPELINE_WORK_START_FD = 'repairWorkStartActSignedAt';
const REPAIR_PIPELINE_WORK_START_PHOTO_FD = 'repairWorkStartActPhotoUrl';

function repairListPipelineStatus(pkg: ContractDocumentPackage): RepairListPipelineStatus {
  if (pkg.status === 'REFUSED') return 'REFUSED';
  const fd = (pkg.formData ?? {}) as Record<string, unknown>;
  if (fd[REPAIR_PIPELINE_REFUSED_FD] === true) return 'REFUSED';
  const closeDateRaw = fd[REPAIR_PIPELINE_CLOSE_ACT_DATE_FD];
  const closePhotoRaw = fd[REPAIR_PIPELINE_CLOSE_ACT_PHOTO_FD];
  const contractClosedByActs =
    typeof closeDateRaw === 'string' &&
    closeDateRaw.trim().length > 0 &&
    typeof closePhotoRaw === 'string' &&
    closePhotoRaw.trim().length > 0;
  if (contractClosedByActs || fd[REPAIR_PIPELINE_CLOSED_FD] === true) return 'CLOSED';
  const workStartRaw = fd[REPAIR_PIPELINE_WORK_START_FD];
  const workPhotoRaw = fd[REPAIR_PIPELINE_WORK_START_PHOTO_FD];
  const workStarted =
    typeof workStartRaw === 'string' &&
    workStartRaw.trim().length > 0 &&
    typeof workPhotoRaw === 'string' &&
    workPhotoRaw.trim().length > 0;
  if (pkg.status === 'CONTRACT_CONCLUDED' && workStarted) return 'WORK_IN_PROGRESS';
  if (pkg.status === 'CONTRACT_CONCLUDED') return 'SIGNED';
  return 'IN_PROJECT';
}

function repairListPipelineStatusLabel(st: RepairListPipelineStatus): string {
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
function repairPackageDeletionAllowed(pkg: ContractDocumentPackage): boolean {
  const paymentCount = pkg.payments?.length ?? 0;
  if (paymentCount > 0) return false;
  const fd = (pkg.formData ?? {}) as Record<string, unknown>;
  if (repairListHasAttachedEstimate(fd)) return false;
  return true;
}

export function RepairContractDocumentsListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ContractDocumentPackage[]>([]);
  const [crmUsers, setCrmUsers] = useState<CrmUser[]>([]);
  const [managerFilter, setManagerFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'' | RepairListPipelineStatus>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copyingPackageId, setCopyingPackageId] = useState<string | null>(null);
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);
  const [packagePendingDelete, setPackagePendingDelete] = useState<ContractDocumentPackage | null>(
    null
  );
  const [actPhotosModal, setActPhotosModal] = useState<{
    items: RepairListActPhotoItem[];
    contractLabel: string;
  } | null>(null);

  const addendumColumnCount = useMemo(() => repairListMaxSignedAddendumSlotCount(rows), [rows]);
  const repairListTableColSpan = 11 + addendumColumnCount + (addendumColumnCount > 0 ? 1 : 0);

  const managerFilterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      const form = mergeRepairPackageFormData(r.formData ?? {});
      const key = repairListManagerFilterKey(form);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, repairListManagerDisplayLabel(form, crmUsers));
      }
    }
    return [...map.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru', { sensitivity: 'base' }));
  }, [rows, crmUsers]);

  const visibleRows = useMemo(() => {
    let list =
      managerFilter === ''
        ? [...rows]
        : rows.filter((r) => {
            const form = mergeRepairPackageFormData(r.formData ?? {});
            return repairListManagerFilterKey(form) === managerFilter;
          });

    if (statusFilter) {
      list = list.filter((r) => repairListPipelineStatus(r) === statusFilter);
    }

    return list;
  }, [rows, managerFilter, statusFilter]);

  const emptyFilteredListMessage = useMemo(() => {
    if (rows.length === 0) return '';
    const byManager = managerFilter !== '';
    const byStatus = statusFilter !== '';
    if (byManager && byStatus) {
      return 'Нет договоров по выбранным фильтрам менеджера и статуса.';
    }
    if (byStatus) return 'Нет договоров с выбранным статусом.';
    if (byManager) return 'Нет договоров по выбранному фильтру менеджера.';
    return '';
  }, [rows.length, managerFilter, statusFilter]);

  useEffect(() => {
    if (!managerFilter) return;
    if (!managerFilterOptions.some((o) => o.id === managerFilter)) {
      setManagerFilter('');
    }
  }, [managerFilter, managerFilterOptions]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, users] = await Promise.all([
        getContractDocumentPackages('REPAIR'),
        getCrmUsers().catch(() => [] as CrmUser[]),
      ]);
      setRows(data);
      setCrmUsers(users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const created = await createContractDocumentPackage({
        kind: 'REPAIR',
        title: undefined,
        formData: {},
      });
      router.push(adminContractDocumentsContractsRepairPackageHref(created.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать');
    } finally {
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
        await deleteContractDocumentPackage(id);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось удалить пакет');
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
          return `Удалить черновик договора${suffix}? Действие необратимо.`;
        })()
      : '';

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <div className={styles.editorHeader}>
        <div>
          <Link className={styles.backLink} href={ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}>
            ← Договора
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            Договора — Ремонт
          </h1>
          {/* <p
            className={styles.hubCardHint}
            style={{ marginTop: 6, marginBottom: 0, maxWidth: 720 }}
          >
            Создавайте пакет документов: вкладка «Данные» для ввода, остальные вкладки подставляют
            значения в шаблоны.
          </p> */}
        </div>
        <div className={styles.headerButtonsRow}>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn}`}
            disabled={
              loading || creating || copyingPackageId !== null || deletingPackageId !== null
            }
            aria-busy={loading}
            aria-label={loading ? 'Обновление списка договоров' : 'Обновить список договоров'}
            title="Обновить список"
            onClick={() => void load()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? styles.estimatesRefreshIconSpinning : undefined}
              aria-hidden
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div
        className={`${styles.sectionCard} ${styles.estimatesListSection}`}
        style={{ marginBottom: 10 }}
      >
        <div className={styles.estimatesControlsSingleRow}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={
              creating || loading || copyingPackageId !== null || deletingPackageId !== null
            }
            onClick={() => void handleCreate()}
          >
            {creating ? 'Создание…' : 'Создать новый договор'}
          </button>
          <div className={styles.field} style={{ minWidth: 220, flex: '1 1 200px' }}>
            <label htmlFor="repair_list_manager_filter">Менеджер</label>
            <select
              id="repair_list_manager_filter"
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              disabled={loading}
            >
              <option value="">Все договоры</option>
              {managerFilterOptions.map(({ id, label }) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field} style={{ minWidth: 220, flex: '1 1 200px' }}>
            <label htmlFor="repair_list_status_filter">Статус</label>
            <select
              id="repair_list_status_filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter((e.target.value || '') as '' | RepairListPipelineStatus)
              }
              disabled={loading}
            >
              <option value="">Все</option>
              <option value="IN_PROJECT">В проекте</option>
              <option value="SIGNED">Подписан</option>
              <option value="WORK_IN_PROGRESS">В работе</option>
              <option value="CLOSED">Закрыт</option>
              <option value="REFUSED">Отказ</option>
            </select>
          </div>
          <div className={styles.estimatesFilterRowSpacer} aria-hidden />
        </div>

        {loading ? (
          <p className={styles.hint} style={{ margin: 'var(--admin-space-md) 0 0' }}>
            Загрузка…
          </p>
        ) : (
          <div className={styles.tableWrap} style={{ marginTop: 'var(--admin-space-md)' }}>
            <table className={`${styles.table} ${styles.repairContractsListTable}`}>
              <thead>
                <tr>
                  <th>№ дог.</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Заказчик</th>
                  <th>Менеджер</th>
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
                  <th>Остаток</th>
                  <th className={styles.repairContractsListActionsCol} />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={repairListTableColSpan}
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      Пока нет ни одного пакета. Нажмите «Создать новый договор».
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={repairListTableColSpan}
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      {emptyFilteredListMessage}
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((r) => {
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
                    const pipelineStatus = repairListPipelineStatus(r);
                    const actPhotoItems = repairListAttachedActPhotosFromForm(form);
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link
                            className={styles.link}
                            href={adminContractDocumentsContractsRepairPackageHref(r.id)}
                          >
                            {num}
                          </Link>
                        </td>
                        <td>
                          <span className={repairListPipelineStatusBadgeClass(pipelineStatus)}>
                            {repairListPipelineStatusLabel(pipelineStatus)}
                          </span>
                        </td>
                        <td>{formatSigningDateOnly(r)}</td>
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
                        <td className={styles.repairContractsListActionsCol}>
                          <div
                            className={`${styles.estimatesCardActions} ${styles.repairContractsListActionsGrid}`}
                          >
                            <div className={styles.repairContractsListActionsSlot}>
                              <button
                                type="button"
                                className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
                                disabled={
                                  loading ||
                                  creating ||
                                  copyingPackageId !== null ||
                                  deletingPackageId !== null
                                }
                                aria-label="Редактировать"
                                title="Редактировать"
                                onClick={() =>
                                  router.push(
                                    adminContractDocumentsContractsRepairPackageHref(r.id)
                                  )
                                }
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width={14}
                                  height={14}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="var(--admin-chart-series-1)"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  aria-hidden
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                            </div>
                            <div className={styles.repairContractsListActionsSlot}>
                              <button
                                type="button"
                                className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
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
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width={14}
                                  height={14}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="var(--admin-chart-series-2)"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={
                                    copyBusy ? styles.estimatesRefreshIconSpinning : undefined
                                  }
                                  aria-hidden
                                >
                                  <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              </button>
                            </div>
                            <div className={styles.repairContractsListActionsSlot}>
                              <button
                                type="button"
                                className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
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
                                    ? 'Удаление черновика…'
                                    : canDeleteDraft
                                      ? 'Удалить черновик'
                                      : 'Удаление недоступно: прикреплена смета или есть оплаты'
                                }
                                title={
                                  canDeleteDraft
                                    ? 'Удалить черновик (если нет прикреплённой сметы и записей об оплатах)'
                                    : 'Удалить нельзя: к договору прикреплена смета или в журнале есть оплаты'
                                }
                                onClick={() => requestDeletePackage(r)}
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width={14}
                                  height={14}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="var(--admin-chart-series-6)"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className={
                                    deleteBusy ? styles.estimatesRefreshIconSpinning : undefined
                                  }
                                  aria-hidden
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
                              </button>
                            </div>
                            <div className={styles.repairContractsListActionsSlot}>
                              {actPhotoItems.length > 0 ? (
                                <button
                                  type="button"
                                  className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
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
                                </button>
                              ) : (
                                <span
                                  className={`${styles.secondaryBtn} ${styles.estimatesIconBtn} ${styles.repairContractsListActionsIconPlaceholder}`}
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
        )}
      </div>

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
        title="Удалить черновик договора?"
        message={deleteConfirmMessage}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  );
}
