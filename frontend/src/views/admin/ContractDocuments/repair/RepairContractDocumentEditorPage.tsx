'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  type ContractDocumentPackagePayment,
  type ContractDocumentPackageStatus,
  type ContractDocumentPackageVersionListItem,
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  type ContractTemplatePreset,
  type ExecutorRequisiteProfile,
  getContractDocumentEstimatePresets,
  getContractDocumentExecutorProfiles,
  getContractDocumentGlobalTemplate,
  getContractDocumentPackage,
  getContractDocumentPackagePayments,
  getContractDocumentPackageVersions,
  getContractDocumentPackages,
  getContractDocumentSignatoryProfiles,
  getContractDocumentTemplatePresets,
  putContractDocumentTemplatePresets,
  updateContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractCustomer, InstallerMaster } from '@/shared/api/admin-crm';
import { getContract, getContractCustomers, getInstallers } from '@/shared/api/admin-crm';
import { AddCrmCustomerModal } from '@/views/admin/CRM/Customers/AddCrmCustomerModal';

import styles from '../ContractDocuments.module.css';
import { RepairAddendumEstimateBlock } from './RepairAddendumEstimateBlock';
import { RepairContractPaymentsTab } from './RepairContractPaymentsTab';
import { RepairManagerQuestionnaire1Tab } from './RepairManagerQuestionnaire1Tab';
import { RepairPostWorkQuestionnaire2Tab } from './RepairPostWorkQuestionnaire2Tab';
import { amountToRussianWords } from './amountToRussianWords';
import {
  mergeRepairFormFromCreatedCrmCustomer,
  mergeRepairFormFromCrmContract,
} from './applyCrmContractToForm';
import { applyTemplate } from './applyTemplate';
import { contractDateToDdMmYyyy, todayContractDateDdMmYyyy } from './contractDateFormat';
import {
  type RepairDocumentTemplateTabId,
  buildPersistedFormData,
  mergeFormDataFromStorage,
} from './formDataTemplateStorage';
import { buildManagerQuestionnaire1PrintHtml } from './managerQuestionnaire1Print';
import {
  getDisplayContractDate,
  getDisplayContractNumber,
  getRepairContractNumberDisplayForForm,
} from './packageContractDisplay';
import { buildPostWorkQuestionnaire2PrintHtml } from './postWorkQuestionnaire2Print';
import { pickPrintMarginFooterNames, printDocumentHtml } from './printDocument';
import {
  isRepairActTwinOneSheetTab,
  isRepairPlainCustomerTab,
  wrapRepairActTwinCopiesOnOnePageHtml,
} from './repairActTwinCopiesOnOnePageHtml';
import {
  type EstimateSnapshotRoom,
  applyEstimatePresetIdsToAddendumSlot,
  applyEstimatePresetIdsToRepairForm,
  getContractEstimateObjectGroupKey,
  getSnapshotForEstimateAttach,
  isContractEstimatePresetAttachable,
} from './repairApplyEstimatePresetIds';
import {
  applyRepairContractDiscountToAmount,
  parseRepairContractDiscountPercent,
  repairContractDiscountMoneyFactor,
  repairEstimateTotalToContractFields,
} from './repairContractDiscount';
import {
  REPAIR_DOCUMENT_TAB_IDS,
  REPAIR_DOCUMENT_TAB_LABELS,
  REPAIR_DOCUMENT_TAB_LABELS_SHORT,
  REPAIR_DOCUMENT_TAB_ORDER_STORAGE_KEY,
  REPAIR_DOCUMENT_TEMPLATES,
  type RepairDocumentTabId,
  isRepairAddendumTab,
  isRepairAddendumTabVisible,
  isRepairWorkOrderAddendumTab,
  normalizeLegacyRepairTabId,
  normalizeRepairDocumentTabOrder,
} from './repairDocumentTemplates';
import {
  type RepairManagerQuestionnaire1Block,
  type RepairPackageFormData,
  type RepairPostWorkQuestionnaire2Block,
  buildRepairTemplatePreviewFallbackData,
  mergeRepairPackageFormData,
  mergeRepairPackageFormWithPreviewFallback,
  repairPackageFormForTemplate,
} from './repairPackageForm';
import { computeRepairPackagePayableBreakdown } from './repairPackagePaymentTotals';

/** Класс на `document.body` при печати сметы — см. `@media print` в ContractDocuments.module.css */
const BODY_PRINT_ESTIMATE_CLASS = 'body-print-estimate-sheet';
const STATUS_REVERT_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Окно в шапке: отменить «Договор подписан» только сразу после установки статуса. */
const CONTRACT_SIGNED_REVERT_WINDOW_MS = 30 * 1000;
const CONTRACT_SIGNED_REVERT_RING_R = 15;
const CONTRACT_SIGNED_REVERT_RING_C = 2 * Math.PI * CONTRACT_SIGNED_REVERT_RING_R;

function isWithinRevertWindow(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= STATUS_REVERT_WINDOW_MS;
}

function isWithinMsSinceIso(iso: string | null | undefined, windowMs: number): boolean {
  if (!iso?.trim()) return false;
  const ts = Date.parse(iso.trim());
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts <= windowMs;
}

function sumPackagePaymentAmountsRub(rows: ContractDocumentPackagePayment[]): number {
  return rows.reduce((acc, r) => {
    const n = Number.parseFloat(r.amount);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/** Встроенный в код шаблон (если в БД нет общего шаблона). */
const FILE_REPAIR_CONTRACT_TEMPLATE = REPAIR_DOCUMENT_TEMPLATES.contract;
const TEMPLATE_TAB_IDS = REPAIR_DOCUMENT_TAB_IDS.filter(
  (id) =>
    id !== 'data' && id !== 'payments' && id !== 'estimate' && id !== 'interactiveFinalEstimate'
) as Exclude<RepairDocumentTabId, 'data' | 'payments' | 'estimate' | 'interactiveFinalEstimate'>[];

function normalizeTemplateTabId(
  value: string | undefined
): Exclude<RepairDocumentTabId, 'data' | 'payments' | 'estimate' | 'interactiveFinalEstimate'> {
  if (!value) return 'contract';
  const v = normalizeLegacyRepairTabId(value);
  return (TEMPLATE_TAB_IDS as string[]).includes(v)
    ? (v as Exclude<
        RepairDocumentTabId,
        'data' | 'payments' | 'estimate' | 'interactiveFinalEstimate'
      >)
    : 'contract';
}

function normalizeContractTemplatePreset(it: ContractTemplatePreset): ContractTemplatePreset {
  return {
    ...it,
    tabId: normalizeTemplateTabId(it.tabId),
    isProtected: Boolean(it.isProtected),
    archived: Boolean(it.archived),
  };
}

/** ID расчётов из сметы пакета и из всех слотов Д/с (для учёта «ещё в пакетах»). */
function collectEstimatePresetIdsFromRepairFormData(formData: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const est = formData.estimate;
  if (est && typeof est === 'object') {
    const e = est as Record<string, unknown>;
    if (typeof e.selectedPresetId === 'string' && e.selectedPresetId.trim()) {
      ids.push(e.selectedPresetId.trim());
    }
    if (Array.isArray(e.selectedPresetIds)) {
      for (const id of e.selectedPresetIds) {
        if (typeof id === 'string' && id.trim()) ids.push(id.trim());
      }
    }
  }
  const slots = formData.addendumSlots;
  if (Array.isArray(slots)) {
    for (const sl of slots) {
      if (!sl || typeof sl !== 'object') continue;
      const slot = sl as Record<string, unknown>;
      const addIdsFrom = (value: unknown) => {
        if (!Array.isArray(value)) return;
        for (const id of value) {
          if (typeof id === 'string' && id.trim()) ids.push(id.trim());
        }
      };
      addIdsFrom(slot.selectedPresetIds);
      addIdsFrom(slot.excludedSelectedPresetIds);
    }
  }
  return [...new Set(ids)];
}

function collectAddendumSlotPresetIds(
  slot: RepairPackageFormData['addendumSlots'][number]
): Set<string> {
  const ids = new Set<string>();
  for (const id of slot.selectedPresetIds ?? []) {
    if (id.trim()) ids.add(id.trim());
  }
  for (const id of slot.excludedSelectedPresetIds ?? []) {
    if (id.trim()) ids.add(id.trim());
  }
  return ids;
}

function isAddendumSlotEmpty(
  slot: RepairPackageFormData['addendumSlots'][number] | undefined,
  documentDate: string | undefined
): boolean {
  if (!slot) return true;
  const hasDate = (documentDate ?? '').trim() !== '';
  const hasSelected = (slot.selectedPresetIds?.length ?? 0) > 0;
  const hasExcluded = (slot.excludedSelectedPresetIds?.length ?? 0) > 0;
  const hasSnapshot = Boolean(slot.snapshot?.rooms?.length);
  const hasExcludedSnapshot = Boolean(slot.excludedSnapshot?.rooms?.length);
  const hasNotes = (slot.notes ?? '').trim() !== '' || (slot.excludedNotes ?? '').trim() !== '';
  const isSigned =
    slot.status === 'SIGNED' || slot.status === 'PAID' || (slot.signedAt ?? '').trim() !== '';
  const isPaid = (slot.paidAt ?? '').trim() !== '';
  return !(
    hasDate ||
    hasSelected ||
    hasExcluded ||
    hasSnapshot ||
    hasExcludedSnapshot ||
    hasNotes ||
    isSigned ||
    isPaid
  );
}

type FinalEstimateSummaryRow = {
  key: string;
  roomName: string;
  workName: string;
  unit: string;
  quantity: number;
  amount: number;
  includedQuantity: number;
  excludedQuantity: number;
};

type InstallerGradePercent = 0 | 5 | 10;

function parseInstallerGradePercent(rawGrade: string): InstallerGradePercent {
  const match = rawGrade.match(/\d+/);
  const rank = match ? Number.parseInt(match[0] ?? '', 10) : NaN;
  if (!Number.isFinite(rank)) return 0;
  if (rank >= 6) return 10;
  if (rank >= 5) return 5;
  return 0;
}

function formatInstallerGradeShort(rawGrade: string): string {
  const match = rawGrade.match(/\d+/);
  const rank = match ? Number.parseInt(match[0] ?? '', 10) : NaN;
  if (!Number.isFinite(rank)) return rawGrade.trim() || '—';
  return `${rank}р`;
}

function formatInstallerNameShort(fullName: string): string {
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

function formatMoneyRubShort(value: number): string {
  const rounded = Math.round(value);
  if (Math.abs(value - rounded) < 0.005) return `${rounded}`;
  return formatMoneyValue(value);
}

function buildFinalEstimateSummary(form: RepairPackageFormData): {
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
    snapshot: RepairPackageFormData['estimate']['snapshot'] | null | undefined,
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

function parseDecimalAmount(raw: string): number | null {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoneyValue(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function parsePercentForWorkOrder(raw: string): number {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
}

function normalizeWorkOrderGrade(v: unknown): 0 | 5 | 10 {
  return v === 5 || v === 10 ? v : 0;
}

function RepairEstimateSignaturesBlock({
  directorName,
  customerFullName,
}: {
  directorName: string;
  customerFullName: string;
}) {
  return (
    <div className={styles.estimateA4Signatures}>
      <table className={styles.estimateA4SignaturesTable}>
        <tbody>
          <tr>
            <td className={styles.estimateA4SignaturesCellLeft}>
              <p className={styles.estimateA4SignaturePartyLine}>
                Подрядчик _____________________ / {directorName}
              </p>
              <p className={styles.estimateA4SignNote}>м.п.</p>
            </td>
            <td className={styles.estimateA4SignaturesCellRight}>
              <p className={styles.estimateA4SignaturePartyLine}>
                Заказчик _____________________ / {customerFullName}
              </p>
              <p className={styles.estimateA4SignNote}>подпись</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function formatPackageVersionDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Дата присвоения статуса «Договор подписан»: «25.05.2026г.» */
function formatContractConcludedDateForHeader(iso: string | undefined): string | null {
  const s = iso?.trim();
  if (!s) return null;
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return null;
    const base = d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${base}г.`;
  } catch {
    return null;
  }
}

const PACKAGE_VERSION_MOMENT_LABELS: Record<string, string> = {
  packageCreated: 'Создание пакета',
  packageRollbackApplied: 'Восстановлено состояние из сохранённого снимка',
  packageFormDataUpdated: 'Изменены данные пакета',
  packageCustomerUpdated: 'Изменены данные заказчика',
  packageEstimateUpdated: 'Изменена смета',
  packageStatusUpdated: 'Изменён статус пакета',
  packageTitleUpdated: 'Изменено название черновика',
  packageCrmContractUpdated: 'Изменён связанный договор CRM',
};

function formatPackageVersionKeyMoments(keyMoments: string[] | undefined): string {
  if (!Array.isArray(keyMoments) || keyMoments.length === 0) return '—';
  const labels = keyMoments.map((key) => PACKAGE_VERSION_MOMENT_LABELS[key] ?? key);
  return labels.join(', ');
}

function formatPackageVersionActor(v: ContractDocumentPackageVersionListItem): string {
  const u = v.savedBy;
  if (!u) return '—';
  const name = [u.lastName, u.firstName].filter(Boolean).join(' ').trim();
  if (name) return name;
  const email = u.email?.trim();
  if (email) return email;
  return '—';
}

/** Иконка «история / версии» в шапке пакета (как у обновления и печати: 18×24, stroke). */
function PackageVersionsHistoryTriggerIcon() {
  return (
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
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function RepairTabLockIcon() {
  return (
    <svg
      className={styles.repairTabLockIcon}
      xmlns="http://www.w3.org/2000/svg"
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function RepairDataSectionLockCorner({ title }: { title: string }) {
  return (
    <div className={styles.repairDataSectionLockCorner} role="img" aria-label={title} title={title}>
      <RepairTabLockIcon />
    </div>
  );
}

interface RepairContractDocumentEditorPageProps {
  packageId: string;
}

/** Реквизиты исполнителя из справочника «Исполнители» (блок формы без подписанта). */
type RepairExecutorRequisitesFields = Pick<
  RepairPackageFormData['executor'],
  | 'executorKind'
  | 'companyName'
  | 'inn'
  | 'kpp'
  | 'ogrn'
  | 'ogrnip'
  | 'legalAddress'
  | 'actualAddress'
  | 'bankDetails'
  | 'email'
>;

function executorRequisitesFromProfile(
  profile: ExecutorRequisiteProfile
): RepairExecutorRequisitesFields {
  const kind = profile.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
  return {
    executorKind: kind,
    companyName: profile.companyName ?? '',
    inn: profile.inn ?? '',
    kpp: kind === 'ENTREPRENEUR' ? '' : (profile.kpp ?? ''),
    ogrn: kind === 'ENTREPRENEUR' ? '' : (profile.ogrn ?? ''),
    ogrnip: kind === 'ENTREPRENEUR' ? (profile.ogrnip ?? '') : '',
    legalAddress: profile.legalAddress ?? '',
    actualAddress: profile.actualAddress ?? '',
    bankDetails: profile.bankDetails ?? '',
    email: profile.email ?? '',
  };
}

function emptyExecutorRequisites(): RepairExecutorRequisitesFields {
  return {
    executorKind: 'COMPANY',
    companyName: '',
    inn: '',
    kpp: '',
    ogrn: '',
    ogrnip: '',
    legalAddress: '',
    actualAddress: '',
    bankDetails: '',
    email: '',
  };
}

/** Поля подписанта из справочника «Подписанты». */
type RepairSignatoryDirectoryFields = Pick<
  RepairPackageFormData['executor'],
  | 'signatoryCrmUserId'
  | 'directorNameNominative'
  | 'directorNameGenitive'
  | 'directorName'
  | 'basis'
  | 'salesOffice'
  | 'officePhone'
>;

function signatoryFieldsFromProfile(
  profile: ContractSignatoryProfile
): RepairSignatoryDirectoryFields {
  const nom = profile.directorNameNominative ?? '';
  return {
    signatoryCrmUserId: profile.crmUserId ?? '',
    directorNameNominative: nom,
    directorNameGenitive: profile.directorNameGenitive ?? '',
    directorName: nom,
    basis: profile.basis ?? '',
    salesOffice: profile.salesOffice ?? '',
    officePhone: profile.officePhone ?? '',
  };
}

function emptySignatoryDirectoryFields(): RepairSignatoryDirectoryFields {
  return {
    signatoryCrmUserId: '',
    directorNameNominative: '',
    directorNameGenitive: '',
    directorName: '',
    basis: '',
    salesOffice: '',
    officePhone: '',
  };
}

export function RepairContractDocumentEditorPage({
  packageId,
}: RepairContractDocumentEditorPageProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<RepairDocumentTabId>('data');
  const [activeFinalWorkOrderDocId, setActiveFinalWorkOrderDocId] = useState<string>('common');
  const activeAddendumSlot = useMemo(() => {
    const m = /^addendum([1-5])$/.exec(activeTab);
    return m ? Number(m[1]) : null;
  }, [activeTab]);

  const [repairTabOrder, setRepairTabOrder] = useState<RepairDocumentTabId[]>(() => [
    ...REPAIR_DOCUMENT_TAB_IDS,
  ]);
  /** Пропускаем первую запись в LS до применения порядка из хранилища (избегаем перезаписи дефолтом). */
  const skipRepairTabOrderPersistRef = useRef(true);
  const suppressRepairTabClickAfterReorderRef = useRef(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [form, setForm] = useState<RepairPackageFormData>(() => mergeRepairPackageFormData({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [customerSearchKind, setCustomerSearchKind] = useState<
    'PERSON' | 'COMPANY' | 'ENTREPRENEUR'
  >('PERSON');
  const [customerFlFio, setCustomerFlFio] = useState('');
  const [customerFlPhone, setCustomerFlPhone] = useState('');
  const [customerFlAddress, setCustomerFlAddress] = useState('');
  const [customerUlOrg, setCustomerUlOrg] = useState('');
  const [customerUlInn, setCustomerUlInn] = useState('');
  const [customerResults, setCustomerResults] = useState<ContractCustomer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSearchPopoverOpen, setCustomerSearchPopoverOpen] = useState(false);
  const [addCrmCustomerModalOpen, setAddCrmCustomerModalOpen] = useState(false);
  const customerSearchRootRef = useRef<HTMLDivElement>(null);
  const [templateOverrides, setTemplateOverrides] = useState<
    Partial<Record<RepairDocumentTemplateTabId, string>>
  >({});
  const [excelMessage, setExcelMessage] = useState<string | null>(null);
  const contractHtmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const estimatePrintSheetRef = useRef<HTMLElement | null>(null);
  const [contractDocView, setContractDocView] = useState<'preview' | 'edit'>('preview');
  const [formatToolbarLevel, setFormatToolbarLevel] = useState<'basic' | 'advanced'>('basic');
  const [formatToolbarQuery, setFormatToolbarQuery] = useState('');
  const [showAllFormatTools, setShowAllFormatTools] = useState(false);
  const [globalContractState, setGlobalContractState] = useState<{
    loaded: boolean;
    html: string | null;
  }>({ loaded: false, html: null });
  const [executorProfiles, setExecutorProfiles] = useState<ExecutorRequisiteProfile[]>([]);
  const [signatoryProfiles, setSignatoryProfiles] = useState<ContractSignatoryProfile[]>([]);
  const [contractTemplatePresets, setContractTemplatePresets] = useState<ContractTemplatePreset[]>(
    []
  );
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<
    Partial<Record<RepairDocumentTemplateTabId, string>>
  >({});
  const [editingTemplateId, setEditingTemplateId] = useState<string>('');
  const [templateDraftTitle, setTemplateDraftTitle] = useState('');
  const [templateDraftHtml, setTemplateDraftHtml] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [estimatePresets, setEstimatePresets] = useState<ContractEstimatePreset[]>([]);
  const [repairInstallers, setRepairInstallers] = useState<InstallerMaster[]>([]);
  const [activeRepairInstallerId, setActiveRepairInstallerId] = useState('');
  const [estimateGroups, setEstimateGroups] = useState<ContractEstimateGroup[]>([]);
  /** '' | '__ungrouped__' | id группы — для связки с выбором расчёта. */
  const [estimateAttachGroupKey, setEstimateAttachGroupKey] = useState('');
  const [estimatePresetToAttach, setEstimatePresetToAttach] = useState('');
  const [draggingEstimatePresetId, setDraggingEstimatePresetId] = useState<string | null>(null);
  const [addendumPresetToAttach, setAddendumPresetToAttach] = useState('');
  const [addendumExcludedPresetToAttach, setAddendumExcludedPresetToAttach] = useState('');
  const [draggingAddendumEstimatePresetId, setDraggingAddendumEstimatePresetId] = useState<
    string | null
  >(null);
  const [draggingAddendumExcludedEstimatePresetId, setDraggingAddendumExcludedEstimatePresetId] =
    useState<string | null>(null);
  const [repairPackages, setRepairPackages] = useState<
    Array<{
      id: string;
      title: string | null;
      formData: Record<string, unknown>;
    }>
  >([]);
  const [packageRefreshing, setPackageRefreshing] = useState(false);
  /** Сумма строк журнала оплат (для бейджа % в шапке после «Договор подписан»). */
  const [headerJournalPaidRub, setHeaderJournalPaidRub] = useState(0);
  const [repairHeaderUndoUiTick, setRepairHeaderUndoUiTick] = useState(0);
  const [packageFlowStatus, setPackageFlowStatus] =
    useState<ContractDocumentPackageStatus>('IN_PROGRESS');
  /** После «Договор подписан» вкладки «Договор» и «Смета» только для просмотра. */
  const contractAndEstimateLocked = packageFlowStatus === 'CONTRACT_CONCLUDED';
  /** После подписания договора с вкладки «Оплаты» можно править только эти поля `contract.*`. */
  const REPAIR_CONTRACT_FIELDS_EDITABLE_WHEN_SIGNED = new Set<string>([
    'prepaymentAmount',
    'prepaymentAmountWords',
    'paymentBasis',
    'totalAmountWords',
  ]);
  const canRevertContractConcluded =
    packageFlowStatus === 'CONTRACT_CONCLUDED' &&
    isWithinMsSinceIso(form.contractConcludedAt, CONTRACT_SIGNED_REVERT_WINDOW_MS);
  const isContractPaid = (form.contractPaidAt ?? '').trim() !== '';
  const canRevertContractPaid = isContractPaid && isWithinRevertWindow(form.contractPaidAt);
  const signedAddendumOrdinals = useMemo(
    () =>
      form.addendumSlots
        .map((slot, i) => (slot.status === 'SIGNED' ? i + 1 : null))
        .filter((v): v is number => v !== null),
    [form.addendumSlots]
  );
  const paidAddendumOrdinals = useMemo(
    () =>
      form.addendumSlots
        .map((slot, i) => (slot.status === 'PAID' ? i + 1 : null))
        .filter((v): v is number => v !== null),
    [form.addendumSlots]
  );

  const contractSignedRevertRemainingMs = useMemo(() => {
    if (packageFlowStatus !== 'CONTRACT_CONCLUDED') return 0;
    const iso = form.contractConcludedAt?.trim();
    if (!iso) return 0;
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return 0;
    const deadline = ts + CONTRACT_SIGNED_REVERT_WINDOW_MS;
    return Math.max(0, deadline - Date.now());
  }, [packageFlowStatus, form.contractConcludedAt, repairHeaderUndoUiTick]);

  const addendumSignedRevertUis = useMemo(() => {
    const rows: Array<{ slotIndex0: number; remainingMs: number }> = [];
    const count = Math.min(
      5,
      Math.max(1, Number.isFinite(form.addendumSlotCount) ? form.addendumSlotCount : 1)
    );
    for (let i = 0; i < count; i++) {
      const slot = form.addendumSlots[i];
      if (slot?.status !== 'SIGNED') continue;
      const iso = slot.signedAt?.trim();
      if (!iso) continue;
      const ts = Date.parse(iso);
      if (!Number.isFinite(ts)) continue;
      const deadline = ts + CONTRACT_SIGNED_REVERT_WINDOW_MS;
      const remainingMs = Math.max(0, deadline - Date.now());
      if (remainingMs > 0) {
        rows.push({ slotIndex0: i, remainingMs });
      }
    }
    return rows;
  }, [form.addendumSlotCount, form.addendumSlots, repairHeaderUndoUiTick]);

  useEffect(() => {
    const now = Date.now();
    let latestActiveEnd = 0;
    if (packageFlowStatus === 'CONTRACT_CONCLUDED') {
      const iso = form.contractConcludedAt?.trim();
      if (iso) {
        const ts = Date.parse(iso);
        if (Number.isFinite(ts)) {
          const d = ts + CONTRACT_SIGNED_REVERT_WINDOW_MS;
          if (d > now) latestActiveEnd = Math.max(latestActiveEnd, d);
        }
      }
    }
    const count = Math.min(
      5,
      Math.max(1, Number.isFinite(form.addendumSlotCount) ? form.addendumSlotCount : 1)
    );
    for (let i = 0; i < count; i++) {
      const slot = form.addendumSlots[i];
      if (slot?.status !== 'SIGNED') continue;
      const iso = slot.signedAt?.trim();
      if (!iso) continue;
      const ts = Date.parse(iso);
      if (!Number.isFinite(ts)) continue;
      const d = ts + CONTRACT_SIGNED_REVERT_WINDOW_MS;
      if (d > now) latestActiveEnd = Math.max(latestActiveEnd, d);
    }
    if (latestActiveEnd === 0) return;
    const id = window.setInterval(() => {
      setRepairHeaderUndoUiTick((v) => v + 1);
      if (Date.now() >= latestActiveEnd) {
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [packageFlowStatus, form.contractConcludedAt, form.addendumSlotCount, form.addendumSlots]);

  const headerPayableBreakdown = useMemo(() => computeRepairPackagePayableBreakdown(form), [form]);

  /** Круглый бейдж % оплаты от «Итого» (договор + Д/с) для шапки при статусе «Договор подписан». */
  const signedContractPayOrb = useMemo(() => {
    if (packageFlowStatus !== 'CONTRACT_CONCLUDED') return null;
    const gt = headerPayableBreakdown.grandTotalRub;
    if (gt == null || !Number.isFinite(gt) || gt <= 0) return null;
    const paid = headerJournalPaidRub;
    const pct = (paid / gt) * 100;
    const tolRub = 0.5;
    const treatAsFull = paid >= gt - tolRub;
    const roundedPct = Math.round(pct);
    const label = treatAsFull ? '100%' : `${roundedPct}%`;
    let toneClass: string;
    if (treatAsFull || roundedPct >= 100) {
      toneClass = styles.packageFlowPayPctOrbGreen;
    } else if (roundedPct >= 70) {
      toneClass = styles.packageFlowPayPctOrbLime;
    } else {
      toneClass = styles.packageFlowPayPctOrbYellow;
    }
    const paidFmt = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(paid);
    const gtFmt = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    }).format(gt);
    const title = `Внесено по журналу: ${paidFmt} (${label} от суммы «Итого» на вкладке «Оплаты»: ${gtFmt})`;
    return { label, toneClass, title };
  }, [packageFlowStatus, headerPayableBreakdown.grandTotalRub, headerJournalPaidRub]);
  const [savingPackageStatus, setSavingPackageStatus] = useState(false);
  const [packageVersions, setPackageVersions] = useState<ContractDocumentPackageVersionListItem[]>(
    []
  );
  const [versionsBusy, setVersionsBusy] = useState(false);
  const [isVersionsHistoryOpen, setIsVersionsHistoryOpen] = useState(false);

  /** Актуальная форма для отложенного сохранения (после setState ref обновится на следующем рендере). */
  const formRef = useRef(form);
  formRef.current = form;
  const templateOverridesRef = useRef(templateOverrides);
  templateOverridesRef.current = templateOverrides;
  const selectedTemplateIdsRef = useRef(selectedTemplateIds);
  selectedTemplateIdsRef.current = selectedTemplateIds;
  const draftTitleRef = useRef(draftTitle);
  draftTitleRef.current = draftTitle;

  /** В браузере `setTimeout` возвращает `number`; при подмешанных типах Node — не `NodeJS.Timeout`. */
  const persistRepairPackageDebounceRef = useRef<number | null>(null);

  const schedulePersistRepairPackageDebounced = useCallback(() => {
    if (loading) return;
    if (persistRepairPackageDebounceRef.current !== null) {
      window.clearTimeout(persistRepairPackageDebounceRef.current);
    }
    persistRepairPackageDebounceRef.current = window.setTimeout(() => {
      persistRepairPackageDebounceRef.current = null;
      const payload = formRef.current;
      const formData = buildPersistedFormData(
        payload,
        templateOverridesRef.current,
        selectedTemplateIdsRef.current
      );
      void (async () => {
        try {
          await updateContractDocumentPackage(packageId, {
            title: draftTitleRef.current.trim() || null,
            formData,
            crmContractId: null,
            recordVersion: true,
          });
          setDirty(false);
          setRepairPackages((prev) =>
            prev.map((p) => (p.id === packageId ? { ...p, formData } : p))
          );
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Не удалось сохранить прикреплённые расчёты');
        }
      })();
    }, 300);
  }, [loading, packageId]);

  /** Любые правки данных пакета: помечаем «грязным» и откладываем запись на сервер (~300 мс). */
  const touchPackageData = useCallback(() => {
    setDirty(true);
    schedulePersistRepairPackageDebounced();
  }, [schedulePersistRepairPackageDebounced]);

  const handleRepairTabDragStart = useCallback(
    (id: RepairDocumentTabId, e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-repair-tab', id);
      e.dataTransfer.setData('text/plain', id);
    },
    []
  );

  const handleRepairTabDragOver = useCallback((e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleRepairTabDrop = useCallback((targetId: RepairDocumentTabId) => {
    return (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const raw =
        e.dataTransfer.getData('application/x-repair-tab') || e.dataTransfer.getData('text/plain');
      const normalized = raw ? normalizeLegacyRepairTabId(raw) : '';
      const fromId =
        normalized && (REPAIR_DOCUMENT_TAB_IDS as readonly string[]).includes(normalized)
          ? (normalized as RepairDocumentTabId)
          : null;
      if (!fromId || fromId === targetId) return;
      suppressRepairTabClickAfterReorderRef.current = true;
      setRepairTabOrder((order) => {
        const next = order.filter((tid) => tid !== fromId);
        const insertAt = next.indexOf(targetId);
        if (insertAt < 0) return order;
        next.splice(insertAt, 0, fromId);
        return next;
      });
    };
  }, []);

  const handleRepairTabActivate = useCallback((id: RepairDocumentTabId) => {
    if (suppressRepairTabClickAfterReorderRef.current) {
      suppressRepairTabClickAfterReorderRef.current = false;
      return;
    }
    setActiveTab(id);
  }, []);

  useEffect(() => {
    try {
      const raw = JSON.parse(
        window.localStorage.getItem(REPAIR_DOCUMENT_TAB_ORDER_STORAGE_KEY) ?? 'null'
      );
      setRepairTabOrder(normalizeRepairDocumentTabOrder(raw));
    } catch {
      /* keep default */
    }
    queueMicrotask(() => {
      skipRepairTabOrderPersistRef.current = false;
    });
  }, []);

  useEffect(() => {
    if (skipRepairTabOrderPersistRef.current) return;
    try {
      window.localStorage.setItem(
        REPAIR_DOCUMENT_TAB_ORDER_STORAGE_KEY,
        JSON.stringify(repairTabOrder)
      );
    } catch {
      /* ignore */
    }
  }, [repairTabOrder]);

  useEffect(() => {
    const m = /^addendum(\d+)$/.exec(activeTab);
    if (!m) return;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= form.addendumSlotCount) return;
    const fallback = `addendum${form.addendumSlotCount}` as RepairDocumentTabId;
    setActiveTab(fallback);
  }, [activeTab, form.addendumSlotCount]);

  useEffect(() => {
    return () => {
      if (persistRepairPackageDebounceRef.current !== null) {
        window.clearTimeout(persistRepairPackageDebounceRef.current);
        persistRepairPackageDebounceRef.current = null;
      }
    };
  }, [packageId]);

  const templatePresetsByTab = useMemo(() => {
    const map = new Map<RepairDocumentTemplateTabId, ContractTemplatePreset[]>();
    for (const tab of TEMPLATE_TAB_IDS) map.set(tab, []);
    for (const item of contractTemplatePresets) {
      if (item.archived) continue;
      const tab = normalizeTemplateTabId(item.tabId);
      map.set(tab, [...(map.get(tab) ?? []), { ...item, tabId: tab }]);
    }
    return map;
  }, [contractTemplatePresets]);

  const resolveTemplateHtml = useCallback(
    (tab: RepairDocumentTemplateTabId): string => {
      const list = templatePresetsByTab.get(tab) ?? [];
      const selectedId = selectedTemplateIds[tab] ?? '';
      const selected = list.find((it) => it.id === selectedId);
      if (selected?.html?.trim()) return selected.html;
      const fallback = list.find((it) => it.isDefault) ?? list[0];
      if (fallback?.html?.trim()) return fallback.html;
      if (tab === 'contract') {
        if (!globalContractState.loaded) return FILE_REPAIR_CONTRACT_TEMPLATE;
        if (globalContractState.html !== null) return globalContractState.html;
      }
      return REPAIR_DOCUMENT_TEMPLATES[tab];
    },
    [templatePresetsByTab, selectedTemplateIds, globalContractState]
  );

  const refreshPackageVersions = useCallback(
    async (opts?: { skipSpinner?: boolean }) => {
      if (!opts?.skipSpinner) setVersionsBusy(true);
      try {
        const list = await getContractDocumentPackageVersions(packageId);
        setPackageVersions(list);
      } catch {
        setPackageVersions([]);
      } finally {
        if (!opts?.skipSpinner) setVersionsBusy(false);
      }
    },
    [packageId]
  );

  const refreshHeaderJournalPaidRub = useCallback(async () => {
    try {
      const list = await getContractDocumentPackagePayments(packageId);
      setHeaderJournalPaidRub(sumPackagePaymentAmountsRub(list));
    } catch {
      /* не блокируем шапку */
    }
  }, [packageId]);

  const load = useCallback(
    async (opts?: { mode?: 'initial' | 'refresh' }) => {
      const isRefresh = opts?.mode === 'refresh';
      if (isRefresh) {
        setPackageRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      if (!isRefresh) {
        setPackageVersions([]);
      }
      try {
        const [
          row,
          globalTpl,
          profilesRes,
          signatoryRes,
          templateRes,
          estimateRes,
          packagesRes,
          installersRes,
          paymentsRes,
        ] = await Promise.all([
          getContractDocumentPackage(packageId),
          getContractDocumentGlobalTemplate('REPAIR', 'contract').catch(() => ({
            html: null as string | null,
            updatedAt: null as string | null,
          })),
          getContractDocumentExecutorProfiles('REPAIR').catch(() => ({
            items: [] as ExecutorRequisiteProfile[],
            updatedAt: null as string | null,
          })),
          getContractDocumentSignatoryProfiles('REPAIR').catch(() => ({
            items: [] as ContractSignatoryProfile[],
            updatedAt: null as string | null,
          })),
          getContractDocumentTemplatePresets('REPAIR').catch(() => ({
            items: [] as ContractTemplatePreset[],
            updatedAt: null as string | null,
          })),
          getContractDocumentEstimatePresets('REPAIR').catch(() => ({
            items: [] as ContractEstimatePreset[],
            groups: [],
            updatedAt: null as string | null,
          })),
          getContractDocumentPackages('REPAIR').catch(() => []),
          getInstallers().catch(() => [] as InstallerMaster[]),
          getContractDocumentPackagePayments(packageId).catch(
            () => [] as ContractDocumentPackagePayment[]
          ),
        ]);
        if (row.kind !== 'REPAIR') {
          setError('Этот пакет относится к другому направлению.');
          setHeaderJournalPaidRub(0);
          return;
        }
        setHeaderJournalPaidRub(sumPackagePaymentAmountsRub(paymentsRes ?? []));
        setDraftTitle(row.title ?? '');
        setPackageFlowStatus(
          row.status === 'CONTRACT_CONCLUDED' ? 'CONTRACT_CONCLUDED' : 'IN_PROGRESS'
        );
        const {
          form: mergedForm,
          templateOverrides: ov,
          contractTemplateId,
          templatePresetIds,
        } = mergeFormDataFromStorage(row.formData);
        const normalizedEstimateIds = [
          ...new Set([
            ...(Array.isArray(mergedForm.estimate.selectedPresetIds)
              ? mergedForm.estimate.selectedPresetIds.filter(
                  (x): x is string => typeof x === 'string' && x.trim().length > 0
                )
              : []),
            ...(mergedForm.estimate.selectedPresetId?.trim()
              ? [mergedForm.estimate.selectedPresetId.trim()]
              : []),
          ]),
        ];
        const rawStoredDate = mergedForm.contract.date?.trim() ?? '';
        const normalizedStoredDate = rawStoredDate ? contractDateToDdMmYyyy(rawStoredDate) : '';
        const contractDateAutofill = !normalizedStoredDate;
        const dateMigratedFromLegacy = Boolean(
          rawStoredDate && normalizedStoredDate && normalizedStoredDate !== rawStoredDate
        );
        const contractDate = contractDateAutofill
          ? todayContractDateDdMmYyyy()
          : normalizedStoredDate;
        const persistContractDate = contractDateAutofill || dateMigratedFromLegacy;

        const mergedContractNumber = mergedForm.contract.number?.trim() ?? '';
        const contractNumber = mergedContractNumber;
        const persistContractMeta = persistContractDate;

        const formPayload: RepairPackageFormData = {
          ...mergedForm,
          contract: {
            ...mergedForm.contract,
            number: contractNumber,
            date: contractDate,
          },
          estimate: {
            ...mergedForm.estimate,
            selectedPresetIds: normalizedEstimateIds,
            selectedPresetId: normalizedEstimateIds[0] ?? '',
          },
        };
        const presetsList = estimateRes.items ?? [];
        const estGroupsList = estimateRes.groups ?? [];
        let finalForm: RepairPackageFormData = formPayload;
        if (normalizedEstimateIds.length > 0) {
          finalForm = applyEstimatePresetIdsToRepairForm(
            finalForm,
            normalizedEstimateIds,
            presetsList,
            estGroupsList
          );
        }
        for (let i = 0; i < 5; i++) {
          const slot = finalForm.addendumSlots[i];
          const add = [...(slot?.selectedPresetIds ?? [])];
          if (add.length > 0) {
            finalForm = applyEstimatePresetIdsToAddendumSlot(
              finalForm,
              i,
              add,
              presetsList,
              estGroupsList,
              'additional'
            );
          }
          const exc = [...(slot?.excludedSelectedPresetIds ?? [])];
          if (exc.length > 0) {
            finalForm = applyEstimatePresetIdsToAddendumSlot(
              finalForm,
              i,
              exc,
              presetsList,
              estGroupsList,
              'excluded'
            );
          }
        }
        setForm(finalForm);
        const overridesSansContract = { ...ov };
        delete overridesSansContract.contract;
        setTemplateOverrides(overridesSansContract);
        setGlobalContractState({ loaded: true, html: globalTpl.html });
        setExecutorProfiles(profilesRes.items ?? []);
        setSignatoryProfiles(signatoryRes.items ?? []);
        const templates = templateRes.items ?? [];
        setEstimatePresets(estimateRes.items ?? []);
        setRepairInstallers(
          (installersRes ?? []).filter((installer) => installer.direction === 'REPAIR')
        );
        setEstimateGroups(estimateRes.groups ?? []);
        setEstimateAttachGroupKey('');
        setEstimatePresetToAttach('');
        setRepairPackages(
          (packagesRes ?? []).map((p) => ({
            id: p.id,
            title: p.title ?? null,
            formData: (p.formData ?? {}) as Record<string, unknown>,
          }))
        );
        const normalizedTemplates = templates.map((it) => normalizeContractTemplatePreset(it));
        setContractTemplatePresets(normalizedTemplates);
        const selectedIds = { ...templatePresetIds };
        if (contractTemplateId && !selectedIds.contract) {
          selectedIds.contract = contractTemplateId;
        }
        for (const tab of TEMPLATE_TAB_IDS) {
          const tabItems = normalizedTemplates.filter(
            (it) => normalizeTemplateTabId(it.tabId) === tab && !it.archived
          );
          const sid = selectedIds[tab];
          if (!sid || !tabItems.some((it) => it.id === sid)) {
            selectedIds[tab] = tabItems.find((it) => it.isDefault)?.id ?? tabItems[0]?.id ?? '';
          }
        }
        setSelectedTemplateIds(selectedIds);
        const initialTemplateId = selectedIds.contract ?? '';
        setEditingTemplateId(initialTemplateId);
        const initialTpl = normalizedTemplates.find((it) => it.id === initialTemplateId);
        setTemplateDraftTitle(initialTpl?.title ?? '');
        setTemplateDraftHtml(initialTpl?.html ?? '');
        setExcelMessage(null);
        if (persistContractMeta) {
          try {
            await updateContractDocumentPackage(packageId, {
              title: row.title?.trim() || null,
              formData: buildPersistedFormData(finalForm, overridesSansContract, selectedIds),
              crmContractId: null,
              recordVersion: true,
            });
            setRepairPackages((prev) =>
              prev.map((p) =>
                p.id === packageId
                  ? {
                      ...p,
                      formData: buildPersistedFormData(
                        finalForm,
                        overridesSansContract,
                        selectedIds
                      ) as Record<string, unknown>,
                    }
                  : p
              )
            );
          } catch {
            /* оставляем дату в форме; при следующем изменении сработает автосохранение */
          }
        }
        await refreshPackageVersions({ skipSpinner: true });
        setDirty(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (isRefresh) {
          setPackageRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [packageId, refreshPackageVersions]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const prevRepairActiveTabRef = useRef<RepairDocumentTabId>(activeTab);
  useEffect(() => {
    const prev = prevRepairActiveTabRef.current;
    prevRepairActiveTabRef.current = activeTab;
    if (prev === 'payments' && activeTab !== 'payments') {
      void refreshHeaderJournalPaidRub();
    }
  }, [activeTab, refreshHeaderJournalPaidRub]);

  useEffect(() => {
    if (isVersionsHistoryOpen && !loading) {
      void refreshPackageVersions({ skipSpinner: true });
    }
  }, [isVersionsHistoryOpen, loading, refreshPackageVersions]);

  useEffect(() => {
    if (!isVersionsHistoryOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarGap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarGap > 0) {
      document.body.style.paddingRight = `${scrollbarGap}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isVersionsHistoryOpen]);

  const customerSearchQuery = useMemo(() => {
    if (customerSearchKind === 'PERSON') {
      return [customerFlFio, customerFlPhone, customerFlAddress]
        .map((s) => s.trim())
        .filter(Boolean)
        .join(' ');
    }
    return [customerUlOrg, customerUlInn]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' ');
  }, [
    customerSearchKind,
    customerFlFio,
    customerFlPhone,
    customerFlAddress,
    customerUlOrg,
    customerUlInn,
  ]);

  const openCustomerSearchPopoverIfReady = useCallback(() => {
    if (contractAndEstimateLocked) return;
    if (customerSearchQuery.trim().length >= 2) {
      setCustomerSearchPopoverOpen(true);
    }
  }, [customerSearchQuery, contractAndEstimateLocked]);

  const searchCustomersFromContracts = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    setCustomerSearchLoading(true);
    try {
      const res = await getContractCustomers(q);
      setCustomerResults(res.customers);
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void searchCustomersFromContracts(customerSearchQuery);
    }, 400);
    return () => window.clearTimeout(t);
  }, [customerSearchQuery, searchCustomersFromContracts]);

  useEffect(() => {
    if (customerSearchQuery.trim().length < 2) {
      setCustomerSearchPopoverOpen(false);
      return;
    }
    setCustomerSearchPopoverOpen(true);
  }, [customerSearchQuery]);

  useEffect(() => {
    if (!customerSearchPopoverOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const root = customerSearchRootRef.current;
      if (!root) return;
      const t = e.target;
      if (t instanceof Node && !root.contains(t)) {
        setCustomerSearchPopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown, true);
    return () => document.removeEventListener('mousedown', onDocMouseDown, true);
  }, [customerSearchPopoverOpen]);

  useEffect(() => {
    const t = form.customer.type;
    setCustomerSearchKind(
      t === 'PERSON' ? 'PERSON' : t === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY'
    );
  }, [form.customer.type]);

  const handleMarkContractConcluded = async () => {
    setSavingPackageStatus(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const nextForm = { ...formRef.current, contractConcludedAt: nowIso, contractPaidAt: '' };
      const formData = buildPersistedFormData(
        nextForm,
        templateOverridesRef.current,
        selectedTemplateIdsRef.current
      );
      await updateContractDocumentPackage(packageId, {
        status: 'CONTRACT_CONCLUDED',
        formData,
        recordVersion: true,
      });
      setPackageFlowStatus('CONTRACT_CONCLUDED');
      setForm(nextForm);
      formRef.current = nextForm;
      await refreshPackageVersions({ skipSpinner: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось обновить статус пакета');
    } finally {
      setSavingPackageStatus(false);
    }
  };

  const confirmRevertContractConcluded = async () => {
    if (!canRevertContractConcluded) {
      setError('Снять статус «Договор подписан» можно только в течение 30 секунд после установки.');
      return;
    }
    setSavingPackageStatus(true);
    setError(null);
    try {
      const nextForm = { ...formRef.current, contractConcludedAt: '', contractPaidAt: '' };
      const formData = buildPersistedFormData(
        nextForm,
        templateOverridesRef.current,
        selectedTemplateIdsRef.current
      );
      await updateContractDocumentPackage(packageId, {
        status: 'IN_PROGRESS',
        formData,
        recordVersion: true,
      });
      setPackageFlowStatus('IN_PROGRESS');
      setForm(nextForm);
      formRef.current = nextForm;
      await refreshPackageVersions({ skipSpinner: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось снять отметку');
    } finally {
      setSavingPackageStatus(false);
    }
  };

  const handleRevertContractPaid = async () => {
    if (!canRevertContractPaid) {
      setError('Снять статус «Договор оплачен» можно только в течение 24 часов после установки.');
      return;
    }
    setSavingPackageStatus(true);
    setError(null);
    try {
      const nextForm = { ...formRef.current, contractPaidAt: '' };
      const formData = buildPersistedFormData(
        nextForm,
        templateOverridesRef.current,
        selectedTemplateIdsRef.current
      );
      await updateContractDocumentPackage(packageId, {
        status: packageFlowStatus,
        formData,
        recordVersion: true,
      });
      setForm(nextForm);
      formRef.current = nextForm;
      await refreshPackageVersions({ skipSpinner: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось снять статус «Договор оплачен»');
    } finally {
      setSavingPackageStatus(false);
    }
  };

  const applyCrmContractToFormById = async (contractId: string, searchRow: ContractCustomer) => {
    if (contractAndEstimateLocked) return;
    setError(null);
    try {
      const c = await getContract(contractId);
      const nextForm = mergeRepairFormFromCrmContract(c, formRef.current, searchRow);
      setForm(nextForm);
      touchPackageData();
      setCustomerSearchPopoverOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить договор CRM');
    }
  };

  const repairCustomerPhonesReadonlyDisplay = useMemo(() => {
    const parts = (form.customer.phones ?? []).map((p) => p.trim()).filter(Boolean);
    const joined = parts.join(', ');
    if (joined) return joined;
    return (form.customer.phone ?? '').trim() || '—';
  }, [form.customer.phones, form.customer.phone]);

  const applyExecutorProfile = (title: string) => {
    if (contractAndEstimateLocked) return;
    setForm((p) => {
      const profile = executorProfiles.find((it) => it.title === title);
      if (!profile) {
        return {
          ...p,
          executor: {
            ...p.executor,
            selectedProfileTitle: '',
            ...emptyExecutorRequisites(),
          },
        };
      }
      return {
        ...p,
        executor: {
          ...p.executor,
          selectedProfileTitle: title,
          ...executorRequisitesFromProfile(profile),
        },
      };
    });
    touchPackageData();
  };

  useEffect(() => {
    const title = form.executor.selectedProfileTitle?.trim();
    if (!title || executorProfiles.length === 0) return;
    const profile = executorProfiles.find((it) => it.title === title);
    if (!profile) return;
    const fromProfile = executorRequisitesFromProfile(profile);
    setForm((prev) => {
      if (prev.executor.selectedProfileTitle?.trim() !== title) return prev;
      const keys = Object.keys(fromProfile) as (keyof RepairExecutorRequisitesFields)[];
      if (keys.every((k) => prev.executor[k] === fromProfile[k])) return prev;
      return {
        ...prev,
        executor: {
          ...prev.executor,
          selectedProfileTitle: title,
          ...fromProfile,
        },
      };
    });
  }, [executorProfiles, form.executor.selectedProfileTitle]);

  const applySignatoryProfile = (title: string) => {
    if (contractAndEstimateLocked) return;
    setForm((p) => {
      const profile = signatoryProfiles.find((it) => it.title === title);
      if (!profile) {
        return {
          ...p,
          executor: {
            ...p.executor,
            selectedSignatoryProfileTitle: '',
            ...emptySignatoryDirectoryFields(),
          },
        };
      }
      return {
        ...p,
        executor: {
          ...p.executor,
          selectedSignatoryProfileTitle: title,
          ...signatoryFieldsFromProfile(profile),
        },
      };
    });
    touchPackageData();
  };

  useEffect(() => {
    const title = form.executor.selectedSignatoryProfileTitle?.trim();
    if (!title || signatoryProfiles.length === 0) return;
    const profile = signatoryProfiles.find((it) => it.title === title);
    if (!profile) return;
    const fromProfile = signatoryFieldsFromProfile(profile);
    setForm((prev) => {
      if (prev.executor.selectedSignatoryProfileTitle?.trim() !== title) return prev;
      const keys = Object.keys(fromProfile) as (keyof RepairSignatoryDirectoryFields)[];
      if (keys.every((k) => prev.executor[k] === fromProfile[k])) return prev;
      return {
        ...prev,
        executor: {
          ...prev.executor,
          selectedSignatoryProfileTitle: title,
          ...fromProfile,
        },
      };
    });
  }, [signatoryProfiles, form.executor.selectedSignatoryProfileTitle]);

  const updateObject = <K extends keyof RepairPackageFormData['object']>(key: K, value: string) => {
    if (contractAndEstimateLocked) return;
    setForm((p) => ({ ...p, object: { ...p.object, [key]: value } }));
    touchPackageData();
  };

  const updateWorkOrder = <K extends keyof RepairPackageFormData['workOrder']>(
    key: K,
    value: RepairPackageFormData['workOrder'][K]
  ) => {
    setForm((p) => ({ ...p, workOrder: { ...p.workOrder, [key]: value } }));
    touchPackageData();
  };
  const toggleRepairInstallerForContract = useCallback(
    (installerId: string, checked: boolean) => {
      setForm((p) => {
        const selected = new Set(p.selectedRepairInstallerIds ?? []);
        if (checked) selected.add(installerId);
        else selected.delete(installerId);

        const nextAssignments: RepairPackageFormData['finalEstimateInstallerAssignments'] = {};
        for (const [rowKey, assignment] of Object.entries(
          p.finalEstimateInstallerAssignments ?? {}
        )) {
          if (!selected.has(assignment.installerId)) continue;
          nextAssignments[rowKey] = assignment;
        }
        return {
          ...p,
          selectedRepairInstallerIds: [...selected],
          finalEstimateInstallerAssignments: nextAssignments,
        };
      });
      touchPackageData();
    },
    [touchPackageData]
  );
  const activateOrToggleRepairInstaller = useCallback(
    (installerId: string) => {
      const isSelected = (form.selectedRepairInstallerIds ?? []).includes(installerId);
      if (!isSelected) {
        toggleRepairInstallerForContract(installerId, true);
        setActiveRepairInstallerId(installerId);
        return;
      }
      if (activeRepairInstallerId === installerId) {
        toggleRepairInstallerForContract(installerId, false);
        if ((form.selectedRepairInstallerIds ?? []).length <= 1) {
          setActiveRepairInstallerId('');
        } else {
          const fallback =
            (form.selectedRepairInstallerIds ?? []).find((id) => id !== installerId) ?? '';
          setActiveRepairInstallerId(fallback);
        }
        return;
      }
      setActiveRepairInstallerId(installerId);
    },
    [
      activeRepairInstallerId,
      form.selectedRepairInstallerIds,
      toggleRepairInstallerForContract,
      setActiveRepairInstallerId,
    ]
  );
  const assignInstallerToFinalEstimateRow = useCallback(
    (rowKey: string, installerId: string) => {
      setForm((p) => {
        const selected = new Set(p.selectedRepairInstallerIds ?? []);
        const nextAssignments = { ...(p.finalEstimateInstallerAssignments ?? {}) };
        if (!installerId || !selected.has(installerId)) {
          delete nextAssignments[rowKey];
        } else {
          nextAssignments[rowKey] = { installerId };
        }
        return { ...p, finalEstimateInstallerAssignments: nextAssignments };
      });
      touchPackageData();
    },
    [touchPackageData]
  );
  const assignInstallerToFinalEstimateRows = useCallback(
    (rowKeys: string[], installerId: string) => {
      if (!installerId) return;
      if (rowKeys.length === 0) return;
      setForm((p) => {
        const selected = new Set(p.selectedRepairInstallerIds ?? []);
        if (!selected.has(installerId)) return p;
        const nextAssignments = { ...(p.finalEstimateInstallerAssignments ?? {}) };
        const allAssignedToActive = rowKeys.every(
          (rowKey) => nextAssignments[rowKey]?.installerId === installerId
        );
        if (allAssignedToActive) {
          for (const rowKey of rowKeys) {
            delete nextAssignments[rowKey];
          }
        } else {
          for (const rowKey of rowKeys) {
            nextAssignments[rowKey] = { installerId };
          }
        }
        return { ...p, finalEstimateInstallerAssignments: nextAssignments };
      });
      touchPackageData();
    },
    [touchPackageData]
  );

  const patchManagerQuestionnaire1 = useCallback(
    (patch: Partial<RepairManagerQuestionnaire1Block>) => {
      setForm((p) => ({
        ...p,
        managerQuestionnaire1: { ...p.managerQuestionnaire1, ...patch },
      }));
      touchPackageData();
    },
    [touchPackageData]
  );

  const patchPostWorkQuestionnaire2 = useCallback(
    (patch: Partial<RepairPostWorkQuestionnaire2Block>) => {
      setForm((p) => {
        const cur = p.postWorkQuestionnaire2;
        const next: RepairPostWorkQuestionnaire2Block = {
          ...cur,
          ...patch,
          ratingTrades: patch.ratingTrades
            ? { ...cur.ratingTrades, ...patch.ratingTrades }
            : cur.ratingTrades,
        };
        return { ...p, postWorkQuestionnaire2: next };
      });
      touchPackageData();
    },
    [touchPackageData]
  );

  const toggleManagerQuestionnaire1Need = useCallback(
    (id: string) => {
      setForm((p) => {
        const ids = [...p.managerQuestionnaire1.clientNeedsCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        return {
          ...p,
          managerQuestionnaire1: { ...p.managerQuestionnaire1, clientNeedsCheckedIds: ids },
        };
      });
      touchPackageData();
    },
    [touchPackageData]
  );

  const toggleManagerQuestionnaire1Traffic = useCallback(
    (id: string) => {
      setForm((p) => {
        const ids = [...p.managerQuestionnaire1.trafficSourceCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        return {
          ...p,
          managerQuestionnaire1: { ...p.managerQuestionnaire1, trafficSourceCheckedIds: ids },
        };
      });
      touchPackageData();
    },
    [touchPackageData]
  );

  const toggleManagerQuestionnaire1WhyChosen = useCallback(
    (id: string) => {
      setForm((p) => {
        const ids = [...p.managerQuestionnaire1.whyChosenCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        return {
          ...p,
          managerQuestionnaire1: { ...p.managerQuestionnaire1, whyChosenCheckedIds: ids },
        };
      });
      touchPackageData();
    },
    [touchPackageData]
  );

  const updateContract = <K extends keyof RepairPackageFormData['contract']>(
    key: K,
    value: string
  ) => {
    if (
      contractAndEstimateLocked &&
      !REPAIR_CONTRACT_FIELDS_EDITABLE_WHEN_SIGNED.has(String(key))
    ) {
      return;
    }
    setForm((p) => {
      const nextContract = { ...p.contract, [key]: value };
      if (key === 'discountPercent') {
        const base = p.estimate.snapshot?.total;
        if (typeof base === 'number' && Number.isFinite(base)) {
          const after = applyRepairContractDiscountToAmount(
            base,
            parseRepairContractDiscountPercent(value)
          );
          const fields = repairEstimateTotalToContractFields(after);
          nextContract.totalAmount = fields.totalAmount;
          nextContract.totalAmountWords = fields.totalAmountWords;
          nextContract.recommendedPrepayment = fields.recommendedPrepayment;
        }
      }
      if (key === 'totalAmount') {
        nextContract.totalAmountWords = amountToRussianWords(value);
        const parsedAmount = parseDecimalAmount(value);
        nextContract.recommendedPrepayment =
          parsedAmount === null ? '' : formatMoneyValue(parsedAmount * 0.7);
      }
      if (key === 'prepaymentAmount') {
        nextContract.prepaymentAmountWords = value.trim() ? amountToRussianWords(value) : '';
      }
      return { ...p, contract: nextContract };
    });
    touchPackageData();
  };

  /** «Оплата прописью» всегда выводится из суммы «Оплата» (в т.ч. после загрузки пакета / CRM). */
  useEffect(() => {
    setForm((p) => {
      const raw = p.contract.prepaymentAmount;
      const nextWords = raw.trim() ? amountToRussianWords(raw) : '';
      if (p.contract.prepaymentAmountWords === nextWords) return p;
      return { ...p, contract: { ...p.contract, prepaymentAmountWords: nextWords } };
    });
  }, [form.contract.prepaymentAmount]);

  useEffect(() => {
    if (contractAndEstimateLocked) {
      setCustomerSearchPopoverOpen(false);
    }
  }, [contractAndEstimateLocked]);

  const estimateUsageById = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        packageId: string;
        packageTitle: string;
        contractNumber: string;
        contractDate: string;
      }>
    >();
    for (const pkg of repairPackages) {
      const fd = (pkg.formData ?? {}) as Record<string, unknown>;
      const uniqueIds = collectEstimatePresetIdsFromRepairFormData(fd);
      if (uniqueIds.length === 0 || pkg.id === packageId) continue;
      const row = {
        packageId: pkg.id,
        packageTitle: pkg.title?.trim() || `Пакет ${pkg.id.slice(0, 8)}`,
        contractNumber: getDisplayContractNumber(pkg),
        contractDate: getDisplayContractDate(pkg),
      };
      for (const presetId of uniqueIds) {
        map.set(presetId, [...(map.get(presetId) ?? []), row]);
      }
    }
    return map;
  }, [repairPackages, packageId]);
  /** Расчёты, доступные для прикрепления: не в этом пакете и ни в каком другом пакете договора. */
  const attachableEstimatePresets = useMemo(() => {
    const selected = new Set(form.estimate.selectedPresetIds ?? []);
    const usedOnAddenda = new Set<string>();
    for (const sl of form.addendumSlots) {
      for (const id of sl.selectedPresetIds ?? []) {
        if (id.trim()) usedOnAddenda.add(id.trim());
      }
    }
    return estimatePresets.filter((preset) => {
      if (!isContractEstimatePresetAttachable(preset, estimateGroups)) return false;
      if (selected.has(preset.id)) return false;
      if (usedOnAddenda.has(preset.id)) return false;
      return (estimateUsageById.get(preset.id)?.length ?? 0) === 0;
    });
  }, [
    estimatePresets,
    estimateGroups,
    estimateUsageById,
    form.estimate.selectedPresetIds,
    form.addendumSlots,
  ]);

  const contractEstimateObjectKey = useMemo(
    () => getContractEstimateObjectGroupKey(form, estimatePresets),
    [form, estimatePresets]
  );

  const attachEstimatePickMeta = useMemo(() => {
    const hasUngrouped = attachableEstimatePresets.some((p) => !p.groupId);
    const groupIdsWithAttachable = new Set(
      attachableEstimatePresets.map((p) => p.groupId).filter((id): id is string => Boolean(id))
    );
    const lockedKey =
      (form.estimate.selectedPresetIds?.length ?? 0) > 0 ? contractEstimateObjectKey : '';
    if (lockedKey && lockedKey !== '__ungrouped__') {
      groupIdsWithAttachable.add(lockedKey);
    }
    const groupsOrdered = [...estimateGroups]
      .filter((g) => groupIdsWithAttachable.has(g.id))
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    return { hasUngrouped, groupsOrdered };
  }, [
    attachableEstimatePresets,
    estimateGroups,
    form.estimate.selectedPresetIds?.length,
    contractEstimateObjectKey,
  ]);

  const attachableForSelectedGroup = useMemo(() => {
    const key =
      (form.estimate.selectedPresetIds?.length ?? 0) > 0
        ? contractEstimateObjectKey
        : estimateAttachGroupKey || contractEstimateObjectKey;
    if (!key) return [];
    if (key === '__ungrouped__') {
      return attachableEstimatePresets.filter((p) => !p.groupId);
    }
    return attachableEstimatePresets.filter((p) => p.groupId === key);
  }, [
    form.estimate.selectedPresetIds?.length,
    contractEstimateObjectKey,
    estimateAttachGroupKey,
    attachableEstimatePresets,
  ]);

  const attachableAddendumEstimatePresets = useMemo(() => {
    if (activeAddendumSlot === null) return [];
    const objectKey = contractEstimateObjectKey;
    if (!objectKey) return [];
    const usedElsewhere = new Set<string>();
    for (const id of form.estimate.selectedPresetIds ?? []) {
      if (id.trim()) usedElsewhere.add(id.trim());
    }
    form.addendumSlots.forEach((sl) => {
      for (const id of collectAddendumSlotPresetIds(sl)) {
        usedElsewhere.add(id);
      }
    });
    return estimatePresets
      .filter((p) => {
        if (!isContractEstimatePresetAttachable(p, estimateGroups)) return false;
        if (usedElsewhere.has(p.id)) return false;
        if ((estimateUsageById.get(p.id)?.length ?? 0) !== 0) return false;
        const g = p.groupId ? p.groupId : '__ungrouped__';
        return g === objectKey;
      })
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }, [
    activeAddendumSlot,
    contractEstimateObjectKey,
    form.estimate.selectedPresetIds,
    form.addendumSlots,
    estimatePresets,
    estimateGroups,
    estimateUsageById,
  ]);
  const attachableAddendumExcludedEstimatePresets = attachableAddendumEstimatePresets;

  useEffect(() => {
    if (
      estimatePresetToAttach &&
      !attachableForSelectedGroup.some((p) => p.id === estimatePresetToAttach)
    ) {
      setEstimatePresetToAttach('');
    }
  }, [attachableForSelectedGroup, estimatePresetToAttach]);

  useEffect(() => {
    if (!estimateAttachGroupKey) return;
    const { hasUngrouped, groupsOrdered } = attachEstimatePickMeta;
    if (estimateAttachGroupKey === '__ungrouped__' && !hasUngrouped) {
      setEstimateAttachGroupKey('');
      setEstimatePresetToAttach('');
    } else if (
      estimateAttachGroupKey !== '__ungrouped__' &&
      !groupsOrdered.some((g) => g.id === estimateAttachGroupKey)
    ) {
      setEstimateAttachGroupKey('');
      setEstimatePresetToAttach('');
    }
  }, [attachEstimatePickMeta, estimateAttachGroupKey]);

  useEffect(() => {
    if (
      addendumPresetToAttach &&
      !attachableAddendumEstimatePresets.some((p) => p.id === addendumPresetToAttach)
    ) {
      setAddendumPresetToAttach('');
    }
  }, [attachableAddendumEstimatePresets, addendumPresetToAttach]);
  useEffect(() => {
    if (
      addendumExcludedPresetToAttach &&
      !attachableAddendumExcludedEstimatePresets.some(
        (p) => p.id === addendumExcludedPresetToAttach
      )
    ) {
      setAddendumExcludedPresetToAttach('');
    }
  }, [attachableAddendumExcludedEstimatePresets, addendumExcludedPresetToAttach]);

  useEffect(() => {
    setAddendumPresetToAttach('');
    setAddendumExcludedPresetToAttach('');
    setDraggingAddendumEstimatePresetId(null);
    setDraggingAddendumExcludedEstimatePresetId(null);
  }, [activeAddendumSlot]);

  useEffect(() => {
    if ((form.estimate.selectedPresetIds?.length ?? 0) > 0) {
      const k = contractEstimateObjectKey;
      if (k && k !== estimateAttachGroupKey) setEstimateAttachGroupKey(k);
      return;
    }
    const k = (form.estimateObjectGroupKey || '').trim();
    if (k && k !== estimateAttachGroupKey) {
      setEstimateAttachGroupKey(k);
    }
  }, [
    form.estimate.selectedPresetIds,
    form.estimateObjectGroupKey,
    contractEstimateObjectKey,
    estimateAttachGroupKey,
  ]);

  const selectedEstimateSections = useMemo(() => {
    const sectionMap = new Map<
      string,
      {
        categoryName: string;
        rooms: EstimateSnapshotRoom[];
      }
    >();
    for (const presetId of form.estimate.selectedPresetIds ?? []) {
      const preset = estimatePresets.find((row) => row.id === presetId);
      if (!preset) continue;
      const categoryName = preset.categoryName.trim() || '—';
      const snapshot = getSnapshotForEstimateAttach(preset, estimateGroups);
      const existing = sectionMap.get(categoryName);
      if (existing) {
        existing.rooms.push(...(snapshot?.rooms ?? []));
      } else {
        sectionMap.set(categoryName, {
          categoryName,
          rooms: [...(snapshot?.rooms ?? [])],
        });
      }
    }
    return [...sectionMap.values()];
  }, [form.estimate.selectedPresetIds, estimatePresets, estimateGroups]);

  const estimateAppendixContractRef = useMemo(() => {
    const num = form.contract.number.trim() || '—';
    const raw = form.contract.date.trim();
    const date = !raw ? '—' : contractDateToDdMmYyyy(raw) || raw;
    return { num, date };
  }, [form.contract.number, form.contract.date]);

  const finalEstimateSummary = useMemo(() => buildFinalEstimateSummary(form), [form]);
  const contractDiscountPercentParsed = useMemo(
    () => parseRepairContractDiscountPercent(form.contract.discountPercent),
    [form.contract.discountPercent]
  );
  const finalEstimateTotalAfterDiscount = useMemo(
    () =>
      applyRepairContractDiscountToAmount(
        finalEstimateSummary.totalAmount,
        contractDiscountPercentParsed
      ),
    [finalEstimateSummary.totalAmount, contractDiscountPercentParsed]
  );
  const selectedRepairInstallers = useMemo(() => {
    const selectedIds = new Set(form.selectedRepairInstallerIds ?? []);
    return repairInstallers.filter((installer) => selectedIds.has(installer.id));
  }, [repairInstallers, form.selectedRepairInstallerIds]);
  const selectedRepairInstallersById = useMemo(
    () => new Map(selectedRepairInstallers.map((installer) => [installer.id, installer])),
    [selectedRepairInstallers]
  );
  const installerAssignedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const assignment of Object.values(form.finalEstimateInstallerAssignments ?? {})) {
      const installerId = assignment.installerId?.trim() ?? '';
      if (!installerId) continue;
      counts.set(installerId, (counts.get(installerId) ?? 0) + 1);
    }
    return counts;
  }, [form.finalEstimateInstallerAssignments]);
  useEffect(() => {
    const selected = form.selectedRepairInstallerIds ?? [];
    if (selected.length === 0) {
      if (activeRepairInstallerId) setActiveRepairInstallerId('');
      return;
    }
    if (!selected.includes(activeRepairInstallerId)) {
      setActiveRepairInstallerId(selected[0] ?? '');
    }
  }, [form.selectedRepairInstallerIds, activeRepairInstallerId]);
  useEffect(() => {
    const allowedIds = new Set(repairInstallers.map((installer) => installer.id));
    setForm((p) => {
      const selected = (p.selectedRepairInstallerIds ?? []).filter((id) => allowedIds.has(id));
      const selectedSet = new Set(selected);
      const assignments = Object.fromEntries(
        Object.entries(p.finalEstimateInstallerAssignments ?? {}).filter(([, assignment]) =>
          selectedSet.has(assignment.installerId)
        )
      );
      if (
        selected.length === (p.selectedRepairInstallerIds ?? []).length &&
        Object.keys(assignments).length ===
          Object.keys(p.finalEstimateInstallerAssignments ?? {}).length
      ) {
        return p;
      }
      return {
        ...p,
        selectedRepairInstallerIds: selected,
        finalEstimateInstallerAssignments: assignments,
      };
    });
  }, [repairInstallers]);
  const finalEstimateRooms = useMemo(() => {
    const roomMap = new Map<
      string,
      {
        name: string;
        total: number;
        lines: Array<{
          key: string;
          name: string;
          unit: string;
          quantity: number;
          price: number;
          amount: number;
          includedQuantity: number;
          excludedQuantity: number;
        }>;
      }
    >();
    for (const row of finalEstimateSummary.rows) {
      const room = roomMap.get(row.roomName) ?? {
        name: row.roomName,
        total: 0,
        lines: [],
      };
      const price = row.quantity > 0 ? row.amount / row.quantity : 0;
      room.lines.push({
        key: row.key,
        name: row.workName,
        unit: row.unit,
        quantity: row.quantity,
        price,
        amount: row.amount,
        includedQuantity: row.includedQuantity,
        excludedQuantity: row.excludedQuantity,
      });
      room.total += row.amount;
      roomMap.set(row.roomName, room);
    }
    return [...roomMap.values()];
  }, [finalEstimateSummary.rows]);
  const interactiveFinalEstimateSections = useMemo(() => {
    const rowByKey = new Map(
      finalEstimateSummary.rows.map((row) => [
        row.key,
        {
          ...row,
          installerId: form.finalEstimateInstallerAssignments[row.key]?.installerId ?? '',
        },
      ])
    );
    const consumed = new Set<string>();
    const sections: Array<{
      categoryName: string;
      rooms: Array<{
        name: string;
        lines: Array<{
          key: string;
          workName: string;
          unit: string;
          quantity: number;
          amount: number;
          installerId: string;
        }>;
      }>;
    }> = [];

    for (const section of selectedEstimateSections) {
      const rooms = section.rooms
        .map((room) => {
          const lines = room.lines
            .map((line) => {
              const key = `${room.name}::${line.name}::${line.unit}`;
              const row = rowByKey.get(key);
              if (!row || consumed.has(key)) return null;
              consumed.add(key);
              return {
                key: row.key,
                workName: row.workName,
                unit: row.unit,
                quantity: row.quantity,
                amount: row.amount,
                installerId: row.installerId,
              };
            })
            .filter(
              (
                row
              ): row is {
                key: string;
                workName: string;
                unit: string;
                quantity: number;
                amount: number;
                installerId: string;
              } => Boolean(row)
            );
          if (lines.length === 0) return null;
          return { name: room.name, lines };
        })
        .filter(
          (
            room
          ): room is {
            name: string;
            lines: Array<{
              key: string;
              workName: string;
              unit: string;
              quantity: number;
              amount: number;
              installerId: string;
            }>;
          } => Boolean(room)
        );
      if (rooms.length > 0) {
        sections.push({ categoryName: section.categoryName, rooms });
      }
    }

    const ungroupedByRoom = new Map<
      string,
      Array<{
        key: string;
        workName: string;
        unit: string;
        quantity: number;
        amount: number;
        installerId: string;
      }>
    >();
    for (const row of rowByKey.values()) {
      if (consumed.has(row.key)) continue;
      const roomLines = ungroupedByRoom.get(row.roomName) ?? [];
      roomLines.push({
        key: row.key,
        workName: row.workName,
        unit: row.unit,
        quantity: row.quantity,
        amount: row.amount,
        installerId: row.installerId,
      });
      ungroupedByRoom.set(row.roomName, roomLines);
    }
    if (ungroupedByRoom.size > 0) {
      sections.push({
        categoryName: '—',
        rooms: [...ungroupedByRoom.entries()].map(([name, lines]) => ({ name, lines })),
      });
    }
    return sections;
  }, [finalEstimateSummary.rows, form.finalEstimateInstallerAssignments, selectedEstimateSections]);
  const unassignedInteractiveRowsCount = useMemo(
    () =>
      finalEstimateSummary.rows.filter(
        (row) => !form.finalEstimateInstallerAssignments[row.key]?.installerId
      ).length,
    [finalEstimateSummary.rows, form.finalEstimateInstallerAssignments]
  );

  /** Итоговый заказ-наряд: скидка по договору на уровне каждой позиции (в сметах — только в итогах). */
  const finalWorkOrderComputed = useMemo(() => {
    const taxPercent = parsePercentForWorkOrder(form.workOrder.taxPercent);
    const markupPercent = parsePercentForWorkOrder(form.workOrder.markupPercent);
    const discountFactor = repairContractDiscountMoneyFactor(
      parseRepairContractDiscountPercent(form.contract.discountPercent)
    );
    const fallbackGradeIncreasePercent = normalizeWorkOrderGrade(
      form.workOrder.gradeIncreasePercent
    );
    const roomTotals: number[] = [];
    const installerTotalsMap = new Map<
      string,
      {
        installer: InstallerMaster;
        gradeIncreasePercent: InstallerGradePercent;
        lineCount: number;
        total: number;
      }
    >();
    const rooms = finalEstimateRooms.map((room) => {
      const lines = room.lines.map((line) => {
        const assignedInstallerId =
          form.finalEstimateInstallerAssignments[line.key]?.installerId ?? '';
        const assignedInstaller = selectedRepairInstallersById.get(assignedInstallerId) ?? null;
        const gradeIncreasePercent = assignedInstaller
          ? parseInstallerGradePercent(assignedInstaller.grade)
          : fallbackGradeIncreasePercent;
        const gradeFactor = 1 + gradeIncreasePercent / 100;
        const adjustedPrice =
          line.price *
          discountFactor *
          (1 - taxPercent / 100) *
          (1 - markupPercent / 100) *
          gradeFactor;
        const adjustedAmount =
          line.amount *
          discountFactor *
          (1 - taxPercent / 100) *
          (1 - markupPercent / 100) *
          gradeFactor;
        if (assignedInstaller) {
          const prev = installerTotalsMap.get(assignedInstaller.id) ?? {
            installer: assignedInstaller,
            gradeIncreasePercent,
            lineCount: 0,
            total: 0,
          };
          prev.lineCount += 1;
          prev.total += adjustedAmount;
          installerTotalsMap.set(assignedInstaller.id, prev);
        }
        return {
          ...line,
          adjustedPrice,
          adjustedAmount,
          installerId: assignedInstaller?.id ?? '',
          installerFullName: assignedInstaller?.fullName ?? '',
          installerGrade: assignedInstaller?.grade ?? '',
          installerGradeIncreasePercent: gradeIncreasePercent,
        };
      });
      const adjustedTotal = lines.reduce((sum, line) => sum + line.adjustedAmount, 0);
      roomTotals.push(adjustedTotal);
      return { ...room, lines, adjustedTotal };
    });
    const total = roomTotals.reduce((sum, x) => sum + x, 0);
    const installerTotals = [...installerTotalsMap.values()].sort((a, b) =>
      a.installer.fullName.localeCompare(b.installer.fullName, 'ru')
    );
    return { rooms, total, installerTotals };
  }, [
    finalEstimateRooms,
    form.workOrder.taxPercent,
    form.workOrder.markupPercent,
    form.workOrder.gradeIncreasePercent,
    form.contract.discountPercent,
    form.finalEstimateInstallerAssignments,
    selectedRepairInstallersById,
  ]);
  const finalWorkOrderCategorySections = useMemo(() => {
    const adjustedByKey = new Map<
      string,
      {
        adjustedAmount: number;
        quantity: number;
        unit: string;
      }
    >();
    for (const room of finalWorkOrderComputed.rooms) {
      for (const line of room.lines) {
        adjustedByKey.set(line.key, {
          adjustedAmount: line.adjustedAmount,
          quantity: line.quantity,
          unit: line.unit,
        });
      }
    }
    return interactiveFinalEstimateSections
      .map((section) => {
        const rooms = section.rooms
          .map((room) => {
            const lines = room.lines
              .map((line) => {
                const adjusted = adjustedByKey.get(line.key);
                if (!adjusted) return null;
                return {
                  ...line,
                  adjustedAmount: adjusted.adjustedAmount,
                  quantity: adjusted.quantity,
                  unit: adjusted.unit,
                };
              })
              .filter(
                (
                  line
                ): line is {
                  key: string;
                  workName: string;
                  unit: string;
                  quantity: number;
                  amount: number;
                  installerId: string;
                  adjustedAmount: number;
                } => Boolean(line)
              );
            if (lines.length === 0) return null;
            return {
              ...room,
              lines,
              adjustedTotal: lines.reduce((sum, line) => sum + line.adjustedAmount, 0),
            };
          })
          .filter(
            (
              room
            ): room is {
              name: string;
              lines: Array<{
                key: string;
                workName: string;
                unit: string;
                quantity: number;
                amount: number;
                installerId: string;
                adjustedAmount: number;
              }>;
              adjustedTotal: number;
            } => Boolean(room)
          );
        if (rooms.length === 0) return null;
        return {
          categoryName: section.categoryName,
          rooms,
          adjustedTotal: rooms.reduce((sum, room) => sum + room.adjustedTotal, 0),
        };
      })
      .filter(
        (
          section
        ): section is {
          categoryName: string;
          rooms: Array<{
            name: string;
            lines: Array<{
              key: string;
              workName: string;
              unit: string;
              quantity: number;
              amount: number;
              installerId: string;
              adjustedAmount: number;
            }>;
            adjustedTotal: number;
          }>;
          adjustedTotal: number;
        } => Boolean(section)
      );
  }, [finalWorkOrderComputed.rooms, interactiveFinalEstimateSections]);
  const perInstallerWorkOrders = useMemo(() => {
    return selectedRepairInstallers
      .map((installer) => {
        const categories = finalWorkOrderCategorySections
          .map((section) => {
            const rooms = section.rooms
              .map((room) => {
                const lines = room.lines.filter((line) => line.installerId === installer.id);
                if (lines.length === 0) return null;
                return {
                  name: room.name,
                  lines,
                  adjustedTotal: lines.reduce((sum, line) => sum + line.adjustedAmount, 0),
                };
              })
              .filter(
                (
                  room
                ): room is {
                  name: string;
                  lines: Array<{
                    key: string;
                    workName: string;
                    unit: string;
                    quantity: number;
                    amount: number;
                    installerId: string;
                    adjustedAmount: number;
                  }>;
                  adjustedTotal: number;
                } => Boolean(room)
              );
            if (rooms.length === 0) return null;
            return {
              categoryName: section.categoryName,
              rooms,
              adjustedTotal: rooms.reduce((sum, room) => sum + room.adjustedTotal, 0),
            };
          })
          .filter(
            (
              section
            ): section is {
              categoryName: string;
              rooms: Array<{
                name: string;
                lines: Array<{
                  key: string;
                  workName: string;
                  unit: string;
                  quantity: number;
                  amount: number;
                  installerId: string;
                  adjustedAmount: number;
                }>;
                adjustedTotal: number;
              }>;
              adjustedTotal: number;
            } => Boolean(section)
          );
        const total = categories.reduce((sum, category) => sum + category.adjustedTotal, 0);
        const lineCount = categories.reduce(
          (sum, category) =>
            sum + category.rooms.reduce((rSum, room) => rSum + room.lines.length, 0),
          0
        );
        return {
          installer,
          categories,
          total,
          lineCount,
        };
      })
      .filter((row) => row.lineCount > 0);
  }, [selectedRepairInstallers, finalWorkOrderCategorySections]);
  const activeInstallerWorkOrder = useMemo(() => {
    if (activeFinalWorkOrderDocId === 'common') return null;
    return (
      perInstallerWorkOrders.find((row) => row.installer.id === activeFinalWorkOrderDocId) ?? null
    );
  }, [activeFinalWorkOrderDocId, perInstallerWorkOrders]);
  useEffect(() => {
    const allowed = new Set(['common', ...perInstallerWorkOrders.map((row) => row.installer.id)]);
    if (!allowed.has(activeFinalWorkOrderDocId)) {
      setActiveFinalWorkOrderDocId('common');
    }
  }, [perInstallerWorkOrders, activeFinalWorkOrderDocId]);

  const applyEstimatePresetIdsToForm = (presetIds: string[]) => {
    if (contractAndEstimateLocked) return;
    setForm((p) => {
      const uniqueIds = [...new Set(presetIds.filter(Boolean))];
      const nextForm = applyEstimatePresetIdsToRepairForm(
        p,
        uniqueIds,
        estimatePresets,
        estimateGroups
      );
      formRef.current = nextForm;
      schedulePersistRepairPackageDebounced();
      return nextForm;
    });
    setDirty(true);
  };

  const addEstimatePresetToForm = (presetId: string) => {
    if (!presetId) return;
    applyEstimatePresetIdsToForm([...(form.estimate.selectedPresetIds ?? []), presetId]);
  };

  const removeEstimatePresetFromForm = (presetId: string) => {
    applyEstimatePresetIdsToForm(
      (form.estimate.selectedPresetIds ?? []).filter((id) => id !== presetId)
    );
  };

  const moveEstimatePresetInForm = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const ids = [...(form.estimate.selectedPresetIds ?? [])];
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    applyEstimatePresetIdsToForm(ids);
  };

  const markAddendumSlotSigned = useCallback(
    (slotIndex0: number) => {
      setForm((p) => {
        const slots = [...p.addendumSlots] as RepairPackageFormData['addendumSlots'];
        const cur = slots[slotIndex0];
        if (!cur || cur.status !== 'OPEN') return p;
        slots[slotIndex0] = {
          ...cur,
          status: 'SIGNED',
          signedAt: new Date().toISOString(),
          paidAt: '',
        };
        return { ...p, addendumSlots: slots };
      });
      touchPackageData();
    },
    [touchPackageData]
  );
  const unmarkAddendumSlotSigned = useCallback(
    (slotIndex0: number) => {
      setForm((p) => {
        const slots = [...p.addendumSlots] as RepairPackageFormData['addendumSlots'];
        const cur = slots[slotIndex0];
        if (!cur || cur.status !== 'SIGNED') return p;
        if (!isWithinMsSinceIso(cur.signedAt, CONTRACT_SIGNED_REVERT_WINDOW_MS)) return p;
        slots[slotIndex0] = { ...cur, status: 'OPEN', signedAt: '', paidAt: '' };
        return { ...p, addendumSlots: slots };
      });
      touchPackageData();
    },
    [touchPackageData]
  );
  const markAddendumSlotPaid = useCallback(
    (slotIndex0: number) => {
      setForm((p) => {
        const slots = [...p.addendumSlots] as RepairPackageFormData['addendumSlots'];
        const cur = slots[slotIndex0];
        if (!cur || cur.status !== 'SIGNED') return p;
        slots[slotIndex0] = { ...cur, status: 'PAID', paidAt: new Date().toISOString() };
        return { ...p, addendumSlots: slots };
      });
      touchPackageData();
    },
    [touchPackageData]
  );
  const unmarkAddendumSlotPaid = useCallback(
    (slotIndex0: number) => {
      setForm((p) => {
        const slots = [...p.addendumSlots] as RepairPackageFormData['addendumSlots'];
        const cur = slots[slotIndex0];
        if (!cur || cur.status !== 'PAID') return p;
        if (!isWithinRevertWindow(cur.paidAt)) return p;
        slots[slotIndex0] = { ...cur, status: 'SIGNED', paidAt: '' };
        return { ...p, addendumSlots: slots };
      });
      touchPackageData();
    },
    [touchPackageData]
  );

  const contractTemplateSource = useMemo(() => {
    if (activeTab !== 'contract') return '';
    return templateDraftHtml || resolveTemplateHtml('contract');
  }, [activeTab, templateDraftHtml, resolveTemplateHtml]);

  const templatePreviewFallback = useMemo(
    () =>
      buildRepairTemplatePreviewFallbackData(
        executorProfiles.find((it) => it.title === form.executor.selectedProfileTitle) ??
          executorProfiles[0] ??
          null,
        signatoryProfiles.find((it) => it.title === form.executor.selectedSignatoryProfileTitle) ??
          signatoryProfiles[0] ??
          null
      ),
    [
      executorProfiles,
      signatoryProfiles,
      form.executor.selectedProfileTitle,
      form.executor.selectedSignatoryProfileTitle,
    ]
  );

  const formMergedForTemplate = useMemo(
    () => mergeRepairPackageFormWithPreviewFallback(form, templatePreviewFallback),
    [form, templatePreviewFallback]
  );

  const repairFormForActiveTemplate = useMemo(
    () =>
      repairPackageFormForTemplate(formMergedForTemplate, {
        templateTab:
          activeTab === 'finalEstimate' || activeTab === 'interactiveFinalEstimate'
            ? 'estimate'
            : activeTab === 'finalWorkOrder'
              ? 'workOrder'
              : activeTab,
        estimatePresets,
        estimateGroups,
      }),
    [formMergedForTemplate, activeTab, estimatePresets, estimateGroups]
  );

  const patchAddendumDocumentDate = useCallback(
    (slotIndex0: number, value: string) => {
      setForm((p) => {
        const next: [string, string, string, string, string] = [...p.addendumDocumentDates] as [
          string,
          string,
          string,
          string,
          string,
        ];
        if (slotIndex0 >= 0 && slotIndex0 < 5) next[slotIndex0] = value;
        return { ...p, addendumDocumentDates: next };
      });
      touchPackageData();
    },
    [touchPackageData]
  );

  const renderedDoc = useMemo(() => {
    if (activeTab === 'data' || activeTab === 'payments') return '';
    if (
      activeTab === 'finalEstimate' ||
      activeTab === 'interactiveFinalEstimate' ||
      activeTab === 'finalWorkOrder'
    )
      return '';
    if (activeTab === 'questionnaire1') {
      return buildManagerQuestionnaire1PrintHtml(repairFormForActiveTemplate);
    }
    if (activeTab === 'questionnaire2') {
      return buildPostWorkQuestionnaire2PrintHtml(repairFormForActiveTemplate);
    }
    const tab = activeTab as RepairDocumentTemplateTabId;
    let tpl: string;
    if (tab === 'contract') {
      tpl =
        isSuperAdmin && contractDocView === 'edit' && !contractAndEstimateLocked
          ? contractTemplateSource
          : resolveTemplateHtml('contract');
    } else {
      tpl = templateOverrides[tab] ?? resolveTemplateHtml(tab);
    }
    return applyTemplate(tpl, repairFormForActiveTemplate, {
      autoInsertContractSignatures: activeTab === 'contract',
      plainCustomerPlaceholders: isRepairPlainCustomerTab(activeTab),
    });
  }, [
    activeTab,
    repairFormForActiveTemplate,
    templateOverrides,
    resolveTemplateHtml,
    isSuperAdmin,
    contractDocView,
    contractTemplateSource,
    contractAndEstimateLocked,
  ]);

  const persistContractTemplatePresets = async (items: ContractTemplatePreset[]) => {
    if (contractAndEstimateLocked) return;
    setTemplateSaving(true);
    setError(null);
    try {
      await putContractDocumentTemplatePresets({ kind: 'REPAIR', items });
      setContractTemplatePresets(items.map((it) => normalizeContractTemplatePreset(it)));
      setExcelMessage('Шаблоны договора сохранены.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблоны договора');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleContractTemplateChange = (value: string) => {
    if (contractAndEstimateLocked) return;
    setTemplateDraftHtml(value);
  };

  const handleEditTemplateSelect = (templateId: string) => {
    if (contractAndEstimateLocked) return;
    setEditingTemplateId(templateId);
    const t = contractTemplatePresets.find((it) => it.id === templateId);
    setTemplateDraftTitle(t?.title ?? '');
    setTemplateDraftHtml(t?.html ?? '');
  };

  const handleSaveTemplateDraft = async () => {
    if (!isSuperAdmin) return;
    if (contractAndEstimateLocked) return;
    const title = templateDraftTitle.trim();
    if (!title) {
      setError('Укажите имя шаблона.');
      return;
    }
    const html = templateDraftHtml.trim();
    if (!html) {
      setError('HTML шаблона не может быть пустым.');
      return;
    }
    const id = editingTemplateId || `tpl_${Date.now()}`;
    const currentTab: RepairDocumentTemplateTabId = 'contract';
    const next = contractTemplatePresets.map((it) =>
      it.id === id ? { ...it, title, html, tabId: currentTab } : it
    );
    const exists = next.some((it) => it.id === id);
    const finalItems = exists
      ? next
      : [
          ...contractTemplatePresets,
          {
            id,
            title,
            html,
            tabId: currentTab,
            isDefault:
              contractTemplatePresets.filter(
                (it) => normalizeTemplateTabId(it.tabId) === currentTab && !it.archived
              ).length === 0,
            archived: false,
            isProtected: false,
          },
        ];
    await persistContractTemplatePresets(finalItems);
    setEditingTemplateId(id);
    setSelectedTemplateIds((p) => ({ ...p, [currentTab]: p[currentTab] || id }));
  };

  const handleCreateTemplate = (mode: 'blank' | 'copy') => {
    if (!isSuperAdmin) return;
    if (contractAndEstimateLocked) return;
    const sourceHtml = mode === 'copy' ? contractTemplateSource : '<div class="docPrint"></div>';
    const id = `tpl_${Date.now()}`;
    setEditingTemplateId(id);
    setTemplateDraftTitle(mode === 'copy' ? 'Копия шаблона' : 'Новый шаблон');
    setTemplateDraftHtml(sourceHtml);
  };

  const handleDeleteTemplate = async () => {
    if (!isSuperAdmin || !editingTemplateId) return;
    if (contractAndEstimateLocked) return;
    const current = contractTemplatePresets.find((it) => it.id === editingTemplateId);
    if (!current) return;
    if (current.isProtected) {
      setError(
        'Шаблон защищён. Снимите защиту в библиотеке шаблонов, затем можно перенести его в архив.'
      );
      return;
    }
    if (current.archived) return;
    const name = (current.title ?? '').trim() || 'без названия';
    if (
      !window.confirm(
        `Шаблон «${name}» будет перенесён в архив глобальной библиотеки (не пропадёт, но скроется из выбора). Продолжить?`
      )
    ) {
      return;
    }
    const tab = normalizeTemplateTabId(current.tabId);
    let next = contractTemplatePresets.map((it) =>
      it.id === editingTemplateId ? { ...it, archived: true, isDefault: false } : it
    );
    let activeOnTab = next.filter((it) => normalizeTemplateTabId(it.tabId) === tab && !it.archived);
    if (activeOnTab.length > 0 && !activeOnTab.some((it) => it.isDefault)) {
      const pickId = activeOnTab[0].id;
      next = next.map((it) =>
        normalizeTemplateTabId(it.tabId) !== tab
          ? it
          : { ...it, isDefault: !it.archived && it.id === pickId }
      );
      activeOnTab = next.filter((it) => normalizeTemplateTabId(it.tabId) === tab && !it.archived);
    }
    await persistContractTemplatePresets(next);
    const fallbackId = activeOnTab.find((it) => it.isDefault)?.id ?? activeOnTab[0]?.id ?? '';
    setEditingTemplateId(fallbackId);
    setSelectedTemplateIds((prev) => ({
      ...prev,
      contract: prev.contract === editingTemplateId ? fallbackId : prev.contract,
    }));
    const fallback = next.find((it) => it.id === fallbackId);
    setTemplateDraftTitle(fallback?.title ?? '');
    setTemplateDraftHtml(fallback?.html ?? '');
  };

  const handleSetDefaultTemplate = async () => {
    if (!isSuperAdmin || !editingTemplateId) return;
    if (contractAndEstimateLocked) return;
    const cur = contractTemplatePresets.find((it) => it.id === editingTemplateId);
    if (cur?.archived) {
      setError('Нельзя сделать архивный шаблон по умолчанию.');
      return;
    }
    const next = contractTemplatePresets.map((it) => ({
      ...it,
      isDefault: it.id === editingTemplateId,
    }));
    await persistContractTemplatePresets(next);
  };

  const insertContractPlaceholder = (path: string) => {
    if (contractAndEstimateLocked) return;
    const el = contractHtmlTextareaRef.current;
    const cur = templateDraftHtml || resolveTemplateHtml('contract');
    const token = `{{${path}}}`;
    if (el) {
      const start = el.selectionStart ?? cur.length;
      const end = el.selectionEnd ?? start;
      const next = cur.slice(0, start) + token + cur.slice(end);
      handleContractTemplateChange(next);
      const pos = start + token.length;
      window.requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    } else {
      handleContractTemplateChange(cur + token);
    }
  };

  const updateContractHtmlBySelection = (
    transform: (
      selected: string,
      hasSelection: boolean
    ) => {
      content: string;
      cursorOffset?: number;
      selectLength?: number;
    }
  ) => {
    if (contractAndEstimateLocked) return;
    const el = contractHtmlTextareaRef.current;
    const current = contractTemplateSource;
    if (!el) {
      const next = transform('', false).content;
      handleContractTemplateChange(current + next);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const selected = current.slice(start, end);
    const hasSelection = start !== end;
    const result = transform(selected, hasSelection);
    const next = current.slice(0, start) + result.content + current.slice(end);
    handleContractTemplateChange(next);
    const cursor = start + (result.cursorOffset ?? result.content.length);
    const selectLength = result.selectLength ?? 0;
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor + selectLength);
    });
  };

  const wrapSelection = (before: string, after: string, placeholder = 'текст') => {
    updateContractHtmlBySelection((selected, hasSelection) => ({
      content: `${before}${hasSelection ? selected : placeholder}${after}`,
      cursorOffset: hasSelection ? before.length + selected.length + after.length : before.length,
      selectLength: hasSelection ? 0 : placeholder.length,
    }));
  };

  const wrapParagraphWithAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    wrapSelection(`<p style="text-align: ${align}; margin: 0 0 8pt;">`, '</p>', 'Новый абзац');
  };

  const wrapParagraphWithIndent = () => {
    wrapSelection(
      '<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">',
      '</p>',
      'Абзац с красной строкой'
    );
  };

  const wrapAsHeading = (level: 1 | 2 | 3) => {
    const tag = `h${level}`;
    const fontSize = level === 1 ? '14pt' : level === 2 ? '12pt' : '11pt';
    wrapSelection(
      `<${tag} style="text-align: center; font-size: ${fontSize}; margin: 14pt 0 8pt;">`,
      `</${tag}>`,
      level === 1 ? 'Название договора' : level === 2 ? 'Название раздела' : 'Название подпункта'
    );
  };

  const wrapAsList = (ordered: boolean) => {
    updateContractHtmlBySelection((selected, hasSelection) => {
      const lines = (hasSelection ? selected : 'Пункт 1\nПункт 2')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const items = lines.map((line) => `  <li>${line}</li>`).join('\n');
      const tag = ordered ? 'ol' : 'ul';
      return {
        content: `<${tag} style="margin: 0 0 8pt 22px; padding: 0;">\n${items}\n</${tag}>`,
      };
    });
  };

  const insertSectionTemplate = () => {
    const block = `
<h2 style="text-align: center; margin: 14pt 0 8pt;">N. НАЗВАНИЕ РАЗДЕЛА</h2>
<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
  N.1. Первый пункт раздела.
</p>
<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
  N.2. Второй пункт раздела.
</p>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const insertSignatureLines = () => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin-top: 16pt;">
  <tr>
    <td style="width: 50%; vertical-align: bottom; padding-right: 10px;">
      <p style="margin: 0 0 22pt;">Подрядчик _____________________ / {{executor.directorName}}</p>
    </td>
    <td style="width: 50%; vertical-align: bottom; padding-left: 10px;">
      <p style="margin: 0 0 22pt;">Заказчик _____________________ / {{customer.fullName}}</p>
    </td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const clearFormattingInSelection = () => {
    updateContractHtmlBySelection((selected, hasSelection) => {
      const source = hasSelection ? selected : contractTemplateSource;
      const cleaned = source.replace(/<[^>]+>/g, '').trim();
      return { content: cleaned || 'текст' };
    });
  };

  const uppercaseSelection = () => {
    updateContractHtmlBySelection((selected, hasSelection) => ({
      content: (hasSelection ? selected : 'ТЕКСТ').toUpperCase(),
    }));
  };

  const insertHorizontalRule = () => {
    updateContractHtmlBySelection(() => ({
      content:
        '<hr style="border: 0; border-top: 1px solid var(--admin-border-strong); margin: 12pt 0;" />',
    }));
  };

  const insertPageBreak = () => {
    updateContractHtmlBySelection(() => ({
      content: '<div style="page-break-after: always;"></div>',
    }));
  };

  const insertRequisitesTemplate = () => {
    const block = `
<h2 style="text-align: center; margin: 16pt 0 8pt;">РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
<table class="contractRequisitesBlock" data-contract-signatures-embedded="1" style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid var(--admin-border-strong);">
      <p style="text-align: center; margin: 0 0 8pt;">ПОДРЯДЧИК</p>
      <p style="margin: 0 0 4pt;">{{executor.companyName}}</p>
      <p style="margin: 0 0 4pt;">{{executor.innKppRegLine}}</p>
      <p style="margin: 0 0 4pt;">E-mail: {{executor.email}}</p>
      <p style="margin: 0 0 4pt;">Юр. адрес: {{executor.legalAddress}}</p>
      <p style="margin: 0 0 4pt;">Адрес для корреспонденции: {{executor.actualAddress}}</p>
      <p style="margin: 0 0 8pt; white-space: pre-wrap;">{{executor.bankDetails}}</p>
      <p style="margin: 20pt 0 0;">___________________ / {{executor.directorName}}</p>
      <p style="margin: 0; font-size: 9pt;">м.п.</p>
    </td>
    <td style="width: 50%; vertical-align: top; padding: 8px 0 8px 10px;">
      <p style="text-align: center; margin: 0 0 8pt;">ЗАКАЗЧИК</p>
      <p style="margin: 0 0 4pt;">{{customer.fullName|plain}}</p>
      <p style="margin: 0 0 4pt;">Адрес: {{customer.address|plain}}</p>
      <p style="margin: 0 0 4pt;">Тел.: {{customer.phone|plain}}</p>
      <p style="margin: 0 0 4pt;">E-mail: {{customer.email|plain}}</p>
      <p style="margin: 0 0 4pt;">Банковские реквизиты:</p>
      <p style="margin: 0 0 4pt; white-space: pre-wrap;">{{customer.bankDetails|plain}}</p>
      <p style="margin: 0 0 4pt;">Паспорт: {{customer.passportSeriesNumber|plain}}</p>
      <p style="margin: 0 0 8pt;">Выдан: {{customer.passportIssuedBy|plain}}, {{customer.passportIssueDate|plain}}</p>
      <p style="margin: 20pt 0 0;">___________________ / {{customer.fullName|plain}}</p>
      <p style="margin: 0; font-size: 9pt;">подпись</p>
    </td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const wrapParagraphWithSpacing = (lineHeight: number, marginBottomPt: number) => {
    wrapSelection(
      `<p style="text-align: justify; line-height: ${lineHeight}; margin: 0 0 ${marginBottomPt}pt;">`,
      '</p>',
      'Абзац'
    );
  };

  const wrapParagraphWithIndentCm = (indentCm: number) => {
    wrapSelection(
      `<p style="text-align: justify; text-indent: ${indentCm}cm; margin: 0 0 8pt;">`,
      '</p>',
      'Абзац'
    );
  };

  const insertQuoteBlock = () => {
    const block = `
<blockquote style="margin: 8pt 0; padding: 8pt 10pt; border-left: 3px solid var(--admin-border-strong); background: var(--admin-surface-muted);">
  <p style="margin: 0; font-style: italic;">Текст примечания / важного условия.</p>
</blockquote>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const insertSimpleTable = () => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin: 8pt 0;">
  <tr>
    <th style="border: 1px solid var(--admin-border); padding: 6px; text-align: left;">Пункт</th>
    <th style="border: 1px solid var(--admin-border); padding: 6px; text-align: left;">Содержание</th>
  </tr>
  <tr>
    <td style="border: 1px solid var(--admin-border); padding: 6px;">1</td>
    <td style="border: 1px solid var(--admin-border); padding: 6px;">Описание</td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const insertEmptySpacer = () => {
    updateContractHtmlBySelection(() => ({
      content: '<div style="height: 10pt;"></div>',
    }));
  };

  const convertTextToParagraphs = () => {
    updateContractHtmlBySelection((selected, hasSelection) => {
      const source = (hasSelection ? selected : contractTemplateSource).trim();
      const parts = source
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => `<p style="margin: 0 0 8pt;">${line}</p>`)
        .join('\n');
      return {
        content: parts || '<p style="margin: 0 0 8pt;">Новый абзац</p>',
      };
    });
  };

  const insertTwoColumnsBlock = () => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid var(--admin-border-strong);">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ЛЕВАЯ КОЛОНКА</p>
      <p style="margin: 0 0 6pt;">{{customer.fullName}}</p>
      <p style="margin: 0;">___________________ / подпись</p>
    </td>
    <td style="width: 50%; vertical-align: top; padding: 8px 0 8px 10px;">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ПРАВАЯ КОЛОНКА</p>
      <p style="margin: 0 0 6pt;">{{executor.companyName}}</p>
      <p style="margin: 0;">___________________ / подпись</p>
    </td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const handleResetContractTemplate = () => {
    if (contractAndEstimateLocked) return;
    const t = contractTemplatePresets.find((it) => it.id === editingTemplateId);
    setTemplateDraftTitle(t?.title ?? '');
    setTemplateDraftHtml(t?.html ?? '');
    setExcelMessage(null);
  };

  const handlePrint = () => {
    if (
      activeTab === 'estimate' ||
      activeTab === 'finalWorkOrder' ||
      activeTab === 'finalEstimate'
    ) {
      const printTargetId =
        activeTab === 'estimate'
          ? 'estimate-sheet'
          : activeTab === 'finalWorkOrder'
            ? 'work-order-sheet'
            : 'final-estimate-sheet';
      const target = document.querySelector(`[data-print-target='${printTargetId}']`);
      if (!target) return;
      document.body.classList.add(BODY_PRINT_ESTIMATE_CLASS);
      const cleanup = (): void => {
        document.body.classList.remove(BODY_PRINT_ESTIMATE_CLASS);
      };
      window.addEventListener('afterprint', cleanup, { once: true });
      window.setTimeout(cleanup, 120_000);
      window.print();
      return;
    }
    if (activeTab === 'interactiveFinalEstimate') return;
    if (!renderedDoc) return;
    const printTitle =
      activeTab === 'contract' || isRepairActTwinOneSheetTab(activeTab)
        ? ''
        : REPAIR_DOCUMENT_TAB_LABELS[activeTab];
    const printBody = isRepairActTwinOneSheetTab(activeTab)
      ? wrapRepairActTwinCopiesOnOnePageHtml(renderedDoc)
      : renderedDoc;
    printDocumentHtml(
      printBody,
      printTitle,
      activeTab === 'contract'
        ? { marginFooter: pickPrintMarginFooterNames(formMergedForTemplate) }
        : {}
    );
  };

  useEffect(() => {
    if (activeTab !== 'contract') {
      setContractDocView('preview');
    }
  }, [activeTab]);

  useEffect(() => {
    if (contractAndEstimateLocked) {
      setContractDocView('preview');
    }
  }, [contractAndEstimateLocked]);

  useEffect(() => {
    if (contractDocView !== 'edit') {
      setFormatToolbarLevel('basic');
    }
  }, [contractDocView]);

  useEffect(() => {
    setShowAllFormatTools(false);
    setFormatToolbarQuery('');
  }, [formatToolbarLevel]);

  const headerContractNumberLabel = useMemo(
    () => getRepairContractNumberDisplayForForm(form),
    [form.contract.number, form._repairCopyContractNumberBaseline]
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Загрузка…</p>
      </div>
    );
  }

  const visibleRepairTabs = repairTabOrder.filter((id) =>
    isRepairAddendumTabVisible(id, form.addendumSlotCount)
  );
  const summaryTabs: RepairDocumentTabId[] = [
    'interactiveFinalEstimate',
    'finalEstimate',
    'finalWorkOrder',
  ];
  const orderedVisibleRepairTabs = [
    ...visibleRepairTabs.filter((id) => !summaryTabs.includes(id)),
    ...summaryTabs.filter((id) => visibleRepairTabs.includes(id)),
  ];

  type ToolButton = {
    label: string;
    onClick: () => void;
    secondary?: boolean;
  };

  const basicTools: ToolButton[] = [
    { label: 'H1', onClick: () => wrapAsHeading(1) },
    { label: 'H2', onClick: () => wrapAsHeading(2) },
    { label: 'Слева', onClick: () => wrapParagraphWithAlign('left') },
    { label: 'Центр', onClick: () => wrapParagraphWithAlign('center') },
    { label: 'По ширине', onClick: () => wrapParagraphWithAlign('justify') },
    { label: 'Абзац+отступ', onClick: wrapParagraphWithIndent },
    { label: 'Жирный', onClick: () => wrapSelection('<strong>', '</strong>', 'жирный текст') },
    { label: 'Курсив', onClick: () => wrapSelection('<em>', '</em>', 'курсив') },
    { label: 'Марк. список', onClick: () => wrapAsList(false) },
    { label: 'Нум. список', onClick: () => wrapAsList(true) },
    { label: 'Текст → абзацы', onClick: convertTextToParagraphs },
    { label: '2 колонки', onClick: insertTwoColumnsBlock },
    { label: 'Подписи сторон', onClick: insertSignatureLines },
    { label: 'Реквизиты (готово)', onClick: insertRequisitesTemplate, secondary: true },
  ];

  const advancedTools: ToolButton[] = [
    { label: 'H3', onClick: () => wrapAsHeading(3) },
    { label: 'Справа', onClick: () => wrapParagraphWithAlign('right') },
    { label: 'Без отступа', onClick: () => wrapParagraphWithIndentCm(0) },
    { label: 'Отступ 1.25см', onClick: () => wrapParagraphWithIndentCm(1.25) },
    { label: 'Интервал узкий', onClick: () => wrapParagraphWithSpacing(1.3, 6) },
    { label: 'Интервал широкий', onClick: () => wrapParagraphWithSpacing(1.6, 10) },
    { label: 'Подчерк.', onClick: () => wrapSelection('<u>', '</u>', 'подчёркнуто') },
    { label: 'ВЕРХНИЙ РЕГИСТР', onClick: uppercaseSelection },
    { label: 'Очистить формат', onClick: clearFormattingInSelection },
    { label: 'Шаблон раздела', onClick: insertSectionTemplate },
    { label: 'Цитата / примеч.', onClick: insertQuoteBlock },
    { label: 'Таблица 2×2', onClick: insertSimpleTable },
    { label: 'Пустая строка', onClick: insertEmptySpacer, secondary: true },
    { label: 'Разделитель', onClick: insertHorizontalRule, secondary: true },
    { label: 'Разрыв страницы', onClick: insertPageBreak, secondary: true },
  ];

  const sourceTools = formatToolbarLevel === 'basic' ? basicTools : advancedTools;
  const q = formatToolbarQuery.trim().toLowerCase();
  const visibleTools = sourceTools.filter((tool) => {
    if (!showAllFormatTools && tool.secondary) return false;
    if (!q) return true;
    return tool.label.toLowerCase().includes(q);
  });

  const headerContractConcludedDateLabel =
    packageFlowStatus === 'CONTRACT_CONCLUDED'
      ? formatContractConcludedDateForHeader(form.contractConcludedAt)
      : null;

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <div className={`${styles.editorHeader} ${styles.blockHeader}`}>
        <div>
          <Link className={styles.backLink} href="/admin/contract-documents/repair">
            ← К списку (Ремонт)
          </Link>
          <div className={styles.editorHeaderTitleRow}>
            <h1
              className={styles.title}
              aria-label={
                headerContractConcludedDateLabel
                  ? `Договор ${headerContractNumberLabel} от ${headerContractConcludedDateLabel}`
                  : 'Пакет документов'
              }
            >
              {headerContractNumberLabel}
              {headerContractConcludedDateLabel ? (
                <span
                  className={styles.repairHeaderContractSignedDate}
                  title="Дата присвоения статуса «Договор подписан»"
                >
                  {` от ${headerContractConcludedDateLabel}`}
                </span>
              ) : null}
            </h1>
            {packageFlowStatus === 'CONTRACT_CONCLUDED' ? (
              <span className={styles.packageFlowSignedLabelGroup} role="status">
                <span className={styles.packageFlowStatusBadge}>Договор подписан</span>
                {signedContractPayOrb != null ? (
                  <span
                    className={`${styles.packageFlowPayPctOrb} ${signedContractPayOrb.toneClass}`}
                    title={signedContractPayOrb.title}
                  >
                    {signedContractPayOrb.label}
                  </span>
                ) : null}
                {signedAddendumOrdinals.map((n) => (
                  <span
                    key={`signed-addendum-${n}`}
                    className={styles.packageFlowStatusBadge}
                    role="status"
                  >
                    Д/с №{n} подписано
                  </span>
                ))}
              </span>
            ) : null}
            {isContractPaid ? (
              <span className={styles.packageFlowStatusBadge} role="status">
                Договор оплачен
              </span>
            ) : null}
            {packageFlowStatus !== 'CONTRACT_CONCLUDED'
              ? signedAddendumOrdinals.map((n) => (
                  <span
                    key={`signed-addendum-${n}`}
                    className={styles.packageFlowStatusBadge}
                    role="status"
                  >
                    Д/с №{n} подписано
                  </span>
                ))
              : null}
            {paidAddendumOrdinals.map((n) => (
              <span
                key={`paid-addendum-${n}`}
                className={styles.packageFlowStatusBadge}
                role="status"
              >
                Д/с №{n} оплачено
              </span>
            ))}
          </div>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.repairEditorDraftTitleRow}>
            {!loading ? (
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn}`}
                onClick={() => setIsVersionsHistoryOpen(true)}
                title="Журнал событий пакета"
                aria-label="Открыть журнал событий пакета"
              >
                <PackageVersionsHistoryTriggerIcon />
              </button>
            ) : null}
            <button
              type="button"
              className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn}`}
              disabled={packageRefreshing || savingPackageStatus || (activeTab === 'data' && dirty)}
              aria-busy={packageRefreshing}
              aria-label={
                packageRefreshing
                  ? 'Обновление данных'
                  : activeTab === 'data' && dirty
                    ? 'Сначала сохраните изменения на вкладке «Данные»'
                    : 'Обновить данные с сервера'
              }
              title={
                activeTab === 'data' && dirty
                  ? 'Сначала сохраните изменения на вкладке «Данные»'
                  : 'Обновить данные с сервера'
              }
              onClick={() => void load({ mode: 'refresh' })}
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
                className={packageRefreshing ? styles.estimatesRefreshIconSpinning : undefined}
                aria-hidden
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
            {activeTab !== 'data' ? (
              <button
                type="button"
                className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn}`}
                onClick={handlePrint}
                title={
                  activeTab === 'finalWorkOrder'
                    ? 'Печать документа'
                    : activeTab === 'finalEstimate'
                      ? 'Печать итоговой сметы'
                      : 'Печать'
                }
                aria-label={
                  activeTab === 'finalWorkOrder'
                    ? 'Печать документа'
                    : activeTab === 'finalEstimate'
                      ? 'Печать итоговой сметы'
                      : 'Печать'
                }
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
                  aria-hidden
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect width="12" height="8" x="6" y="14" rx="1" />
                </svg>
              </button>
            ) : null}
          </div>
          <div className={styles.headerButtonsRow}>
            {packageFlowStatus !== 'CONTRACT_CONCLUDED' ? (
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={savingPackageStatus}
                onClick={() => void handleMarkContractConcluded()}
              >
                {savingPackageStatus ? 'Сохранение…' : 'Договор подписан'}
              </button>
            ) : (
              <>
                {isContractPaid ? (
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={savingPackageStatus || !canRevertContractPaid}
                    title={
                      canRevertContractPaid
                        ? 'Снять статус «Договор оплачен»'
                        : 'Снять статус можно только в течение 24 часов после установки'
                    }
                    onClick={() => void handleRevertContractPaid()}
                  >
                    {savingPackageStatus ? 'Сохранение…' : 'Снять статус «Договор оплачен»'}
                  </button>
                ) : null}
                {contractSignedRevertRemainingMs > 0 ? (
                  <div className={styles.contractSignedRevertUi}>
                    <div
                      className={styles.contractSignedRevertLoader}
                      role="status"
                      aria-live="polite"
                      aria-label={`Осталось ${Math.ceil(contractSignedRevertRemainingMs / 1000)} секунд, чтобы отменить статус «Договор подписан»`}
                    >
                      <svg
                        className={styles.contractSignedRevertRingSvg}
                        viewBox="0 0 40 40"
                        aria-hidden
                      >
                        <circle
                          className={styles.contractSignedRevertRingTrack}
                          cx="20"
                          cy="20"
                          r={CONTRACT_SIGNED_REVERT_RING_R}
                          fill="none"
                        />
                        <circle
                          className={styles.contractSignedRevertRingProgress}
                          cx="20"
                          cy="20"
                          r={CONTRACT_SIGNED_REVERT_RING_R}
                          fill="none"
                          strokeDasharray={`${
                            (contractSignedRevertRemainingMs / CONTRACT_SIGNED_REVERT_WINDOW_MS) *
                            CONTRACT_SIGNED_REVERT_RING_C
                          } ${CONTRACT_SIGNED_REVERT_RING_C}`}
                          transform="rotate(-90 20 20)"
                        />
                      </svg>
                      <span className={styles.contractSignedRevertRingSec} aria-hidden>
                        {Math.max(1, Math.ceil(contractSignedRevertRemainingMs / 1000))}
                      </span>
                    </div>
                    <p className={styles.contractSignedRevertHint}>
                      Отменить статус «Договор подписан» можно в течение 30 секунд
                    </p>
                    <button
                      type="button"
                      className={`${styles.secondaryBtn} ${styles.contractSignedRevertBtn}`}
                      disabled={savingPackageStatus}
                      onClick={() => void confirmRevertContractConcluded()}
                    >
                      {savingPackageStatus ? 'Сохранение…' : 'Отменить'}
                    </button>
                  </div>
                ) : null}
              </>
            )}
            {addendumSignedRevertUis.map(({ slotIndex0, remainingMs }) => {
              const n = slotIndex0 + 1;
              return (
                <div key={`addendum-revert-${n}`} className={styles.contractSignedRevertUi}>
                  <div
                    className={styles.contractSignedRevertLoader}
                    role="status"
                    aria-live="polite"
                    aria-label={`Осталось ${Math.ceil(remainingMs / 1000)} секунд, чтобы отменить подписание Д/с №${n}`}
                  >
                    <svg
                      className={styles.contractSignedRevertRingSvg}
                      viewBox="0 0 40 40"
                      aria-hidden
                    >
                      <circle
                        className={styles.contractSignedRevertRingTrack}
                        cx="20"
                        cy="20"
                        r={CONTRACT_SIGNED_REVERT_RING_R}
                        fill="none"
                      />
                      <circle
                        className={styles.contractSignedRevertRingProgress}
                        cx="20"
                        cy="20"
                        r={CONTRACT_SIGNED_REVERT_RING_R}
                        fill="none"
                        strokeDasharray={`${
                          (remainingMs / CONTRACT_SIGNED_REVERT_WINDOW_MS) *
                          CONTRACT_SIGNED_REVERT_RING_C
                        } ${CONTRACT_SIGNED_REVERT_RING_C}`}
                        transform="rotate(-90 20 20)"
                      />
                    </svg>
                    <span className={styles.contractSignedRevertRingSec} aria-hidden>
                      {Math.max(1, Math.ceil(remainingMs / 1000))}
                    </span>
                  </div>
                  <p className={styles.contractSignedRevertHint}>
                    Отменить подписание Д/с №{n} можно в течение 30 секунд
                  </p>
                  <button
                    type="button"
                    className={`${styles.secondaryBtn} ${styles.contractSignedRevertBtn}`}
                    disabled={savingPackageStatus}
                    onClick={() => unmarkAddendumSlotSigned(slotIndex0)}
                  >
                    {savingPackageStatus ? 'Сохранение…' : 'Отменить'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {excelMessage ? <p className={styles.hint}>{excelMessage}</p> : null}
      {isVersionsHistoryOpen ? (
        <div
          className={`${styles.saveModalBackdrop} ${styles.packageVersionsModalBackdrop}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="package-events-journal-title"
          onClick={() => setIsVersionsHistoryOpen(false)}
        >
          <div
            className={styles.packageVersionsModalCard}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <h3 className={styles.packageVersionsTitle} id="package-events-journal-title">
              Журнал событий
            </h3>
            <p className={styles.packageVersionsHint}>
              В журнал попадают события, для которых на сервере создан снимок метаданных пакета:
              время, пользователь (если известен) и краткое описание изменений относительно
              предыдущей записи. В том числе при отложенном автосохранении после правок на вкладке
              «Данные».
            </p>
            <div>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={versionsBusy}
                onClick={() => void refreshPackageVersions()}
              >
                {versionsBusy ? 'Загрузка…' : 'Обновить список'}
              </button>
            </div>
            {packageVersions.length === 0 && !versionsBusy ? (
              <p className={styles.hint}>Пока нет записей в журнале.</p>
            ) : null}
            {packageVersions.length > 0 ? (
              <div className={styles.tableWrap}>
                <table className={styles.packageVersionsTable}>
                  <thead>
                    <tr>
                      <th>Когда</th>
                      <th>Кто</th>
                      <th>Что сделано</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packageVersions.map((v) => (
                      <tr key={v.id}>
                        <td>{formatPackageVersionDate(v.createdAt)}</td>
                        <td>{formatPackageVersionActor(v)}</td>
                        <td>{formatPackageVersionKeyMoments(v.keyMoments)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <div className={styles.saveModalActionsRow}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => setIsVersionsHistoryOpen(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <AddCrmCustomerModal
        isOpen={addCrmCustomerModalOpen}
        onClose={() => setAddCrmCustomerModalOpen(false)}
        onCreated={(created) => {
          if (contractAndEstimateLocked) return;
          const next = mergeRepairFormFromCreatedCrmCustomer(created, formRef.current);
          setForm(next);
          setCustomerSearchKind(next.customer.type);
          touchPackageData();
        }}
      />

      <div className={styles.repairPackageTabBarRow}>
        <div
          className={`${styles.tabBar} ${styles.blockTabs} ${styles.repairPackageTabBarCompact}`}
          role="tablist"
          aria-label="Разделы пакета. Перетащите вкладку, чтобы изменить порядок."
        >
          {orderedVisibleRepairTabs.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              draggable
              aria-selected={activeTab === id}
              title={
                contractAndEstimateLocked && (id === 'contract' || id === 'estimate')
                  ? `${REPAIR_DOCUMENT_TAB_LABELS[id]} — только просмотр (договор подписан)`
                  : `${REPAIR_DOCUMENT_TAB_LABELS[id]} — перетащите для смены порядка`
              }
              className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''} ${
                id === 'interactiveFinalEstimate' ||
                id === 'finalEstimate' ||
                id === 'finalWorkOrder'
                  ? styles.summaryTab
                  : ''
              } ${id === 'interactiveFinalEstimate' ? styles.summaryTabFirst : ''} ${
                id === 'finalWorkOrder' ? styles.summaryTabLast : ''
              }`}
              onClick={() => handleRepairTabActivate(id)}
              onDragStart={(e) => handleRepairTabDragStart(id, e)}
              onDragOver={handleRepairTabDragOver}
              onDrop={handleRepairTabDrop(id)}
            >
              <span className={styles.repairTabLabelInner}>
                {contractAndEstimateLocked && (id === 'contract' || id === 'estimate') ? (
                  <RepairTabLockIcon />
                ) : null}
                <span>{REPAIR_DOCUMENT_TAB_LABELS_SHORT[id]}</span>
                {id === 'interactiveFinalEstimate' ? (
                  <span
                    className={`${styles.repairTabUnassignedBadge} ${
                      unassignedInteractiveRowsCount === 0
                        ? styles.repairTabUnassignedBadgeDone
                        : styles.repairTabUnassignedBadgePending
                    }`}
                    title="Количество неприкреплённых позиций"
                  >
                    {unassignedInteractiveRowsCount}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
        {form.addendumSlotCount < 5 ? (
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.repairAddAddendumTabBtn}`}
            title={
              contractAndEstimateLocked &&
              form.addendumSlots[form.addendumSlotCount - 1]?.status !== 'SIGNED'
                ? 'Сначала отметьте текущее Д/с как подписанное'
                : 'Показать ещё одну вкладку дополнительного соглашения (до пяти)'
            }
            disabled={
              contractAndEstimateLocked &&
              form.addendumSlots[form.addendumSlotCount - 1]?.status !== 'SIGNED'
            }
            onClick={() => {
              if (
                contractAndEstimateLocked &&
                form.addendumSlots[form.addendumSlotCount - 1]?.status !== 'SIGNED'
              ) {
                return;
              }
              const next = form.addendumSlotCount + 1;
              setForm((f) => ({ ...f, addendumSlotCount: next }));
              touchPackageData();
              setActiveTab(`addendum${next}` as RepairDocumentTabId);
            }}
          >
            + Д/с №{form.addendumSlotCount + 1}
          </button>
        ) : null}
        {form.addendumSlotCount > 1 ? (
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.repairAddAddendumTabBtn}`}
            title={
              isAddendumSlotEmpty(
                form.addendumSlots[form.addendumSlotCount - 1],
                form.addendumDocumentDates[form.addendumSlotCount - 1]
              )
                ? `Удалить пустое Д/с №${form.addendumSlotCount}`
                : `Можно удалить только пустое Д/с №${form.addendumSlotCount}`
            }
            disabled={
              !isAddendumSlotEmpty(
                form.addendumSlots[form.addendumSlotCount - 1],
                form.addendumDocumentDates[form.addendumSlotCount - 1]
              )
            }
            onClick={() => {
              const lastIdx = form.addendumSlotCount - 1;
              if (
                !isAddendumSlotEmpty(
                  form.addendumSlots[lastIdx],
                  form.addendumDocumentDates[lastIdx]
                )
              ) {
                return;
              }
              const nextCount = form.addendumSlotCount - 1;
              setForm((f) => {
                const nextDates = [
                  ...f.addendumDocumentDates,
                ] as RepairPackageFormData['addendumDocumentDates'];
                nextDates[lastIdx] = '';
                const nextSlots = [...f.addendumSlots] as RepairPackageFormData['addendumSlots'];
                nextSlots[lastIdx] = {
                  status: 'OPEN',
                  signedAt: '',
                  paidAt: '',
                  selectedPresetIds: [],
                  snapshot: null,
                  excludedSelectedPresetIds: [],
                  excludedSnapshot: null,
                  notes: '',
                  excludedNotes: '',
                };
                return {
                  ...f,
                  addendumSlotCount: nextCount,
                  addendumDocumentDates: nextDates,
                  addendumSlots: nextSlots,
                };
              });
              touchPackageData();
              const removedTabs = new Set<string>([
                `addendum${form.addendumSlotCount}`,
                `workOrderAddendum${form.addendumSlotCount}`,
              ]);
              if (removedTabs.has(activeTab)) {
                setActiveTab(`addendum${nextCount}` as RepairDocumentTabId);
              }
            }}
          >
            − Д/с №{form.addendumSlotCount}
          </button>
        ) : null}
      </div>

      {activeTab === 'data' ? (
        <div
          className={`${styles.blockData} ${styles.dataCompact} ${styles.repairContractDataTabDense}`}
        >
          <div className={styles.formGrid}>
            <div className={styles.dataTopRow}>
              <div className={styles.dataTopBlock}>
                <div
                  className={`${styles.sectionCard} ${styles.sectionCustomer} ${
                    contractAndEstimateLocked ? styles.repairDataSectionCardLocked : ''
                  }`}
                >
                  {contractAndEstimateLocked ? (
                    <RepairDataSectionLockCorner title="Договор подписан: блок «Договор и объект» только для просмотра" />
                  ) : null}
                  <h3 className={styles.sectionTitle}>Договор и объект</h3>
                  <div className={styles.contractCompactBlock}>
                    <div className={`${styles.contractInlineRow} ${styles.contractHeaderMetaRow}`}>
                      <div className={`${styles.field} ${styles.contractInlineField}`}>
                        <label htmlFor="cn">Номер договора</label>
                        <input
                          id="cn"
                          value={form.contract.number}
                          onChange={(e) => updateContract('number', e.target.value)}
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                          className={contractAndEstimateLocked ? styles.autoFilledInput : undefined}
                        />
                      </div>
                      <div className={`${styles.field} ${styles.contractInlineField}`}>
                        <label htmlFor="cd">Дата договора</label>
                        <input
                          id="cd"
                          value={form.contract.date}
                          onChange={(e) => updateContract('date', e.target.value)}
                          placeholder="дд.мм.гггг"
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                          className={contractAndEstimateLocked ? styles.autoFilledInput : undefined}
                        />
                      </div>
                      <div className={`${styles.field} ${styles.contractInlineField}`}>
                        <label htmlFor="wp">Срок договора (дней)</label>
                        <input
                          id="wp"
                          inputMode="numeric"
                          value={form.contract.workPeriod}
                          onChange={(e) => updateContract('workPeriod', e.target.value)}
                          placeholder="60"
                          title="Календарных дней; в шаблоне: {{contract.workPeriod}}"
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                          className={contractAndEstimateLocked ? styles.autoFilledInput : undefined}
                        />
                      </div>
                    </div>
                    <div
                      className={`${styles.contractInlineRow} ${styles.contractObjectAddressRow}`}
                    >
                      <div className={`${styles.field} ${styles.contractInlineField}`}>
                        <label htmlFor="o_addr">Адрес объекта</label>
                        <input
                          id="o_addr"
                          value={form.object.objectAddress}
                          onChange={(e) => updateObject('objectAddress', e.target.value)}
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                          className={contractAndEstimateLocked ? styles.autoFilledInput : undefined}
                        />
                      </div>
                      <div className={`${styles.field} ${styles.contractInlineField}`}>
                        <label htmlFor="o_floor">Этаж</label>
                        <input
                          id="o_floor"
                          value={form.object.objectFloor}
                          onChange={(e) => updateObject('objectFloor', e.target.value)}
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                          className={contractAndEstimateLocked ? styles.autoFilledInput : undefined}
                        />
                      </div>
                    </div>
                    <div
                      className={`${styles.contractInlineRow} ${styles.contractObjectDescDiscountRow}`}
                    >
                      <div className={`${styles.field} ${styles.contractInlineField}`}>
                        <label htmlFor="o_desc">Описание работ / объекта</label>
                        <textarea
                          id="o_desc"
                          value={form.object.objectDescription}
                          onChange={(e) => updateObject('objectDescription', e.target.value)}
                          disabled={contractAndEstimateLocked}
                          className={contractAndEstimateLocked ? styles.autoFilledInput : undefined}
                        />
                      </div>
                      <div
                        className={`${styles.field} ${styles.contractInlineField} ${styles.contractDiscountFieldCell}`}
                      >
                        <div className={styles.contractDiscountLabelRow}>
                          <label htmlFor="contract_discount_pct">Скидка по договору (%)</label>
                        </div>
                        <input
                          id="contract_discount_pct"
                          inputMode="decimal"
                          value={form.contract.discountPercent}
                          onChange={(e) => updateContract('discountPercent', e.target.value)}
                          placeholder="0"
                          title={
                            contractAndEstimateLocked
                              ? 'После статуса «Договор подписан» общие данные договора изменить нельзя'
                              : 'Применяется к смете, доп. соглашениям, заказ-наряду и вкладке «Оплаты»'
                          }
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                          className={contractAndEstimateLocked ? styles.autoFilledInput : undefined}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.dataTopBlock}>
                <div
                  ref={customerSearchRootRef}
                  onFocusCapture={openCustomerSearchPopoverIfReady}
                  className={`${styles.field} ${styles.crmCompactField} ${styles.crmCompactBox} ${styles.repairCustomerSearchWrap} ${
                    contractAndEstimateLocked ? styles.repairCustomerSearchWrapLocked : ''
                  }`}
                >
                  <h3 className={styles.sectionTitle}>Поиск заказчика в базе</h3>
                  <div className={styles.repairCustomerSearchModeRow}>
                    <div
                      className={styles.repairCustomerSearchKindGroup}
                      role="group"
                      aria-label="Тип заказчика"
                    >
                      <button
                        type="button"
                        className={
                          customerSearchKind === 'PERSON' ? styles.primaryBtn : styles.secondaryBtn
                        }
                        disabled={contractAndEstimateLocked}
                        onClick={() => {
                          setCustomerSearchKind('PERSON');
                        }}
                      >
                        Физлицо
                      </button>
                      <button
                        type="button"
                        className={
                          customerSearchKind === 'COMPANY' ? styles.primaryBtn : styles.secondaryBtn
                        }
                        disabled={contractAndEstimateLocked}
                        onClick={() => {
                          setCustomerSearchKind('COMPANY');
                        }}
                      >
                        ЮЛ
                      </button>
                      <button
                        type="button"
                        className={
                          customerSearchKind === 'ENTREPRENEUR'
                            ? styles.primaryBtn
                            : styles.secondaryBtn
                        }
                        disabled={contractAndEstimateLocked}
                        onClick={() => {
                          setCustomerSearchKind('ENTREPRENEUR');
                        }}
                        title="Индивидуальный предприниматель"
                      >
                        ИП
                      </button>
                    </div>
                    <button
                      type="button"
                      className={`${styles.primaryBtn} ${styles.repairCustomerSearchCrmBtn}`}
                      disabled={contractAndEstimateLocked}
                      onClick={() => setAddCrmCustomerModalOpen(true)}
                    >
                      Добавить нового заказчика
                    </button>
                  </div>
                  {customerSearchKind === 'PERSON' ? (
                    <div className={styles.repairCustomerSearchFlGrid}>
                      <div className={styles.field}>
                        <label htmlFor="crm_cust_fio">ФИО</label>
                        <input
                          id="crm_cust_fio"
                          value={customerFlFio}
                          onChange={(e) => setCustomerFlFio(e.target.value)}
                          onClick={openCustomerSearchPopoverIfReady}
                          placeholder="Фамилия Имя Отчество"
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="crm_cust_phone">Телефон</label>
                        <input
                          id="crm_cust_phone"
                          value={customerFlPhone}
                          onChange={(e) => setCustomerFlPhone(e.target.value)}
                          onClick={openCustomerSearchPopoverIfReady}
                          placeholder="+7…"
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="crm_cust_addr">Адрес</label>
                        <input
                          id="crm_cust_addr"
                          value={customerFlAddress}
                          onChange={(e) => setCustomerFlAddress(e.target.value)}
                          onClick={openCustomerSearchPopoverIfReady}
                          placeholder="Город, улица…"
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={styles.repairCustomerSearchUlGrid}>
                      <div className={styles.field}>
                        <label htmlFor="crm_cust_org">Наименование организации</label>
                        <input
                          id="crm_cust_org"
                          value={customerUlOrg}
                          onChange={(e) => setCustomerUlOrg(e.target.value)}
                          onClick={openCustomerSearchPopoverIfReady}
                          placeholder="ООО, ИП…"
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="crm_cust_inn">ИНН</label>
                        <input
                          id="crm_cust_inn"
                          value={customerUlInn}
                          onChange={(e) => setCustomerUlInn(e.target.value)}
                          onClick={openCustomerSearchPopoverIfReady}
                          placeholder="10 или 12 цифр"
                          inputMode="numeric"
                          autoComplete="off"
                          disabled={contractAndEstimateLocked}
                        />
                      </div>
                    </div>
                  )}
                  {customerSearchQuery.trim().length < 2 ? (
                    <p className={styles.hint} style={{ marginTop: 6 }}>
                      Введите не менее 2 символов (по всем заполненным полям). Совпадения — в
                      выпадающем списке.
                    </p>
                  ) : null}
                  {customerSearchPopoverOpen &&
                  !contractAndEstimateLocked &&
                  customerSearchQuery.trim().length >= 2 ? (
                    <div className={styles.repairCustomerSearchDropdown} role="listbox">
                      <div className={styles.repairCustomerSearchDropdownHeader}>
                        {customerSearchLoading
                          ? 'Поиск…'
                          : `Найдено: ${customerResults.length}. Клик по строке — подставить данные в форму.`}
                      </div>
                      <div className={styles.repairCustomerSearchDropdownBody}>
                        {customerSearchLoading ? null : customerResults.length === 0 ? (
                          <p className={styles.hint} style={{ margin: '8px 12px' }}>
                            Ничего не найдено
                          </p>
                        ) : (
                          <ul className={styles.repairCustomerSearchDropdownList}>
                            {customerResults.map((c) => {
                              const rowKey = `${c.lastContractId ?? c.customerName}|${c.customerPhone}`;
                              return (
                                <li key={rowKey} className={styles.crmResultItem}>
                                  <button
                                    type="button"
                                    className={`${styles.secondaryBtn} ${styles.crmResultBtn}`}
                                    disabled={contractAndEstimateLocked || !c.lastContractId}
                                    onClick={() => {
                                      if (!c.lastContractId) return;
                                      void applyCrmContractToFormById(c.lastContractId, c);
                                    }}
                                  >
                                    {c.customerName} · {c.customerPhone}
                                    {c.customerAddress ? ` · ${c.customerAddress}` : ''}
                                    {c.lastContractNumber != null
                                      ? ` · последний договор № ${c.lastContractNumber}`
                                      : ''}
                                    {c.contractCount > 1 ? ` (${c.contractCount} дог.)` : ''}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              className={`${styles.sectionCard} ${styles.sectionCustomer} ${
                contractAndEstimateLocked ? styles.repairDataSectionCardLocked : ''
              }`}
            >
              {contractAndEstimateLocked ? (
                <RepairDataSectionLockCorner title="Договор подписан: блок «Заказчик» только для просмотра" />
              ) : null}
              <h3 className={styles.sectionTitle}>Заказчик</h3>
              <p className={styles.hint} style={{ marginTop: 4, marginBottom: 10 }}>
                Данные подставляются из выбранной строки в блоке «Поиск заказчика в базе».
                Редактировать здесь нельзя. Чтобы завести карточку и указать телефоны, нажмите
                «Добавить нового заказчика» в блоке поиска.
              </p>
              <div className={styles.sectionFields}>
                <div className={styles.field}>
                  <label htmlFor="c_type">Тип заказчика</label>
                  <select id="c_type" value={form.customer.type} disabled>
                    <option value="PERSON">Физлицо</option>
                    <option value="COMPANY">ЮЛ</option>
                    <option value="ENTREPRENEUR">ИП</option>
                  </select>
                </div>
                {form.customer.type === 'PERSON' ? (
                  <div className={styles.field}>
                    <label htmlFor="c_fullName">ФИО</label>
                    <input id="c_fullName" value={form.customer.fullName} readOnly />
                  </div>
                ) : (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="c_repFullNameNom">ФИО представителя (именит.)</label>
                      <input
                        id="c_repFullNameNom"
                        value={form.customer.representativeFullNameNominative}
                        readOnly
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_repFullNameGen">ФИО представителя (родит.)</label>
                      <input
                        id="c_repFullNameGen"
                        value={form.customer.representativeFullNameGenitive}
                        readOnly
                      />
                    </div>
                  </>
                )}
                {form.customer.type !== 'PERSON' ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="c_orgName">Наименование организации</label>
                      <input id="c_orgName" value={form.customer.organizationName} readOnly />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_posNom">Должность представ. (именит.)</label>
                      <input
                        id="c_posNom"
                        value={form.customer.representativePositionNominative}
                        readOnly
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_posGen">Должность представ. (родит.)</label>
                      <input
                        id="c_posGen"
                        value={form.customer.representativePositionGenitive}
                        readOnly
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_inn">ИНН</label>
                      <input id="c_inn" value={form.customer.inn} readOnly />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_ogrn">ОГРН</label>
                      <input id="c_ogrn" value={form.customer.ogrn} readOnly />
                    </div>
                  </>
                ) : null}
                <div className={styles.field}>
                  <label htmlFor="c_address">Адрес</label>
                  <input id="c_address" value={form.customer.address} readOnly />
                </div>
                <div className={`${styles.field} ${styles.customerEmailInRow}`}>
                  <label htmlFor="c_email">E-mail</label>
                  <input
                    id="c_email"
                    type="email"
                    autoComplete="email"
                    value={form.customer.email}
                    readOnly
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldSpanAll}`}>
                  <label htmlFor="c_phones_ro">Телефоны</label>
                  <input
                    id="c_phones_ro"
                    type="text"
                    readOnly
                    value={repairCustomerPhonesReadonlyDisplay}
                    title={repairCustomerPhonesReadonlyDisplay}
                  />
                  <p className={styles.hint} style={{ marginTop: 4 }}>
                    Несколько номеров — только в карточке CRM через «Добавить нового заказчика»; в
                    шаблоне основной номер — <code>{'{{customer.phone}}'}</code>.
                  </p>
                </div>
                <div
                  className={`${styles.field} ${styles.fieldSpanAll} ${styles.customerBankDetailsField}`}
                >
                  <label htmlFor="c_bank_details">Банковские реквизиты</label>
                  <textarea
                    id="c_bank_details"
                    rows={1}
                    value={form.customer.bankDetails}
                    readOnly
                  />
                </div>
                {form.customer.type === 'PERSON' ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="c_passport">Паспорт (серия и номер)</label>
                      <input id="c_passport" value={form.customer.passportSeriesNumber} readOnly />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_passportBy">Кем выдан</label>
                      <input id="c_passportBy" value={form.customer.passportIssuedBy} readOnly />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_passportDate">Дата выдачи</label>
                      <input id="c_passportDate" value={form.customer.passportIssueDate} readOnly />
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div
              className={`${styles.sectionCard} ${styles.sectionExecutor} ${
                contractAndEstimateLocked ? styles.repairDataSectionCardLocked : ''
              }`}
            >
              {contractAndEstimateLocked ? (
                <RepairDataSectionLockCorner title="Договор подписан: блок «Исполнитель» только для просмотра" />
              ) : null}
              <h3 className={styles.sectionTitle}>Исполнитель</h3>
              <p className={styles.hint} style={{ marginTop: 4, marginBottom: 10 }}>
                Реквизиты подставляются из выбранного набора в справочнике «Исполнители».
                Редактировать здесь нельзя — только выбор набора.
              </p>
              <div className={styles.sectionFields}>
                <div className={styles.field}>
                  <label htmlFor="e_profile">Исполнители (из справочника)</label>
                  <select
                    id="e_profile"
                    value={form.executor.selectedProfileTitle}
                    onChange={(e) => applyExecutorProfile(e.target.value)}
                    disabled={contractAndEstimateLocked}
                  >
                    <option value="">— выбрать набор —</option>
                    {executorProfiles.map((profile) => (
                      <option key={profile.title} value={profile.title}>
                        {profile.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_company">Наименование организации</label>
                  <input id="e_company" readOnly value={form.executor.companyName} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_inn">ИНН</label>
                  <input id="e_inn" readOnly value={form.executor.inn} />
                </div>
                {form.executor.executorKind === 'COMPANY' ? (
                  <div className={styles.field}>
                    <label htmlFor="e_kpp">КПП</label>
                    <input id="e_kpp" readOnly value={form.executor.kpp} />
                  </div>
                ) : null}
                {form.executor.executorKind === 'COMPANY' ? (
                  <div className={styles.field}>
                    <label htmlFor="e_ogrn">ОГРН</label>
                    <input id="e_ogrn" readOnly value={form.executor.ogrn} />
                  </div>
                ) : (
                  <div className={styles.field}>
                    <label htmlFor="e_ogrnip">ОГРНИП</label>
                    <input id="e_ogrnip" readOnly value={form.executor.ogrnip} />
                  </div>
                )}
                <div className={styles.field}>
                  <label htmlFor="e_email">E-mail</label>
                  <input
                    id="e_email"
                    type="email"
                    autoComplete="email"
                    readOnly
                    value={form.executor.email}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_legal">Юридический адрес</label>
                  <textarea id="e_legal" readOnly value={form.executor.legalAddress} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_actual">Адрес для корреспонденции</label>
                  <textarea id="e_actual" readOnly value={form.executor.actualAddress} />
                </div>
                <div className={`${styles.field} ${styles.executorBankDetailsField}`}>
                  <label htmlFor="e_bank">Банковские реквизиты</label>
                  <textarea id="e_bank" readOnly value={form.executor.bankDetails} />
                </div>
              </div>
            </div>

            <div
              className={`${styles.sectionCard} ${styles.sectionExecutor} ${
                contractAndEstimateLocked ? styles.repairDataSectionCardLocked : ''
              }`}
            >
              {contractAndEstimateLocked ? (
                <RepairDataSectionLockCorner title="Договор подписан: блок «Подписант» только для просмотра" />
              ) : null}
              <h3 className={styles.sectionTitle}>Подписант</h3>
              <p className={styles.hint} style={{ marginTop: 4, marginBottom: 10 }}>
                Данные подставляются из выбранной карточки в справочнике «Подписанты». Редактировать
                здесь нельзя — только выбор карточки.
              </p>
              <div className={styles.sectionFields}>
                <div className={styles.field}>
                  <label htmlFor="s_profile">Карточка подписанта (из справочника)</label>
                  <select
                    id="s_profile"
                    value={form.executor.selectedSignatoryProfileTitle}
                    onChange={(e) => applySignatoryProfile(e.target.value)}
                    disabled={contractAndEstimateLocked}
                  >
                    <option value="">— выбрать карточку —</option>
                    {signatoryProfiles.map((profile) => (
                      <option key={profile.title} value={profile.title}>
                        {profile.title}
                      </option>
                    ))}
                  </select>
                </div>
                {form.executor.signatoryCrmUserId ? (
                  <p className={styles.hint} style={{ gridColumn: '1 / -1', marginTop: 0 }}>
                    Связь с CRM: id сотрудника{' '}
                    <code style={{ fontSize: '0.9em' }}>{form.executor.signatoryCrmUserId}</code> —
                    тот же пользователь, что в разделе «Менеджеры».
                  </p>
                ) : null}
                <div className={styles.field}>
                  <label htmlFor="e_directorNom">Подписант (именит. падеж)</label>
                  <input id="e_directorNom" readOnly value={form.executor.directorNameNominative} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_directorGen">Подписант (родит. падеж)</label>
                  <input id="e_directorGen" readOnly value={form.executor.directorNameGenitive} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_basis">Действует на основании</label>
                  <input id="e_basis" readOnly value={form.executor.basis} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_sales_office">Офис продаж</label>
                  <input id="e_sales_office" readOnly value={form.executor.salesOffice} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_office_phone">Телефон офиса</label>
                  <input id="e_office_phone" readOnly value={form.executor.officePhone} />
                </div>
              </div>
            </div>
          </div>
          <p className={`${styles.hint} ${styles.contractInstructionHint}`}>
            Полная инструкция:{' '}
            <Link className={styles.link} href="/admin/contract-documents/instruction">
              Оформление договоров → Инструкция
            </Link>
            . На вкладке «Договор» можно править HTML и вставлять плейсхолдеры.
          </p>
        </div>
      ) : activeTab === 'payments' ? (
        <RepairContractPaymentsTab
          packageId={packageId}
          form={form}
          onError={setError}
          onUpdateContract={updateContract}
        />
      ) : activeTab === 'estimate' ? (
        <div className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact}`}>
          <div className={styles.formGrid}>
            <div className={styles.sectionCard}>
              {contractAndEstimateLocked ? (
                <p className={`${styles.hint} ${styles.estimateLockNotice}`}>
                  Договор подписан: смета договора и прикреплённые к ней расчёты только для
                  просмотра и печати. Дополнительные объёмы оформляйте на вкладках «Д/с №1»…«Д/с
                  №5»: там можно прикрепить новые расчёты к соответствующему дополнительному
                  соглашению.
                </p>
              ) : null}
              <div className={styles.estimateSectionHeader}>
                <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>Смета</h3>
              </div>
              <p className={styles.hint} style={{ marginTop: 0 }}>
                Объект выбирается только здесь: все расчёты основной сметы и доп. соглашений должны
                относиться к одному объекту. После первого прикреплённого расчёта объект фиксируется
                автоматически.
              </p>
              <div className={styles.sectionFields}>
                <div className={`${styles.estimatePickAndAttachedRow} ${styles.fieldSpanAll}`}>
                  <div className={styles.estimatePickColumn}>
                    <div className={styles.estimateSelectsRow}>
                      <div className={styles.field}>
                        <label htmlFor="estimate_group_select">Объект</label>
                        <select
                          id="estimate_group_select"
                          value={
                            (form.estimate.selectedPresetIds?.length ?? 0) > 0
                              ? contractEstimateObjectKey
                              : estimateAttachGroupKey
                          }
                          disabled={
                            contractAndEstimateLocked ||
                            (form.estimate.selectedPresetIds?.length ?? 0) > 0
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            setEstimateAttachGroupKey(v);
                            setEstimatePresetToAttach('');
                            if (
                              !contractAndEstimateLocked &&
                              (form.estimate.selectedPresetIds?.length ?? 0) === 0
                            ) {
                              setForm((p) => ({ ...p, estimateObjectGroupKey: v }));
                              touchPackageData();
                            }
                          }}
                        >
                          <option value="">— объект —</option>
                          {attachEstimatePickMeta.hasUngrouped ? (
                            <option value="__ungrouped__">Вне объекта</option>
                          ) : null}
                          {attachEstimatePickMeta.groupsOrdered.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="estimate_select">Расчёт</label>
                        <select
                          id="estimate_select"
                          value={estimatePresetToAttach}
                          disabled={
                            contractAndEstimateLocked ||
                            !((form.estimate.selectedPresetIds?.length ?? 0) > 0
                              ? contractEstimateObjectKey
                              : estimateAttachGroupKey || contractEstimateObjectKey)
                          }
                          onChange={(e) => setEstimatePresetToAttach(e.target.value)}
                        >
                          <option value="">
                            {(form.estimate.selectedPresetIds?.length ?? 0) > 0
                              ? '— расчёт —'
                              : estimateAttachGroupKey || contractEstimateObjectKey
                                ? '— расчёт —'
                                : '— сначала выберите объект —'}
                          </option>
                          {attachableForSelectedGroup.map((preset) => (
                            <option key={preset.id} value={preset.id}>
                              {preset.title} · {preset.categoryName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={styles.estimateAttachBlock}>
                      <div className={styles.estimateAttachActionsRow}>
                        <button
                          type="button"
                          className={`${styles.primaryBtn} ${styles.estimateAttachPrimaryBtn}`}
                          disabled={contractAndEstimateLocked || !estimatePresetToAttach}
                          onClick={() => {
                            addEstimatePresetToForm(estimatePresetToAttach);
                            setEstimatePresetToAttach('');
                          }}
                        >
                          Прикрепить
                        </button>
                      </div>
                      {attachableEstimatePresets.length === 0 ? (
                        <p className={`${styles.hint} ${styles.estimateTabHint}`}>
                          Нет свободных расчётов для прикрепления.
                        </p>
                      ) : (
                        <p className={`${styles.hint} ${styles.estimateTabHint}`}>
                          Сначала объект, затем расчёт → «Прикрепить». Нельзя смешивать расчёты
                          разных объектов. Справа — порядок в смете (перетаскивание).
                        </p>
                      )}
                    </div>
                  </div>
                  <aside className={styles.estimateAttachedColumn}>
                    <div className={styles.estimateAttachedColumnTitle}>Прикреплённые</div>
                    {(form.estimate.selectedPresetIds?.length ?? 0) > 0 ? (
                      <div className={styles.estimateAttachedPresetList}>
                        {(form.estimate.selectedPresetIds ?? []).map((presetId) => {
                          const preset = estimatePresets.find((x) => x.id === presetId);
                          const usageCount = estimateUsageById.get(presetId)?.length ?? 0;
                          return (
                            <div
                              key={presetId}
                              draggable={!contractAndEstimateLocked}
                              onDragStart={() => {
                                if (!contractAndEstimateLocked)
                                  setDraggingEstimatePresetId(presetId);
                              }}
                              onDragEnd={() => setDraggingEstimatePresetId(null)}
                              onDragOver={(e) => {
                                if (!contractAndEstimateLocked) e.preventDefault();
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (contractAndEstimateLocked) return;
                                if (draggingEstimatePresetId) {
                                  moveEstimatePresetInForm(draggingEstimatePresetId, presetId);
                                }
                                setDraggingEstimatePresetId(null);
                              }}
                              className={styles.estimateAttachedPresetRow}
                              style={{
                                opacity: draggingEstimatePresetId === presetId ? 0.6 : 1,
                              }}
                            >
                              <div className={styles.estimateAttachedPresetMain}>
                                <strong>{preset?.title ?? presetId}</strong>
                                <span className={styles.estimateAttachedPresetMeta}>
                                  {' '}
                                  · {preset?.categoryName ?? '—'}
                                  {usageCount > 0 ? ` · ещё в пакетах: ${usageCount}` : null}
                                </span>
                              </div>
                              <button
                                type="button"
                                className={`${styles.secondaryBtn} ${styles.estimateAttachedRemoveBtn}`}
                                aria-label="Убрать расчёт из сметы"
                                title="Убрать"
                                disabled={contractAndEstimateLocked}
                                onClick={() => removeEstimatePresetFromForm(presetId)}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={styles.estimateAttachedEmpty}>Пока нет</p>
                    )}
                  </aside>
                </div>
                {form.estimate.selectedPresetIds?.length &&
                !(form.estimate.selectedPresetIds ?? []).every(
                  (id) => (estimateUsageById.get(id)?.length ?? 0) === 0
                ) ? (
                  <p
                    className={`${styles.hint} ${styles.estimateTabHint} ${styles.estimateTabHintFullWidth}`}
                  >
                    Часть расчётов уже прикреплена в других пакетах:{' '}
                    {[
                      ...new Set(
                        (form.estimate.selectedPresetIds ?? [])
                          .flatMap((id) => estimateUsageById.get(id) ?? [])
                          .map((u) => `№ ${u.contractNumber} от ${u.contractDate}`)
                      ),
                    ].join('; ')}
                  </p>
                ) : null}
                <div
                  className={`${styles.field} ${styles.fieldSpanAll} ${styles.estimateSheetField}`}
                >
                  <label>Содержимое объединённой сметы</label>
                  <div className={styles.estimateA4Wrap}>
                    <article
                      ref={estimatePrintSheetRef}
                      className={styles.estimateA4Sheet}
                      data-print-target="estimate-sheet"
                    >
                      <p className={styles.estimateA4AppendixRef}>
                        Приложение №1 к договору № {estimateAppendixContractRef.num} от{' '}
                        {estimateAppendixContractRef.date}
                      </p>
                      {(form.estimate.snapshot?.rooms?.length ?? 0) > 0 ? (
                        <>
                          <h4 className={styles.estimateA4Title}>Смета работ</h4>
                          {selectedEstimateSections.length > 0 ? (
                            selectedEstimateSections.map((section) => (
                              <section
                                key={section.categoryName}
                                className={styles.estimateA4CategorySection}
                              >
                                <p className={styles.estimateA4Meta}>
                                  Категория работ: <strong>{section.categoryName}</strong>
                                  ;&nbsp;&nbsp;&nbsp;&nbsp;Помещений: {section.rooms.length}
                                </p>
                                {section.rooms.map((room, roomIndex) => (
                                  <section
                                    key={`${section.categoryName}-${room.name}-${roomIndex}`}
                                    className={styles.estimateA4Room}
                                  >
                                    <div className={styles.estimateA4RoomHeader}>
                                      <span>
                                        {roomIndex + 1}. {room.name}
                                      </span>
                                      <strong>{formatMoneyValue(room.total)} руб.</strong>
                                    </div>
                                    <table className={styles.estimateA4Table}>
                                      <thead>
                                        <tr>
                                          <th>№</th>
                                          <th>Наименование</th>
                                          <th>Ед.</th>
                                          <th>Кол-во</th>
                                          <th>Цена</th>
                                          <th>Сумма</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {room.lines.map((line, lineIndex) => (
                                          <tr key={`${line.name}-${lineIndex}`}>
                                            <td>{lineIndex + 1}</td>
                                            <td>{line.name}</td>
                                            <td>{line.unit}</td>
                                            <td>{line.quantity}</td>
                                            <td>{formatMoneyValue(line.price)}</td>
                                            <td>{formatMoneyValue(line.amount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </section>
                                ))}
                              </section>
                            ))
                          ) : (
                            <p className={styles.estimateA4Meta}>
                              Категория работ: <strong>—</strong>
                              ;&nbsp;&nbsp;&nbsp;&nbsp;Помещений:{' '}
                              {form.estimate.snapshot?.rooms.length ?? 0}
                            </p>
                          )}
                          <section className={styles.estimateA4Summary}>
                            {selectedEstimateSections.length > 0 ? (
                              <>
                                <h5 className={styles.estimateA4SummaryTitle}>
                                  Итоги по категориям
                                </h5>
                                <ul className={styles.estimateA4SummaryList}>
                                  {selectedEstimateSections.map((section) => {
                                    const categoryTotal = section.rooms.reduce(
                                      (sum, room) => sum + room.total,
                                      0
                                    );
                                    return (
                                      <li key={`category-summary-${section.categoryName}`}>
                                        <span>{section.categoryName}</span>
                                        <strong>{formatMoneyValue(categoryTotal)} руб.</strong>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </>
                            ) : null}
                          </section>
                          {contractDiscountPercentParsed > 0 ? (
                            <>
                              <p className={styles.estimateA4Total}>
                                Итого по смете (без скидки):{' '}
                                <strong>
                                  {formatMoneyValue(form.estimate.snapshot?.total ?? 0)} руб.
                                </strong>
                              </p>
                              <p className={styles.estimateA4DiscountMeta}>
                                Скидка по договору:{' '}
                                {String(contractDiscountPercentParsed).replace('.', ',')}%
                              </p>
                              <p className={styles.estimateA4Total}>
                                Итого со скидкой:{' '}
                                <strong>
                                  {formatMoneyValue(
                                    applyRepairContractDiscountToAmount(
                                      form.estimate.snapshot?.total ?? 0,
                                      contractDiscountPercentParsed
                                    )
                                  )}{' '}
                                  руб.
                                </strong>
                              </p>
                            </>
                          ) : (
                            <p className={styles.estimateA4Total}>
                              Итого по смете:{' '}
                              <strong>
                                {formatMoneyValue(form.estimate.snapshot?.total ?? 0)} руб.
                              </strong>
                            </p>
                          )}
                          <RepairEstimateSignaturesBlock
                            directorName={formMergedForTemplate.executor.directorName}
                            customerFullName={formMergedForTemplate.customer.fullName}
                          />
                          <div className={styles.estimateA4HandwritingNote}>
                            <p className={styles.estimateA4HandwritingNoteLabel}>Примечание:</p>
                            <div className={styles.estimateA4HandwritingLines} aria-hidden>
                              {Array.from({ length: 3 }, (_, i) => (
                                <div key={i} className={styles.estimateA4HandwritingLine} />
                              ))}
                            </div>
                          </div>
                          <RepairEstimateSignaturesBlock
                            directorName={formMergedForTemplate.executor.directorName}
                            customerFullName={formMergedForTemplate.customer.fullName}
                          />
                        </>
                      ) : (
                        <p className={styles.estimateA4Empty}>Расчёты не прикреплены.</p>
                      )}
                    </article>
                  </div>
                </div>
                <p className={styles.hint} style={{ margin: 0 }}>
                  Создание и редактирование расчётов выполняется в разделе{' '}
                  <Link className={styles.link} href="/admin/contract-documents/estimates">
                    «Расчёты»
                  </Link>
                  . В таблице сметы суммы по строкам — без скидки по договору; скидка показывается
                  только в итоговом блоке. Стоимость позиций со скидкой — на вкладке «Итоговый
                  заказ-наряд».
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'interactiveFinalEstimate' ? (
        <div
          className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact} ${styles.interactiveFinalEstimateTab}`}
        >
          <div className={styles.formGrid}>
            <div className={styles.sectionCard}>
              <div className={styles.interactiveEstimateTitleRow}>
                <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>
                  Интерактивная итоговая смета
                </h3>
                <span
                  className={`${styles.interactiveUnassignedBadge} ${
                    unassignedInteractiveRowsCount === 0
                      ? styles.interactiveUnassignedBadgeDone
                      : styles.interactiveUnassignedBadgePending
                  }`}
                  title="Количество неприкреплённых позиций"
                >
                  {unassignedInteractiveRowsCount}
                </span>
              </div>
              <div className={styles.field} style={{ marginBottom: 12 }}>
                {repairInstallers.length === 0 ? (
                  <p className={styles.hint} style={{ margin: '6px 0 0' }}>
                    Список мастеров пуст. Добавьте мастеров в разделе CRM → Мастера.
                  </p>
                ) : (
                  <div className={styles.workCategoryButtons}>
                    {repairInstallers.map((installer) => {
                      const isSelected = (form.selectedRepairInstallerIds ?? []).includes(
                        installer.id
                      );
                      const isActive = activeRepairInstallerId === installer.id;
                      const assignedCount = installerAssignedCounts.get(installer.id) ?? 0;
                      const isMarked = assignedCount > 0;
                      return (
                        <button
                          key={installer.id}
                          type="button"
                          className={`${styles.workCategoryButton} ${
                            isMarked ? styles.workCategoryButtonMarked : ''
                          } ${isActive ? styles.workCategoryButtonActive : ''}`}
                          onClick={() => activateOrToggleRepairInstaller(installer.id)}
                          title={
                            isSelected
                              ? isActive
                                ? 'Активный мастер (нажмите, чтобы убрать из договора)'
                                : 'Выбранный мастер (нажмите, чтобы сделать активным)'
                              : 'Нажмите, чтобы выбрать и сделать активным'
                          }
                        >
                          <span>
                            {installer.fullName} ({formatInstallerGradeShort(installer.grade)})
                          </span>
                          <span
                            className={`${styles.installerAssignedCountBadge} ${
                              assignedCount === 0 ? styles.installerAssignedCountBadgeZero : ''
                            }`}
                          >
                            {assignedCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {interactiveFinalEstimateSections.length === 0 ? (
                <p className={styles.estimateA4Empty}>Нет данных для назначения мастеров.</p>
              ) : (
                interactiveFinalEstimateSections.map((section) => (
                  <section
                    key={`interactive-section-${section.categoryName}`}
                    className={`${styles.estimateA4CategorySection} ${styles.interactiveEstimateCategorySection}`}
                  >
                    {(() => {
                      const sectionRowKeys = section.rooms.flatMap((room) =>
                        room.lines.map((line) => line.key)
                      );
                      const isSectionAssignedToActive =
                        Boolean(activeRepairInstallerId) &&
                        sectionRowKeys.length > 0 &&
                        sectionRowKeys.every(
                          (rowKey) =>
                            form.finalEstimateInstallerAssignments[rowKey]?.installerId ===
                            activeRepairInstallerId
                        );
                      return (
                        <div className={styles.interactiveEstimateCategoryHeader}>
                          <p
                            className={`${styles.estimateA4Meta} ${styles.interactiveEstimateCategoryMeta}`}
                          >
                            Категория работ: <strong>{section.categoryName}</strong>
                            ;&nbsp;&nbsp;&nbsp;&nbsp;Помещений: {section.rooms.length}
                          </p>
                          <button
                            type="button"
                            className={`${styles.secondaryBtn} ${styles.interactiveEstimateAssignBtn}`}
                            disabled={!activeRepairInstallerId}
                            onClick={() =>
                              assignInstallerToFinalEstimateRows(
                                sectionRowKeys,
                                activeRepairInstallerId
                              )
                            }
                          >
                            {isSectionAssignedToActive
                              ? 'Снять активного с категории'
                              : 'Назначить активного на категорию'}
                          </button>
                        </div>
                      );
                    })()}
                    {section.rooms.map((room, roomIndex) => (
                      <section
                        key={`interactive-room-${section.categoryName}-${room.name}-${roomIndex}`}
                        className={`${styles.estimateA4Room} ${styles.interactiveEstimateRoom}`}
                      >
                        <div
                          className={`${styles.estimateA4RoomHeader} ${styles.interactiveEstimateRoomHeader}`}
                        >
                          <span>
                            {roomIndex + 1}. {room.name}
                          </span>
                          <button
                            type="button"
                            className={`${styles.secondaryBtn} ${styles.interactiveEstimateAssignBtn}`}
                            disabled={!activeRepairInstallerId}
                            onClick={() =>
                              assignInstallerToFinalEstimateRows(
                                room.lines.map((line) => line.key),
                                activeRepairInstallerId
                              )
                            }
                          >
                            {Boolean(activeRepairInstallerId) &&
                            room.lines.length > 0 &&
                            room.lines.every(
                              (line) =>
                                form.finalEstimateInstallerAssignments[line.key]?.installerId ===
                                activeRepairInstallerId
                            )
                              ? 'Снять активного с помещения'
                              : 'Назначить активного на помещение'}
                          </button>
                        </div>
                        <table
                          className={`${styles.estimateA4Table} ${styles.interactiveEstimateTable}`}
                        >
                          <thead>
                            <tr>
                              <th>№</th>
                              <th>Работа</th>
                              <th>Кол-во</th>
                              <th className={styles.interactiveEstimateInstallerCol}>Мастер</th>
                            </tr>
                          </thead>
                          <tbody>
                            {room.lines.map((line, lineIndex) => (
                              <tr
                                key={line.key}
                                className={`${styles.interactiveEstimateRow} ${
                                  activeRepairInstallerId &&
                                  line.installerId &&
                                  line.installerId === activeRepairInstallerId
                                    ? styles.interactiveEstimateRowActiveInstaller
                                    : ''
                                }`}
                                onClick={() => {
                                  if (!activeRepairInstallerId) return;
                                  assignInstallerToFinalEstimateRow(
                                    line.key,
                                    activeRepairInstallerId
                                  );
                                }}
                                title={
                                  activeRepairInstallerId
                                    ? 'Нажмите, чтобы назначить активного мастера на позицию'
                                    : 'Сначала выберите активного мастера'
                                }
                              >
                                <td>{lineIndex + 1}</td>
                                <td>{line.workName}</td>
                                <td>{formatMoneyValue(line.quantity)}</td>
                                <td className={styles.interactiveEstimateInstallerCol}>
                                  {line.installerId ? (
                                    <div className={styles.interactiveAssignedInstaller}>
                                      <span>
                                        {selectedRepairInstallersById.get(line.installerId)
                                          ?.fullName ?? 'Назначен'}
                                      </span>
                                      <button
                                        type="button"
                                        className={`${styles.secondaryBtn} ${styles.interactiveAssignedInstallerClearBtn}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          assignInstallerToFinalEstimateRow(line.key, '');
                                        }}
                                      >
                                        Снять
                                      </button>
                                    </div>
                                  ) : (
                                    <span className={styles.hint}>Не назначен</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </section>
                    ))}
                  </section>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'finalEstimate' ? (
        <div className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact}`}>
          <div className={styles.formGrid}>
            <div className={styles.sectionCard}>
              <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>
                Итоговая смета
              </h3>
              <p className={styles.hint} style={{ marginTop: 0 }}>
                Итог формируется из основной сметы и всех доп. соглашений. Одинаковые работы в одном
                помещении суммируются, а работы из блока «Непроводимые ремонтно-отделочные работы»
                вычитаются по количеству и сумме. В строках таблицы — суммы без скидки по договору;
                скидка только в итогах ниже; по позициям со скидкой см. заказ-наряд.
              </p>
              <div className={styles.estimateA4Wrap}>
                <article
                  className={styles.estimateA4Sheet}
                  data-print-target="final-estimate-sheet"
                >
                  <p className={styles.estimateA4AppendixRef}>
                    Приложение №1 к договору № {estimateAppendixContractRef.num} от{' '}
                    {estimateAppendixContractRef.date}
                  </p>
                  {finalEstimateRooms.length === 0 ? (
                    <p className={styles.estimateA4Empty}>Нет данных для итоговой сметы.</p>
                  ) : (
                    <>
                      <h4 className={styles.estimateA4Title}>Итоговая смета работ</h4>
                      <p className={styles.estimateA4Meta}>
                        Помещений: {finalEstimateRooms.length}
                      </p>
                      {finalEstimateRooms.map((room, roomIndex) => (
                        <section
                          key={`final-estimate-room-${room.name}-${roomIndex}`}
                          className={styles.estimateA4Room}
                        >
                          <div className={styles.estimateA4RoomHeader}>
                            <span>
                              {roomIndex + 1}. {room.name}
                            </span>
                            <strong>{formatMoneyValue(room.total)} руб.</strong>
                          </div>
                          <table className={styles.estimateA4Table}>
                            <thead>
                              <tr>
                                <th>№</th>
                                <th>Наименование</th>
                                <th>Ед.</th>
                                <th>Кол-во</th>
                                <th>Цена</th>
                                <th>Сумма</th>
                              </tr>
                            </thead>
                            <tbody>
                              {room.lines.map((line, lineIndex) => (
                                <tr key={`${room.name}-${line.name}-${lineIndex}`}>
                                  <td>{lineIndex + 1}</td>
                                  <td>
                                    {line.name}
                                    {line.excludedQuantity > 0 ? (
                                      <div className={styles.estimateAttachedPresetMeta}>
                                        Вычет: {formatMoneyValue(line.excludedQuantity)} из{' '}
                                        {formatMoneyValue(line.includedQuantity)}
                                      </div>
                                    ) : null}
                                  </td>
                                  <td>{line.unit || '—'}</td>
                                  <td>{formatMoneyValue(line.quantity)}</td>
                                  <td>{formatMoneyValue(line.price)}</td>
                                  <td>{formatMoneyValue(line.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </section>
                      ))}
                      {contractDiscountPercentParsed > 0 ? (
                        <>
                          <p className={styles.estimateA4Total}>
                            Итого по итоговой смете (без скидки):{' '}
                            <strong>
                              {formatMoneyValue(finalEstimateSummary.totalAmount)} руб.
                            </strong>
                          </p>
                          <p className={styles.estimateA4DiscountMeta}>
                            Скидка по договору:{' '}
                            {String(contractDiscountPercentParsed).replace('.', ',')}%
                          </p>
                          <p className={styles.estimateA4Total}>
                            Итого со скидкой:{' '}
                            <strong>
                              {formatMoneyValue(finalEstimateTotalAfterDiscount)} руб.
                            </strong>
                          </p>
                        </>
                      ) : (
                        <p className={styles.estimateA4Total}>
                          Итого по итоговой смете:{' '}
                          <strong>{formatMoneyValue(finalEstimateSummary.totalAmount)} руб.</strong>
                        </p>
                      )}
                    </>
                  )}
                </article>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'finalWorkOrder' ? (
        <div className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact}`}>
          <div
            className={`${styles.formGrid} ${styles.workOrderParamsBar}`}
            style={{ gap: '2px 6px', display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap' }}
          >
            <h3 className={styles.sectionTitle} style={{ margin: '0 0 1px', fontSize: '0.78rem' }}>
              Параметры итогового заказ-наряда
            </h3>
            <div className={styles.field} style={{ gap: 1, minWidth: 240 }}>
              <label style={{ fontSize: '0.62rem' }}>Разряд (после налога и наценки)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  style={
                    form.workOrder.gradeIncreasePercent === 0
                      ? {
                          background: 'var(--admin-info-bg-soft)',
                          borderColor: 'var(--admin-info-border-soft)',
                          color: 'var(--admin-info-strong)',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                        }
                      : { padding: '3px 8px', fontSize: '0.72rem' }
                  }
                  onClick={() => updateWorkOrder('gradeIncreasePercent', 0)}
                >
                  4 разряд
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  style={
                    form.workOrder.gradeIncreasePercent === 5
                      ? {
                          background: 'var(--admin-warning-bg)',
                          borderColor: 'var(--admin-warning-strong)',
                          color: 'var(--admin-warning-text)',
                          fontWeight: 700,
                          boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.35)',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                        }
                      : { padding: '3px 8px', fontSize: '0.72rem' }
                  }
                  onClick={() => updateWorkOrder('gradeIncreasePercent', 5)}
                >
                  5 разряд
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  style={
                    form.workOrder.gradeIncreasePercent === 10
                      ? {
                          background: 'var(--admin-danger-bg)',
                          borderColor: 'var(--admin-danger-border-strong)',
                          color: 'var(--admin-danger-text)',
                          fontWeight: 700,
                          boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.35)',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                        }
                      : { padding: '3px 8px', fontSize: '0.72rem' }
                  }
                  onClick={() => updateWorkOrder('gradeIncreasePercent', 10)}
                >
                  6 разряд
                </button>
              </div>
            </div>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.sectionCard}>
              <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>
                Итоговый заказ-наряд
              </h3>
              <p className={styles.hint} style={{ marginTop: 0 }}>
                Формируется из итоговой сметы: включает все проводимые работы по основной смете и
                доп. соглашениям, с вычетом работ из блока «Непроводимые ремонтно-отделочные
                работы».
              </p>
              <div
                className={styles.tabBar}
                style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}
              >
                <button
                  type="button"
                  className={`${styles.tab} ${activeFinalWorkOrderDocId === 'common' ? styles.tabActive : ''}`}
                  onClick={() => setActiveFinalWorkOrderDocId('common')}
                >
                  Общий заказ-наряд
                </button>
                {perInstallerWorkOrders.map((doc) => (
                  <button
                    key={doc.installer.id}
                    type="button"
                    className={`${styles.tab} ${
                      activeFinalWorkOrderDocId === doc.installer.id ? styles.tabActive : ''
                    }`}
                    onClick={() => setActiveFinalWorkOrderDocId(doc.installer.id)}
                  >
                    {formatInstallerNameShort(doc.installer.fullName)} (
                    {formatInstallerGradeShort(doc.installer.grade)})
                  </button>
                ))}
              </div>
              <div className={styles.estimateA4Wrap}>
                <article className={styles.estimateA4Sheet} data-print-target="work-order-sheet">
                  <div className={styles.estimateA4Meta} style={{ marginBottom: 10 }}>
                    <p style={{ margin: '0 0 3px' }}>
                      <strong>Договор:</strong> № {estimateAppendixContractRef.num} от{' '}
                      {estimateAppendixContractRef.date}
                    </p>
                    <p style={{ margin: '0 0 3px' }}>
                      <strong>Адрес:</strong> {formMergedForTemplate.object.objectAddress || '—'}
                    </p>
                    <p style={{ margin: '0 0 3px' }}>
                      <strong>Заказчик:</strong> {formMergedForTemplate.customer.fullName || '—'}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>Телефон заказчика:</strong>{' '}
                      {formMergedForTemplate.customer.phone || '—'}
                    </p>
                  </div>
                  {finalWorkOrderComputed.rooms.length === 0 ? (
                    <p className={styles.estimateA4Empty}>Нет данных для итогового заказ-наряда.</p>
                  ) : activeInstallerWorkOrder ? (
                    <>
                      <h4 className={styles.estimateA4Title}>
                        Заказ-наряд мастера: {activeInstallerWorkOrder.installer.fullName} (
                        {formatInstallerGradeShort(activeInstallerWorkOrder.installer.grade)})
                      </h4>
                      {activeInstallerWorkOrder.categories.map((section) => (
                        <section
                          key={`installer-doc-category-${activeInstallerWorkOrder.installer.id}-${section.categoryName}`}
                          className={styles.estimateA4CategorySection}
                        >
                          <p className={styles.estimateA4Meta}>
                            Категория работ: <strong>{section.categoryName}</strong>
                          </p>
                          {section.rooms.map((room, roomIndex) => (
                            <section
                              key={`installer-doc-room-${activeInstallerWorkOrder.installer.id}-${section.categoryName}-${room.name}-${roomIndex}`}
                              className={styles.estimateA4Room}
                            >
                              <div className={styles.estimateA4RoomHeader}>
                                <span>
                                  {roomIndex + 1}. {room.name}
                                </span>
                                <strong>{formatMoneyValue(room.adjustedTotal)} руб.</strong>
                              </div>
                              <table className={styles.estimateA4Table}>
                                <thead>
                                  <tr>
                                    <th>№</th>
                                    <th>Вид работ</th>
                                    <th>Кол-во</th>
                                    {form.workOrder.showLineAmounts ? <th>Стоимость</th> : null}
                                  </tr>
                                </thead>
                                <tbody>
                                  {room.lines.map((line, lineIndex) => (
                                    <tr
                                      key={`${line.key}-installer-doc-${activeInstallerWorkOrder.installer.id}`}
                                    >
                                      <td>{lineIndex + 1}</td>
                                      <td>{line.workName}</td>
                                      <td>
                                        {formatMoneyValue(line.quantity)} {line.unit || ''}
                                      </td>
                                      {form.workOrder.showLineAmounts ? (
                                        <td>{formatMoneyValue(line.adjustedAmount)}</td>
                                      ) : null}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </section>
                          ))}
                        </section>
                      ))}
                      <p className={styles.estimateA4Total}>
                        Итого по мастеру:{' '}
                        <strong>{formatMoneyValue(activeInstallerWorkOrder.total)} руб.</strong>
                      </p>
                      {contractDiscountPercentParsed > 0 ? (
                        <p className={styles.estimateA4DiscountMeta}>
                          В столбце «Стоимость» — сумма по позиции со скидкой по договору{' '}
                          {String(contractDiscountPercentParsed).replace('.', ',')}% (скидка до
                          налога, наценки и надбавки по разряду). В сметах такие суммы по строкам не
                          выводятся.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <h4 className={styles.estimateA4Title}>Итоговый заказ-наряд</h4>
                      {finalWorkOrderCategorySections.map((section) => (
                        <section
                          key={`final-work-order-category-${section.categoryName}`}
                          className={styles.estimateA4CategorySection}
                        >
                          <p className={styles.estimateA4Meta}>
                            Категория работ: <strong>{section.categoryName}</strong>
                          </p>
                          {section.rooms.map((room, roomIndex) => (
                            <section
                              key={`final-work-order-room-${section.categoryName}-${room.name}-${roomIndex}`}
                              className={styles.estimateA4Room}
                            >
                              <div className={styles.estimateA4RoomHeader}>
                                <span>
                                  {roomIndex + 1}. {room.name}
                                </span>
                                <strong>{formatMoneyValue(room.adjustedTotal)} руб.</strong>
                              </div>
                              <table className={styles.estimateA4Table}>
                                <thead>
                                  <tr>
                                    <th>№</th>
                                    <th>Вид работ</th>
                                    <th>Кол-во</th>
                                    {form.workOrder.showLineAmounts ? <th>Стоимость</th> : null}
                                  </tr>
                                </thead>
                                <tbody>
                                  {room.lines.map((line, lineIndex) => (
                                    <tr key={`${room.name}-${line.workName}-wo-${lineIndex}`}>
                                      <td>{lineIndex + 1}</td>
                                      <td>{line.workName}</td>
                                      <td>
                                        {formatMoneyValue(line.quantity)} {line.unit || ''}
                                      </td>
                                      {form.workOrder.showLineAmounts ? (
                                        <td>{formatMoneyValue(line.adjustedAmount)}</td>
                                      ) : null}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </section>
                          ))}
                        </section>
                      ))}
                      <p className={styles.estimateA4Total}>
                        Итого по итоговому заказ-наряду:{' '}
                        <strong>{formatMoneyValue(finalWorkOrderComputed.total)} руб.</strong>
                      </p>
                      {contractDiscountPercentParsed > 0 ? (
                        <p className={styles.estimateA4DiscountMeta}>
                          В столбце «Стоимость» — сумма по позиции со скидкой по договору{' '}
                          {String(contractDiscountPercentParsed).replace('.', ',')}% (скидка до
                          налога, наценки и надбавки по разряду). В сметах такие суммы по строкам не
                          выводятся.
                        </p>
                      ) : null}
                      {finalWorkOrderComputed.installerTotals.length > 0 ? (
                        <section className={styles.estimateA4Room}>
                          <div className={styles.estimateA4RoomHeader}>
                            <span>Итоги по мастерам</span>
                          </div>
                          <div className={styles.estimateA4Meta}>
                            {finalWorkOrderComputed.installerTotals.map((row) => (
                              <p key={row.installer.id} style={{ margin: '0 0 4px' }}>
                                {formatInstallerNameShort(row.installer.fullName)} (
                                {formatInstallerGradeShort(row.installer.grade)}, {row.lineCount}
                                шт.) - {formatMoneyRubShort(row.total)}руб.
                              </p>
                            ))}
                          </div>
                        </section>
                      ) : null}
                    </>
                  )}
                </article>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'workOrder' || isRepairWorkOrderAddendumTab(activeTab) ? (
        <div className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact}`}>
          <div
            className={`${styles.formGrid} ${styles.workOrderParamsBar}`}
            style={{ gap: '2px 6px', display: 'flex', alignItems: 'flex-end', flexWrap: 'nowrap' }}
          >
            <h3 className={styles.sectionTitle} style={{ margin: '0 0 1px', fontSize: '0.78rem' }}>
              {isRepairWorkOrderAddendumTab(activeTab)
                ? 'Параметры заказ-наряда к Д/с'
                : 'Параметры заказ-наряда'}
            </h3>
            <div className={styles.field} style={{ gap: 1, minWidth: 240 }}>
              <label style={{ fontSize: '0.62rem' }}>Разряд (после налога и наценки)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  style={
                    form.workOrder.gradeIncreasePercent === 0
                      ? {
                          background: 'var(--admin-info-bg-soft)',
                          borderColor: 'var(--admin-info-border-soft)',
                          color: 'var(--admin-info-strong)',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                        }
                      : { padding: '3px 8px', fontSize: '0.72rem' }
                  }
                  onClick={() => updateWorkOrder('gradeIncreasePercent', 0)}
                >
                  4 разряд
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  style={
                    form.workOrder.gradeIncreasePercent === 5
                      ? {
                          background: 'var(--admin-warning-bg)',
                          borderColor: 'var(--admin-warning-strong)',
                          color: 'var(--admin-warning-text)',
                          fontWeight: 700,
                          boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.35)',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                        }
                      : { padding: '3px 8px', fontSize: '0.72rem' }
                  }
                  onClick={() => updateWorkOrder('gradeIncreasePercent', 5)}
                >
                  5 разряд
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  style={
                    form.workOrder.gradeIncreasePercent === 10
                      ? {
                          background: 'var(--admin-danger-bg)',
                          borderColor: 'var(--admin-danger-border-strong)',
                          color: 'var(--admin-danger-text)',
                          fontWeight: 700,
                          boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.35)',
                          padding: '3px 8px',
                          fontSize: '0.72rem',
                        }
                      : { padding: '3px 8px', fontSize: '0.72rem' }
                  }
                  onClick={() => updateWorkOrder('gradeIncreasePercent', 10)}
                >
                  6 разряд
                </button>
              </div>
            </div>
            <label
              className={styles.managerQuestionnaireNeedRow}
              htmlFor="repair_work_order_show_amounts"
              style={{ margin: 0, fontSize: '0.74rem', whiteSpace: 'nowrap' }}
            >
              <input
                id="repair_work_order_show_amounts"
                type="checkbox"
                checked={form.workOrder.showLineAmounts}
                onChange={(e) => updateWorkOrder('showLineAmounts', e.target.checked)}
              />
              <span>Показывать стоимость в каждой позиции</span>
            </label>
          </div>
          <div className={styles.estimateA4Wrap}>
            <article className={styles.estimateA4Sheet}>
              <div
                className={styles.contractA4Preview}
                dangerouslySetInnerHTML={{ __html: renderedDoc }}
              />
            </article>
          </div>
        </div>
      ) : activeTab === 'questionnaire1' ? (
        <div className={`${styles.blockData} ${styles.dataCompact}`}>
          <RepairManagerQuestionnaire1Tab
            form={form}
            onPatch={patchManagerQuestionnaire1}
            onToggleTrafficSource={toggleManagerQuestionnaire1Traffic}
            onToggleWhyChosen={toggleManagerQuestionnaire1WhyChosen}
            onToggleClientNeed={toggleManagerQuestionnaire1Need}
          />
          <div className={styles.estimateA4Wrap}>
            <article className={styles.estimateA4Sheet}>
              <div
                className={styles.contractA4Preview}
                dangerouslySetInnerHTML={{ __html: renderedDoc }}
              />
            </article>
          </div>
        </div>
      ) : activeTab === 'questionnaire2' ? (
        <div className={`${styles.blockData} ${styles.dataCompact}`}>
          <RepairPostWorkQuestionnaire2Tab form={form} onPatch={patchPostWorkQuestionnaire2} />
          <div className={styles.estimateA4Wrap}>
            <article className={styles.estimateA4Sheet}>
              <div
                className={styles.contractA4Preview}
                dangerouslySetInnerHTML={{ __html: renderedDoc }}
              />
            </article>
          </div>
        </div>
      ) : (
        <>
          {activeAddendumSlot !== null ? (
            contractAndEstimateLocked ? (
              <RepairAddendumEstimateBlock
                slotOrdinal={activeAddendumSlot}
                slot={form.addendumSlots[activeAddendumSlot - 1]}
                documentDate={form.addendumDocumentDates[activeAddendumSlot - 1] ?? ''}
                onDocumentDateChange={(v) => patchAddendumDocumentDate(activeAddendumSlot - 1, v)}
                estimatePresets={estimatePresets}
                contractEstimateObjectLabel={
                  contractEstimateObjectKey
                    ? contractEstimateObjectKey === '__ungrouped__'
                      ? 'Вне объекта'
                      : (estimateGroups.find((g) => g.id === contractEstimateObjectKey)?.title ??
                        contractEstimateObjectKey)
                    : ''
                }
                addendumAttachablePresets={attachableAddendumEstimatePresets}
                addendumExcludedAttachablePresets={attachableAddendumExcludedEstimatePresets}
                presetToAttach={addendumPresetToAttach}
                setPresetToAttach={setAddendumPresetToAttach}
                excludedPresetToAttach={addendumExcludedPresetToAttach}
                setExcludedPresetToAttach={setAddendumExcludedPresetToAttach}
                onAttachPreset={() => {
                  if (!addendumPresetToAttach || activeAddendumSlot === null) return;
                  const idx = activeAddendumSlot - 1;
                  const pid = addendumPresetToAttach;
                  setForm((p) => {
                    const next = applyEstimatePresetIdsToAddendumSlot(
                      p,
                      idx,
                      [...(p.addendumSlots[idx].selectedPresetIds ?? []), pid],
                      estimatePresets,
                      estimateGroups,
                      'additional'
                    );
                    formRef.current = next;
                    schedulePersistRepairPackageDebounced();
                    return next;
                  });
                  setDirty(true);
                  setAddendumPresetToAttach('');
                }}
                onAttachExcludedPreset={() => {
                  if (!addendumExcludedPresetToAttach || activeAddendumSlot === null) return;
                  const idx = activeAddendumSlot - 1;
                  const pid = addendumExcludedPresetToAttach;
                  setForm((p) => {
                    const next = applyEstimatePresetIdsToAddendumSlot(
                      p,
                      idx,
                      [...(p.addendumSlots[idx].excludedSelectedPresetIds ?? []), pid],
                      estimatePresets,
                      estimateGroups,
                      'excluded'
                    );
                    formRef.current = next;
                    schedulePersistRepairPackageDebounced();
                    return next;
                  });
                  setDirty(true);
                  setAddendumExcludedPresetToAttach('');
                }}
                onRemovePreset={(presetId) => {
                  if (activeAddendumSlot === null) return;
                  const idx = activeAddendumSlot - 1;
                  setForm((p) => {
                    const next = applyEstimatePresetIdsToAddendumSlot(
                      p,
                      idx,
                      (p.addendumSlots[idx].selectedPresetIds ?? []).filter(
                        (id) => id !== presetId
                      ),
                      estimatePresets,
                      estimateGroups,
                      'additional'
                    );
                    formRef.current = next;
                    schedulePersistRepairPackageDebounced();
                    return next;
                  });
                  setDirty(true);
                }}
                onRemoveExcludedPreset={(presetId) => {
                  if (activeAddendumSlot === null) return;
                  const idx = activeAddendumSlot - 1;
                  setForm((p) => {
                    const next = applyEstimatePresetIdsToAddendumSlot(
                      p,
                      idx,
                      (p.addendumSlots[idx].excludedSelectedPresetIds ?? []).filter(
                        (id) => id !== presetId
                      ),
                      estimatePresets,
                      estimateGroups,
                      'excluded'
                    );
                    formRef.current = next;
                    schedulePersistRepairPackageDebounced();
                    return next;
                  });
                  setDirty(true);
                }}
                onReorderPresets={(sourceId, targetId) => {
                  if (activeAddendumSlot === null) return;
                  const idx = activeAddendumSlot - 1;
                  setForm((p) => {
                    const ids = [...(p.addendumSlots[idx].selectedPresetIds ?? [])];
                    const from = ids.indexOf(sourceId);
                    const to = ids.indexOf(targetId);
                    if (from < 0 || to < 0) return p;
                    const [moved] = ids.splice(from, 1);
                    ids.splice(to, 0, moved);
                    const next = applyEstimatePresetIdsToAddendumSlot(
                      p,
                      idx,
                      ids,
                      estimatePresets,
                      estimateGroups,
                      'additional'
                    );
                    formRef.current = next;
                    schedulePersistRepairPackageDebounced();
                    return next;
                  });
                  setDirty(true);
                }}
                onReorderExcludedPresets={(sourceId, targetId) => {
                  if (activeAddendumSlot === null) return;
                  const idx = activeAddendumSlot - 1;
                  setForm((p) => {
                    const ids = [...(p.addendumSlots[idx].excludedSelectedPresetIds ?? [])];
                    const from = ids.indexOf(sourceId);
                    const to = ids.indexOf(targetId);
                    if (from < 0 || to < 0) return p;
                    const [moved] = ids.splice(from, 1);
                    ids.splice(to, 0, moved);
                    const next = applyEstimatePresetIdsToAddendumSlot(
                      p,
                      idx,
                      ids,
                      estimatePresets,
                      estimateGroups,
                      'excluded'
                    );
                    formRef.current = next;
                    schedulePersistRepairPackageDebounced();
                    return next;
                  });
                  setDirty(true);
                }}
                estimateUsageById={estimateUsageById}
                draggingPresetId={draggingAddendumEstimatePresetId}
                setDraggingPresetId={setDraggingAddendumEstimatePresetId}
                draggingExcludedPresetId={draggingAddendumExcludedEstimatePresetId}
                setDraggingExcludedPresetId={setDraggingAddendumExcludedEstimatePresetId}
                onMarkSigned={() => markAddendumSlotSigned(activeAddendumSlot - 1)}
                onMarkPaid={() => markAddendumSlotPaid(activeAddendumSlot - 1)}
                canUnmarkSigned={isWithinMsSinceIso(
                  form.addendumSlots[activeAddendumSlot - 1]?.signedAt,
                  CONTRACT_SIGNED_REVERT_WINDOW_MS
                )}
                onUnmarkSigned={() => unmarkAddendumSlotSigned(activeAddendumSlot - 1)}
                canUnmarkPaid={isWithinRevertWindow(
                  form.addendumSlots[activeAddendumSlot - 1]?.paidAt
                )}
                onUnmarkPaid={() => unmarkAddendumSlotPaid(activeAddendumSlot - 1)}
              />
            ) : (
              <div className={`${styles.field} ${styles.repairAddendumDateFieldRow}`}>
                <label htmlFor={`repair_addendum_date_${activeAddendumSlot}`}>
                  Дата доп. соглашения (в шапке слева; полный ввод расчётов — после статуса «Договор
                  подписан»)
                </label>
                <input
                  id={`repair_addendum_date_${activeAddendumSlot}`}
                  type="text"
                  value={form.addendumDocumentDates[activeAddendumSlot - 1] ?? ''}
                  onChange={(e) =>
                    patchAddendumDocumentDate(activeAddendumSlot - 1, e.target.value)
                  }
                  placeholder="напр. 04.05.2026"
                  autoComplete="off"
                />
              </div>
            )
          ) : null}
          {activeTab === 'contract' && contractAndEstimateLocked ? (
            <p className={`${styles.hint} ${styles.contractLockNotice}`}>
              Договор подписан: текст договора на этой вкладке только для просмотра и печати.
            </p>
          ) : null}
          {activeTab === 'contract' ||
          isRepairActTwinOneSheetTab(activeTab) ||
          activeTab === 'cashOrder' ||
          activeTab === 'productionLog' ||
          isRepairAddendumTab(activeTab) ||
          isRepairWorkOrderAddendumTab(activeTab) ? (
            <div className={styles.estimateA4Wrap}>
              {isRepairActTwinOneSheetTab(activeTab) ? (
                <article
                  className={`${styles.estimateA4Sheet} ${styles.repairActTwinSheet}`}
                  aria-label="Два экземпляра акта на одном листе"
                >
                  <div
                    className={styles.contractA4Preview}
                    dangerouslySetInnerHTML={{
                      __html: wrapRepairActTwinCopiesOnOnePageHtml(renderedDoc),
                    }}
                  />
                </article>
              ) : (
                <article className={styles.estimateA4Sheet}>
                  <div
                    className={styles.contractA4Preview}
                    dangerouslySetInnerHTML={{ __html: renderedDoc }}
                  />
                </article>
              )}
            </div>
          ) : (
            <div className={styles.docPane}>
              <div dangerouslySetInnerHTML={{ __html: renderedDoc }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
