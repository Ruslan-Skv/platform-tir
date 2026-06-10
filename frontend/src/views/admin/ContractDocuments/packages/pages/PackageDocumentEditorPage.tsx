'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  type ContractDocumentPackageKind,
  type ContractDocumentPackageStatus,
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  type ContractTemplatePreset,
  type ExecutorRequisiteProfile,
  getContractDocumentEstimatePresets,
  getContractDocumentExecutorProfiles,
  getContractDocumentPackage,
  getContractDocumentPackages,
  getContractDocumentRepairSettings,
  getContractDocumentSignatoryProfiles,
  getContractDocumentTemplatePresets,
  getContractDocumentWindowsSettings,
  updateContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmCustomerDetail, InstallerMaster } from '@/shared/api/admin-crm';
import { getInstallers } from '@/shared/api/admin-crm';
import { listPackagePaymentInvoices } from '@/shared/api/admin-payment-invoices';
import { Modal } from '@/shared/ui/Modal';
import { normalizeExecutorRequisiteProfile } from '@/views/admin/ContractDocuments/packages/directions/repair/form/repairExecutorBankFields';

import { amountToRussianWords } from '../../shared/amountToRussianWords';
import { applyTemplate } from '../../shared/applyTemplate';
import { contractDateToDdMmYyyy, todayContractDateDdMmYyyy } from '../../shared/contractDateFormat';
import { pickPrintMarginFooterNames, printDocumentHtml } from '../../shared/printDocument';
import { prepareContractTemplateHtmlForPreview } from '../../shared/typography/contractTemplateTypography';
import cdBase from '../../styles/base.module.css';
import cdDataTab from '../../styles/data-tab.module.css';
import cdDocPreview from '../../styles/documents-preview.module.css';
import cdChrome from '../../styles/editor-chrome.module.css';
import cdEstimateTab from '../../styles/estimate-tab.module.css';
import cdWorkspace from '../../styles/estimates-workspace.module.css';
import cdTemplates from '../../styles/templates-library.module.css';
import { packageKindUiLabel } from '../config';
import { isProductDirectionPackageKind } from '../config/productDirectionPackageKind';
import {
  isRepairActA4PreviewTab,
  isRepairActTwinOneSheetTab,
  isRepairPlainCustomerTab,
  wrapRepairActTwinCopiesOnOnePageHtml,
} from '../directions/repair/documents/repairActTwinCopiesOnOnePageHtml';
import {
  REPAIR_DOCUMENT_TAB_IDS,
  REPAIR_DOCUMENT_TAB_LABELS,
  REPAIR_DOCUMENT_TAB_LABELS_SHORT,
  type RepairDocumentTabId,
  isRepairAddendumTab,
  isRepairAddendumTabVisible,
  isRepairWorkOrderAddendumTab,
  normalizeLegacyRepairTabId,
  repairDocumentTemplateFallbackHtml,
} from '../directions/repair/documents/repairDocumentTemplates';
import {
  isRepairLibraryTemplateTabId,
  repairLibraryTemplateTabIdFromPreset,
} from '../directions/repair/documents/repairLibraryTemplateTabs';
import { repairTemplatePresetEditorTabId } from '../directions/repair/documents/repairTemplatePresetTab';
import { RepairFinalEstimateTab } from '../directions/repair/estimates/RepairFinalEstimateTab';
import { estimatePresetsCatalogKind } from '../directions/repair/estimates/estimatePresetsCatalogKind';
import {
  applyEstimatePresetIdsToRepairForm,
  getContractEstimateObjectGroupKey,
  isContractEstimatePresetAttachable,
  isEstimatePresetForLinkedContractCustomer,
} from '../directions/repair/estimates/repairApplyEstimatePresetIds';
import {
  applyRepairContractDiscountToAmount,
  applyRepairContractDiscountToNullableBase,
  parseRepairContractDiscountPercent,
  repairContractDiscountMoneyFactor,
  repairEstimateTotalToContractFields,
} from '../directions/repair/estimates/repairContractDiscount';
import { repairDiscountFieldHelp } from '../directions/repair/estimates/repairDiscountFieldHelp';
import {
  buildEstimateSectionsFromPresetIds,
  buildEstimateSheetPrintHtml,
} from '../directions/repair/estimates/repairEstimateDocPrintEmbedHtml';
import {
  getDisplayContractDate,
  getDisplayContractNumber,
  getRepairContractNumberDisplayForForm,
} from '../directions/repair/form/packageContractDisplay';
import { repairContractDateFieldHelp } from '../directions/repair/form/repairContractDateFieldHelp';
import {
  DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS,
  resolveRepairWorkPeriodForForm,
} from '../directions/repair/form/repairContractWorkPeriod';
import { repairWorkPeriodFieldHelp } from '../directions/repair/form/repairWorkPeriodFieldHelp';
import {
  type RepairDocumentTemplateTabId,
  buildPersistedFormData,
  mergeFormDataFromStorage,
} from '../directions/repair/formDataTemplateStorage';
import { computeRepairPackagePayableBreakdown } from '../directions/repair/payments/repairPackagePaymentTotals';
import {
  clearRepairFormCrmCustomerFields,
  mergeRepairFormFromCrmCustomerDetail,
} from '../directions/repair/questionnaires/applyCrmContractToForm';
import {
  hydrateManagerQuestionnaire1FromLinkedCrmCustomer,
  parseLinkedCrmCustomerIdFromFormData,
  persistManagerQuestionnaire1ToCrmCustomer,
} from '../directions/repair/questionnaires/crmManagerQuestionnaire1';
import { buildManagerQuestionnaire1PrintHtml } from '../directions/repair/questionnaires/managerQuestionnaire1Print';
import { buildPostWorkQuestionnaire2PrintHtml } from '../directions/repair/questionnaires/postWorkQuestionnaire2Print';
import {
  type RepairQuestionnaireHubTabId,
  isRepairQuestionnaireHubTabHiddenFromPackageEditor,
} from '../directions/repair/questionnaires/repairQuestionnaireHubTabs';
import {
  type RepairManagerQuestionnaire1Block,
  type RepairPackageFormData,
  type RepairPostWorkQuestionnaire2Block,
  applyOpenAddendumDocumentDateAutofill,
  isRepairAddendumSlotRemovable,
  mergeRepairPackageFormData,
  repairPackageFormForTemplate,
} from '../directions/repair/repairPackageForm';
import {
  type RepairWorkOrderHubTabId,
  isRepairWorkOrderHubTabHiddenFromPackageEditor,
} from '../directions/repair/workOrders/repairWorkOrderHubTabs';
import {
  WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS,
  pickWindowsPackagePrintDocumentOptions,
  printWindowsEstimateSheetFromDom,
  printWindowsEstimateSheetHtml,
  resolveRepairEditorPrintOptions,
  shouldUseWindowsPackageCompactPrint,
} from '../directions/windows/repairWindowsPackagePrint';
import {
  DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
  normalizeWindowsWorkOrderMarkupPercent,
} from '../directions/windows/repairWindowsWorkOrder';
import {
  computeWindowsContractCostBreakdown,
  windowsContractTotalToContractFields,
} from '../directions/windows/windowsContractCostBreakdown';
import {
  packageContractSettingsKind,
  packageExecutorProfilesKind,
  packageSignatoryProfilesKind,
} from '../shared/catalogKinds';
import {
  PACKAGE_TEMPLATE_TAB_IDS,
  PackageAddendumEditorPane,
  type PackageContractObjectBlockFieldId,
  PackageDataTab,
  PackageDocumentEditorHeader,
  PackageDocumentEditorTabBar,
  PackageEstimateSignaturesBlock,
  PackageEstimateTab,
  PackageTemplateEditorPane,
  ProductSpecificationTab,
  calcPackageSectionCompletionPercent,
  formatContractConcludedDateForHeader,
  formatPackageMoneyValue,
  normalizePackageTemplateTabId,
  snapshotPackageContractObjectBlockFields,
} from '../shared/editor';
import {
  usePackageAddendumEditor,
  usePackageDocumentLoad,
  usePackageDocumentPersist,
  usePackageDocumentVersions,
  usePackageRenderedDocument,
} from '../shared/hooks';
import { RepairContractInvoicesModal } from '../shared/hub/RepairContractInvoicesModal';
import { RepairContractPackageEventsJournalModal } from '../shared/hub/RepairContractPackageEventsJournalModal';
import { RepairContractPackageHubModal } from '../shared/hub/RepairContractPackageHubModal';
import { RepairContractQuestionnairesHubModal } from '../shared/hub/RepairContractQuestionnairesHubModal';
import {
  type RepairContractWorkOrderHubContextValue,
  RepairContractWorkOrderHubProvider,
} from '../shared/hub/RepairContractWorkOrderHubContext';
import { RepairContractWorkOrdersHubModal } from '../shared/hub/RepairContractWorkOrdersHubModal';
import { REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE } from '../shared/hub/repairContractPackageHubConstants';
import {
  getSignedAddendumOrdinals,
  getUnsignedAddendumOrdinals,
} from '../shared/hub/repairContractPipeline';
import {
  packageEditorTabLabel,
  resolvePackageEditorVisibleTabs,
  usePackageEditorTabOrder,
} from '../shared/tabs';
import { libraryTemplateFallbackHtml } from '../templates';

/** Класс на `document.body` при печати сметы — см. `@media print` в styles/base.module.css */
const BODY_PRINT_ESTIMATE_CLASS = 'body-print-estimate-sheet';

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

const formatMoneyValue = formatPackageMoneyValue;

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

const RepairEstimateSignaturesBlock = PackageEstimateSignaturesBlock;

export interface PackageDocumentEditorPageProps {
  packageId: string;
  /** Только модалка «Заказ-наряды» (вызов из списка договоров). */
  workOrdersHubListSurface?: boolean;
  onWorkOrdersHubListClose?: () => void;
  onWorkOrdersHubListUpdated?: () => void;
}

/** Реквизиты исполнителя из справочника «Исполнители» (блок формы без карточки менеджера). */
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
  | 'bankName'
  | 'bankBik'
  | 'bankCorrAccount'
  | 'bankSettlementAccount'
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
    bankName: profile.bankName ?? '',
    bankBik: profile.bankBik ?? '',
    bankCorrAccount: profile.bankCorrAccount ?? '',
    bankSettlementAccount: profile.bankSettlementAccount ?? '',
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
    bankName: '',
    bankBik: '',
    bankCorrAccount: '',
    bankSettlementAccount: '',
    email: '',
  };
}

/** Поля менеджера из справочника «Менеджеры». */
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

export function PackageDocumentEditorPage({
  packageId,
  workOrdersHubListSurface = false,
  onWorkOrdersHubListClose,
  onWorkOrdersHubListUpdated,
}: PackageDocumentEditorPageProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [packageKind, setPackageKind] = useState<ContractDocumentPackageKind>('REPAIR');
  const [windowsWorkOrderMarkupPercent, setWindowsWorkOrderMarkupPercent] = useState(
    DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT
  );
  const [activeTab, setActiveTab] = useState<RepairDocumentTabId>('data');
  const [packageHubOpen, setPackageHubOpen] = useState(false);
  const [invoicesHubOpen, setInvoicesHubOpen] = useState(false);
  const [paymentInvoiceCount, setPaymentInvoiceCount] = useState(0);
  const [workOrdersHubOpen, setWorkOrdersHubOpen] = useState(workOrdersHubListSurface);
  const [workOrdersHubPanelTab, setWorkOrdersHubPanelTab] =
    useState<RepairWorkOrderHubTabId>('workOrder');
  const [questionnairesHubOpen, setQuestionnairesHubOpen] = useState(false);
  const [questionnairesHubPanelTab, setQuestionnairesHubPanelTab] =
    useState<RepairQuestionnaireHubTabId>('questionnaire1');
  const [activeFinalWorkOrderDocId, setActiveFinalWorkOrderDocId] = useState<string>('common');
  const activeAddendumSlot = useMemo(() => {
    const m = /^addendum([1-5])$/.exec(activeTab);
    return m ? Number(m[1]) : null;
  }, [activeTab]);

  const {
    tabOrder: repairTabOrder,
    handleTabDragStart: handleRepairTabDragStart,
    handleTabDragOver: handleRepairTabDragOver,
    handleTabDrop: handleRepairTabDrop,
    handleTabActivate: handleRepairTabActivateInner,
  } = usePackageEditorTabOrder();
  const [draftTitle, setDraftTitle] = useState('');
  const [form, setForm] = useState<RepairPackageFormData>(() => mergeRepairPackageFormData({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isProductDirectionPackage = isProductDirectionPackageKind(packageKind);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const [linkedCrmCustomerId, setLinkedCrmCustomerId] = useState<string | null>(null);
  const linkedCrmCustomerIdRef = useRef<string | null>(null);
  linkedCrmCustomerIdRef.current = linkedCrmCustomerId;
  const mq1CrmSyncDebounceRef = useRef<number | null>(null);
  const [templateOverrides, setTemplateOverrides] = useState<
    Partial<Record<RepairDocumentTemplateTabId, string>>
  >({});
  const [excelMessage, setExcelMessage] = useState<string | null>(null);
  const estimatePrintSheetRef = useRef<HTMLElement | null>(null);
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
  const [customerDataSectionExpanded, setCustomerDataSectionExpanded] = useState(false);
  const [packageFlowStatus, setPackageFlowStatus] =
    useState<ContractDocumentPackageStatus>('IN_PROGRESS');
  const packageFlowStatusRef = useRef<ContractDocumentPackageStatus>('IN_PROGRESS');
  packageFlowStatusRef.current = packageFlowStatus;
  /** После «Договор подписан» или «Отказ» вкладки «Договор» и «Смета» только для просмотра. */
  const contractAndEstimateLocked =
    packageFlowStatus === 'CONTRACT_CONCLUDED' || packageFlowStatus === 'REFUSED';
  /** После подписания договора с вкладки «Оплаты» можно править только эти поля `contract.*`. */
  const REPAIR_CONTRACT_FIELDS_EDITABLE_WHEN_SIGNED = new Set<string>([
    'prepaymentAmount',
    'prepaymentAmountWords',
    'paymentBasis',
    'prepaymentDate',
    'paymentFormLabel',
    'totalAmountWords',
  ]);
  const {
    packageVersions,
    setPackageVersions,
    versionsBusy,
    isVersionsHistoryOpen,
    setIsVersionsHistoryOpen,
    isVersionsHistoryOpenRef,
    refreshPackageVersions,
    refreshPackageVersionsRef,
  } = usePackageDocumentVersions(packageId);
  const [executorDataSectionExpanded, setExecutorDataSectionExpanded] = useState(false);
  const [managerDataSectionExpanded, setManagerDataSectionExpanded] = useState(false);
  const [contractObjectBlockBaseline, setContractObjectBlockBaseline] = useState<Record<
    PackageContractObjectBlockFieldId,
    string
  > | null>(null);

  const contractObjectBlockEditedFlags = useMemo(() => {
    if (!contractObjectBlockBaseline || contractAndEstimateLocked) {
      return {} as Partial<Record<PackageContractObjectBlockFieldId, boolean>>;
    }
    const current = snapshotPackageContractObjectBlockFields(form);
    const flags: Partial<Record<PackageContractObjectBlockFieldId, boolean>> = {};
    for (const fieldId of Object.keys(
      contractObjectBlockBaseline
    ) as PackageContractObjectBlockFieldId[]) {
      flags[fieldId] = contractObjectBlockBaseline[fieldId] !== current[fieldId];
    }
    return flags;
  }, [form, contractObjectBlockBaseline, contractAndEstimateLocked]);

  const contractObjectBlockFieldClassName = useCallback(
    (fieldId: PackageContractObjectBlockFieldId): string | undefined => {
      if (contractAndEstimateLocked) {
        return `${cdBase.autoFilledInput} ${cdDataTab.autoFilledInput} ${cdEstimateTab.autoFilledInput}`;
      }
      if (contractObjectBlockEditedFlags[fieldId]) {
        return `${cdBase.repairContractObjectFieldEdited} ${cdDataTab.repairContractObjectFieldEdited} ${cdEstimateTab.repairContractObjectFieldEdited}`;
      }
      return undefined;
    },
    [contractAndEstimateLocked, contractObjectBlockEditedFlags]
  );

  /** Актуальная форма для отложенного сохранения (после setState ref обновится на следующем рендере). */
  const formRef = useRef(form);
  formRef.current = form;
  const templateOverridesRef = useRef(templateOverrides);
  templateOverridesRef.current = templateOverrides;
  const selectedTemplateIdsRef = useRef(selectedTemplateIds);
  selectedTemplateIdsRef.current = selectedTemplateIds;
  const draftTitleRef = useRef(draftTitle);
  draftTitleRef.current = draftTitle;

  const buildEditorPersistedFormData = useCallback((nextForm: RepairPackageFormData) => {
    return buildPersistedFormData(
      nextForm,
      templateOverridesRef.current,
      selectedTemplateIdsRef.current,
      { linkedCrmCustomerId: linkedCrmCustomerIdRef.current }
    );
  }, []);

  const {
    flushPersistDebounced: flushPersistRepairPackageDebounced,
    schedulePersistDebounced: schedulePersistRepairPackageDebounced,
    touchPackageData,
  } = usePackageDocumentPersist({
    packageId,
    loading,
    packageFlowStatusRef,
    formRef,
    draftTitleRef,
    dirtyRef,
    buildPersistedFormData: buildEditorPersistedFormData,
    setForm,
    setDirty,
    setError,
    setRepairPackages,
    isVersionsHistoryOpenRef,
    refreshPackageVersionsRef,
  });

  const handleRepairTabActivate = useCallback(
    (id: RepairDocumentTabId) => handleRepairTabActivateInner(id, setActiveTab),
    [handleRepairTabActivateInner]
  );

  const scheduleManagerQuestionnaire1CrmSync = useCallback(
    (block: RepairManagerQuestionnaire1Block) => {
      const customerId = linkedCrmCustomerIdRef.current?.trim();
      if (!customerId) return;
      if (mq1CrmSyncDebounceRef.current !== null) {
        window.clearTimeout(mq1CrmSyncDebounceRef.current);
      }
      mq1CrmSyncDebounceRef.current = window.setTimeout(() => {
        mq1CrmSyncDebounceRef.current = null;
        void persistManagerQuestionnaire1ToCrmCustomer(customerId, block).catch((e) => {
          setError(
            e instanceof Error ? e.message : 'Не удалось сохранить анкету в карточке клиента'
          );
        });
      }, 400);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (mq1CrmSyncDebounceRef.current !== null) {
        window.clearTimeout(mq1CrmSyncDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const m = /^addendum(\d+)$/.exec(activeTab);
    if (!m) return;
    const n = Number(m[1]);
    if (!Number.isFinite(n) || n <= form.addendumSlotCount) return;
    setActiveTab(
      form.addendumSlotCount > 0
        ? (`addendum${form.addendumSlotCount}` as RepairDocumentTabId)
        : 'contract'
    );
  }, [activeTab, form.addendumSlotCount]);

  useEffect(() => {
    if ((activeTab as string) === 'cashOrder') setActiveTab('contract');
  }, [activeTab]);

  const templatePresetsByTab = useMemo(() => {
    const map = new Map<RepairDocumentTemplateTabId, ContractTemplatePreset[]>();
    for (const tab of PACKAGE_TEMPLATE_TAB_IDS) map.set(tab, []);
    for (const item of contractTemplatePresets) {
      if (item.archived) continue;
      const tab = repairTemplatePresetEditorTabId(item);
      if (!tab) continue;
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
      if (isRepairLibraryTemplateTabId(tab)) {
        return libraryTemplateFallbackHtml(packageKind, tab);
      }
      return repairDocumentTemplateFallbackHtml(packageKind, tab);
    },
    [templatePresetsByTab, selectedTemplateIds, packageKind]
  );

  const { load, refreshPackageFromServer } = usePackageDocumentLoad({
    packageId,
    formRef,
    refreshPackageVersions,
    flushPersistDebounced: flushPersistRepairPackageDebounced,
    setters: {
      setLoading,
      setPackageRefreshing,
      setError,
      setPackageVersions,
      setPackageKind,
      setWindowsWorkOrderMarkupPercent,
      setPaymentInvoiceCount,
      setDraftTitle,
      setPackageFlowStatus,
      setLinkedCrmCustomerId,
      setForm,
      setContractObjectBlockBaseline,
      setTemplateOverrides,
      setExecutorProfiles,
      setSignatoryProfiles,
      setEstimatePresets,
      setRepairInstallers,
      setEstimateGroups,
      setEstimateAttachGroupKey,
      setEstimatePresetToAttach,
      setRepairPackages,
      setContractTemplatePresets,
      setSelectedTemplateIds,
      setEditingTemplateId,
      setTemplateDraftTitle,
      setTemplateDraftHtml,
      setExcelMessage,
      setDirty,
    },
  });

  const getLiveFormForHub = useCallback(() => formRef.current, []);
  const getLivePersistOptionsForHub = useCallback(
    () => ({ linkedCrmCustomerId: linkedCrmCustomerIdRef.current }),
    []
  );

  const openPackageHub = useCallback(() => {
    setPackageHubOpen(true);
    void flushPersistRepairPackageDebounced().catch((e) => {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить данные пакета');
    });
  }, [flushPersistRepairPackageDebounced]);

  const handlePackageHubUpdated = useCallback(() => {
    void flushPersistRepairPackageDebounced()
      .then(() => load({ mode: 'refresh' }))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Не удалось обновить данные пакета');
      });
  }, [flushPersistRepairPackageDebounced, load]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Вкладка «Оплаты» перенесена в модалку — сбрасываем устаревший activeTab из localStorage. */
  useEffect(() => {
    if (activeTab === 'payments') setActiveTab('data');
  }, [activeTab]);

  /** Заказ-наряды и инт. смета — только в модалке «Заказ-наряды». */
  useEffect(() => {
    if (!isRepairWorkOrderHubTabHiddenFromPackageEditor(activeTab)) return;
    setActiveTab('estimate');
  }, [activeTab]);

  /** Анкеты — только в модалке «Анкеты». */
  useEffect(() => {
    if (!isRepairQuestionnaireHubTabHiddenFromPackageEditor(activeTab)) return;
    setActiveTab('contract');
  }, [activeTab]);

  /** Скрытые для направления вкладки (например specification vs finalEstimate). */
  useEffect(() => {
    const visible = resolvePackageEditorVisibleTabs({
      tabOrder: repairTabOrder,
      packageKind,
      addendumSlotCount: form.addendumSlotCount,
    });
    if (!visible.includes(activeTab)) setActiveTab('data');
  }, [activeTab, repairTabOrder, packageKind, form.addendumSlotCount]);

  useEffect(() => {
    if (isVersionsHistoryOpen && !loading) {
      void refreshPackageVersions({ skipSpinner: true });
    }
  }, [isVersionsHistoryOpen, loading, refreshPackageVersions]);

  useEffect(() => {
    if (!questionnairesHubOpen || !linkedCrmCustomerId) return;
    void (async () => {
      try {
        const hydrated = await hydrateManagerQuestionnaire1FromLinkedCrmCustomer(
          linkedCrmCustomerId,
          formRef.current
        );
        setForm((prev) => {
          if (
            JSON.stringify(prev.managerQuestionnaire1) ===
            JSON.stringify(hydrated.form.managerQuestionnaire1)
          ) {
            return prev;
          }
          const next = { ...prev, managerQuestionnaire1: hydrated.form.managerQuestionnaire1 };
          formRef.current = next;
          return next;
        });
      } catch {
        /* оставляем локальную копию */
      }
    })();
  }, [questionnairesHubOpen, linkedCrmCustomerId]);

  const handleRepairCrmCustomerApplied = useCallback(
    (detail: CrmCustomerDetail) => {
      if (contractAndEstimateLocked) return;
      const next = mergeRepairFormFromCrmCustomerDetail(detail, formRef.current);
      setLinkedCrmCustomerId(detail.id);
      setForm(next);
      formRef.current = next;
      touchPackageData();
    },
    [contractAndEstimateLocked, touchPackageData]
  );

  const handleRepairCrmCustomerClear = useCallback(() => {
    if (contractAndEstimateLocked) return;
    setLinkedCrmCustomerId(null);
    setForm((p) => clearRepairFormCrmCustomerFields(p));
    touchPackageData();
  }, [contractAndEstimateLocked, touchPackageData]);

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
  const addRepairInstallerToContract = useCallback(
    (installerId: string) => {
      toggleRepairInstallerForContract(installerId, true);
      setActiveRepairInstallerId(installerId);
    },
    [toggleRepairInstallerForContract]
  );
  const removeRepairInstallerFromContract = useCallback(
    (installerId: string) => {
      toggleRepairInstallerForContract(installerId, false);
    },
    [toggleRepairInstallerForContract]
  );
  const activateOrToggleRepairInstaller = useCallback(
    (installerId: string) => {
      const isSelected = (form.selectedRepairInstallerIds ?? []).includes(installerId);
      if (!isSelected) {
        addRepairInstallerToContract(installerId);
        return;
      }
      if (activeRepairInstallerId === installerId) {
        removeRepairInstallerFromContract(installerId);
        return;
      }
      setActiveRepairInstallerId(installerId);
    },
    [
      activeRepairInstallerId,
      form.selectedRepairInstallerIds,
      addRepairInstallerToContract,
      removeRepairInstallerFromContract,
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
      setForm((p) => {
        const nextBlock = { ...p.managerQuestionnaire1, ...patch };
        scheduleManagerQuestionnaire1CrmSync(nextBlock);
        const next = { ...p, managerQuestionnaire1: nextBlock };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [scheduleManagerQuestionnaire1CrmSync, touchPackageData]
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
        const nextBlock = { ...p.managerQuestionnaire1, clientNeedsCheckedIds: ids };
        scheduleManagerQuestionnaire1CrmSync(nextBlock);
        const next = { ...p, managerQuestionnaire1: nextBlock };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [scheduleManagerQuestionnaire1CrmSync, touchPackageData]
  );

  const toggleManagerQuestionnaire1Traffic = useCallback(
    (id: string) => {
      setForm((p) => {
        const ids = [...p.managerQuestionnaire1.trafficSourceCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        const nextBlock = { ...p.managerQuestionnaire1, trafficSourceCheckedIds: ids };
        scheduleManagerQuestionnaire1CrmSync(nextBlock);
        const next = { ...p, managerQuestionnaire1: nextBlock };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [scheduleManagerQuestionnaire1CrmSync, touchPackageData]
  );

  const toggleManagerQuestionnaire1WhyChosen = useCallback(
    (id: string) => {
      setForm((p) => {
        const ids = [...p.managerQuestionnaire1.whyChosenCheckedIds];
        const idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1);
        else ids.push(id);
        const nextBlock = { ...p.managerQuestionnaire1, whyChosenCheckedIds: ids };
        scheduleManagerQuestionnaire1CrmSync(nextBlock);
        const next = { ...p, managerQuestionnaire1: nextBlock };
        formRef.current = next;
        return next;
      });
      touchPackageData();
    },
    [scheduleManagerQuestionnaire1CrmSync, touchPackageData]
  );

  const updateContract = <K extends keyof RepairPackageFormData['contract']>(
    key: K,
    value: string
  ) => {
    if (key === 'workPeriod' && !isSuperAdmin) {
      return;
    }
    if (
      contractAndEstimateLocked &&
      !REPAIR_CONTRACT_FIELDS_EDITABLE_WHEN_SIGNED.has(String(key))
    ) {
      return;
    }
    setForm((p) => {
      const nextContract = { ...p.contract, [key]: value };
      if (key === 'workPeriod') {
        nextContract.workPeriodIsManual = true;
      }
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
  const estimateCustomerFilter = useMemo(
    () => ({
      filterByLinkedCustomer: isProductDirectionPackage,
      linkedCrmCustomerId,
    }),
    [isProductDirectionPackage, linkedCrmCustomerId]
  );

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
      if (!isEstimatePresetForLinkedContractCustomer(preset, estimateCustomerFilter)) {
        return false;
      }
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
    estimateCustomerFilter,
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
        if (!isEstimatePresetForLinkedContractCustomer(p, estimateCustomerFilter)) return false;
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
    estimateCustomerFilter,
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

  const selectedEstimateSections = useMemo(
    () =>
      buildEstimateSectionsFromPresetIds(
        form.estimate.selectedPresetIds,
        estimatePresets,
        estimateGroups
      ),
    [form.estimate.selectedPresetIds, estimatePresets, estimateGroups]
  );

  const estimateAppendixContractRef = useMemo(() => {
    const num = form.contract.number.trim() || '—';
    const raw = form.contract.date.trim();
    const date = !raw ? '—' : contractDateToDdMmYyyy(raw) || raw;
    return { num, date };
  }, [form.contract.number, form.contract.date]);

  const windowsContractCostBreakdown = useMemo(
    () => (isProductDirectionPackage ? computeWindowsContractCostBreakdown(form) : null),
    [
      isProductDirectionPackage,
      form.estimate.snapshot?.total,
      form.estimate.selectedPresetIds,
      form.windowsSpecificationAmount,
      form.contract.discountPercent,
    ]
  );

  const repairContractTotalFromEstimate = useMemo(() => {
    if (isProductDirectionPackage) return null;
    return applyRepairContractDiscountToNullableBase(
      form.estimate.snapshot?.total ?? null,
      form.contract.discountPercent
    );
  }, [
    isProductDirectionPackage,
    form.estimate.snapshot?.total,
    form.estimate.selectedPresetIds,
    form.contract.discountPercent,
  ]);

  /** Ремонт: «Стоимость договора» = итог сметы с учётом скидки по договору. */
  useEffect(() => {
    if (isProductDirectionPackage) return;
    const contractFields = repairEstimateTotalToContractFields(repairContractTotalFromEstimate);
    const cur = formRef.current.contract;
    if (
      cur.totalAmount === contractFields.totalAmount &&
      cur.totalAmountWords === contractFields.totalAmountWords &&
      cur.recommendedPrepayment === contractFields.recommendedPrepayment
    ) {
      return;
    }
    setForm((p) => ({
      ...p,
      contract: {
        ...p.contract,
        totalAmount: contractFields.totalAmount,
        totalAmountWords: contractFields.totalAmountWords,
        recommendedPrepayment: contractFields.recommendedPrepayment,
      },
    }));
    touchPackageData();
  }, [isProductDirectionPackage, repairContractTotalFromEstimate, touchPackageData]);

  /** Пакет «Окна»: общая сумма договора = работы (счёт-заказ) + изделия (спецификация). */
  useEffect(() => {
    if (!isProductDirectionPackage || !windowsContractCostBreakdown) return;
    const contractFields = windowsContractTotalToContractFields(
      windowsContractCostBreakdown.totalAmount
    );
    const cur = formRef.current.contract;
    if (
      cur.totalAmount === contractFields.totalAmount &&
      cur.totalAmountWords === contractFields.totalAmountWords &&
      cur.recommendedPrepayment === contractFields.recommendedPrepayment
    ) {
      return;
    }
    setForm((p) => ({
      ...p,
      contract: {
        ...p.contract,
        totalAmount: contractFields.totalAmount,
        totalAmountWords: contractFields.totalAmountWords,
        recommendedPrepayment: contractFields.recommendedPrepayment,
      },
    }));
    touchPackageData();
  }, [isProductDirectionPackage, windowsContractCostBreakdown, touchPackageData]);

  const workPeriodFieldHelp = useMemo(
    () =>
      repairWorkPeriodFieldHelp({
        packageKindLabel: packageKindUiLabel(packageKind),
        contractLocked: contractAndEstimateLocked,
        workPeriodIsManual: form.contract.workPeriodIsManual === true,
        isSuperAdmin,
        placeholderDays:
          form.contract.workPeriod.trim() ||
          (isProductDirectionPackage
            ? String(DEFAULT_WINDOWS_CONTRACT_WORK_PERIOD_DAYS)
            : String(DEFAULT_REPAIR_CONTRACT_WORK_PERIOD_DAYS)),
      }),
    [
      packageKind,
      contractAndEstimateLocked,
      form.contract.workPeriodIsManual,
      form.contract.workPeriod,
      isSuperAdmin,
      isProductDirectionPackage,
    ]
  );

  const discountFieldHelp = useMemo(
    () =>
      repairDiscountFieldHelp({
        isWindowsPackage: isProductDirectionPackage,
        contractLocked: contractAndEstimateLocked,
      }),
    [isProductDirectionPackage, contractAndEstimateLocked]
  );

  const contractDateFieldHelp = useMemo(
    () =>
      repairContractDateFieldHelp({
        isWindowsPackage: isProductDirectionPackage,
        contractLocked: contractAndEstimateLocked,
      }),
    [isProductDirectionPackage, contractAndEstimateLocked]
  );

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
  /** Мастера, доступные для назначения на договор (по направлению пакета). */
  const installersForContract = useMemo(() => {
    const direction = isProductDirectionPackageKind(packageKind) ? packageKind : 'REPAIR';
    return repairInstallers.filter((installer) => installer.direction === direction);
  }, [repairInstallers, packageKind]);

  const selectedRepairInstallers = useMemo(() => {
    const selectedIds = new Set(form.selectedRepairInstallerIds ?? []);
    return installersForContract.filter((installer) => selectedIds.has(installer.id));
  }, [installersForContract, form.selectedRepairInstallerIds]);
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
    const allowedIds = new Set(installersForContract.map((installer) => installer.id));
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
  }, [installersForContract]);
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
    const discountFactor = repairContractDiscountMoneyFactor(
      parseRepairContractDiscountPercent(form.contract.discountPercent)
    );
    const windowsMarkupFactor = isProductDirectionPackage
      ? 1 - normalizeWindowsWorkOrderMarkupPercent(windowsWorkOrderMarkupPercent) / 100
      : 1;
    const taxPercent = isProductDirectionPackage
      ? 0
      : parsePercentForWorkOrder(form.workOrder.taxPercent);
    const markupPercent = isProductDirectionPackage
      ? normalizeWindowsWorkOrderMarkupPercent(windowsWorkOrderMarkupPercent)
      : parsePercentForWorkOrder(form.workOrder.markupPercent);
    const fallbackGradeIncreasePercent = isProductDirectionPackage
      ? 0
      : normalizeWorkOrderGrade(form.workOrder.gradeIncreasePercent);
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
        const gradeIncreasePercent = isProductDirectionPackage
          ? 0
          : assignedInstaller
            ? parseInstallerGradePercent(assignedInstaller.grade)
            : fallbackGradeIncreasePercent;
        const gradeFactor = isProductDirectionPackage ? 1 : 1 + gradeIncreasePercent / 100;
        const priceFactor = isProductDirectionPackage
          ? discountFactor * windowsMarkupFactor
          : discountFactor * (1 - taxPercent / 100) * (1 - markupPercent / 100) * gradeFactor;
        const adjustedPrice = line.price * priceFactor;
        const adjustedAmount = line.amount * priceFactor;
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
    isProductDirectionPackage,
    windowsWorkOrderMarkupPercent,
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

  useEffect(() => {
    if (activeAddendumSlot === null) return;
    const idx = activeAddendumSlot - 1;
    if (idx < 0 || idx >= 5) return;
    const slot = form.addendumSlots[idx];
    if (slot?.status === 'SIGNED' || slot?.status === 'PAID') return;
    if (form.addendumDocumentDates[idx]?.trim()) return;
    patchAddendumDocumentDate(idx, todayContractDateDdMmYyyy());
  }, [
    activeAddendumSlot,
    form.addendumSlots,
    form.addendumDocumentDates,
    patchAddendumDocumentDate,
  ]);

  const addendumEditor = usePackageAddendumEditor({
    activeAddendumSlot,
    form,
    formRef,
    contractAndEstimateLocked,
    isProductDirectionPackage,
    contractEstimateObjectKey,
    estimateGroups,
    estimatePresets,
    attachableAddendumEstimatePresets,
    attachableAddendumExcludedEstimatePresets,
    estimateUsageById,
    addendumPresetToAttach,
    setAddendumPresetToAttach,
    addendumExcludedPresetToAttach,
    setAddendumExcludedPresetToAttach,
    draggingAddendumEstimatePresetId,
    setDraggingAddendumEstimatePresetId,
    draggingAddendumExcludedEstimatePresetId,
    setDraggingAddendumExcludedEstimatePresetId,
    patchAddendumDocumentDate,
    setForm,
    setDirty,
    schedulePersistDebounced: schedulePersistRepairPackageDebounced,
    touchPackageData,
  });

  const renderedDoc = usePackageRenderedDocument({
    activeTab,
    form,
    packageKind,
    estimatePresets,
    estimateGroups,
    windowsWorkOrderMarkupPercent,
    templateOverrides,
    resolveTemplateHtml,
  });

  const getTemplatePreviewHtml = useCallback(
    (tab: RepairDocumentTabId): string => {
      if (
        tab === 'interactiveFinalEstimate' ||
        tab === 'finalWorkOrder' ||
        tab === 'finalEstimate' ||
        tab === 'specification'
      ) {
        return '';
      }
      if (tab === 'questionnaire1') {
        return buildManagerQuestionnaire1PrintHtml(
          repairPackageFormForTemplate(form, {
            templateTab: 'estimate',
            estimatePresets,
            estimateGroups,
          })
        );
      }
      if (tab === 'questionnaire2') {
        return buildPostWorkQuestionnaire2PrintHtml(
          repairPackageFormForTemplate(form, {
            templateTab: 'estimate',
            estimatePresets,
            estimateGroups,
          }),
          { packageKind }
        );
      }
      const templateTab = tab as RepairDocumentTemplateTabId;
      const formForTpl = repairPackageFormForTemplate(form, {
        templateTab,
        estimatePresets,
        estimateGroups,
        packageKind,
        windowsWorkOrderMarkupPercent,
      });
      const tpl = templateOverrides[templateTab] ?? resolveTemplateHtml(templateTab);
      return prepareContractTemplateHtmlForPreview(
        applyTemplate(tpl, formForTpl, {
          autoInsertContractSignatures: tab === 'contract',
          plainCustomerPlaceholders: isRepairPlainCustomerTab(tab),
        })
      );
    },
    [
      form,
      estimatePresets,
      estimateGroups,
      templateOverrides,
      resolveTemplateHtml,
      packageKind,
      windowsWorkOrderMarkupPercent,
    ]
  );

  const workOrderHubContextValue = useMemo((): RepairContractWorkOrderHubContextValue => {
    return {
      packageKind,
      isWindowsPackage: isProductDirectionPackage,
      windowsWorkOrderMarkupPercent,
      form,
      updateWorkOrder,
      getTemplatePreviewHtml,
      repairInstallers: installersForContract,
      selectedRepairInstallers,
      selectedRepairInstallersById,
      activeRepairInstallerId,
      addRepairInstallerToContract,
      removeRepairInstallerFromContract,
      setActiveRepairInstallerId,
      activateOrToggleRepairInstaller,
      assignInstallerToFinalEstimateRow,
      assignInstallerToFinalEstimateRows,
      interactiveFinalEstimateSections,
      unassignedInteractiveRowsCount,
      activeFinalWorkOrderDocId,
      setActiveFinalWorkOrderDocId,
      finalWorkOrderComputed,
      finalWorkOrderCategorySections,
      perInstallerWorkOrders,
      activeInstallerWorkOrder,
      estimateAppendixContractRef,
      formatMoneyValue,
      formatMoneyRubShort,
      formatInstallerNameShort,
      formatInstallerGradeShort: (grade: string | null | undefined) =>
        formatInstallerGradeShort(grade ?? ''),
    };
  }, [
    packageKind,
    isProductDirectionPackage,
    windowsWorkOrderMarkupPercent,
    form,
    updateWorkOrder,
    getTemplatePreviewHtml,
    installersForContract,
    selectedRepairInstallers,
    selectedRepairInstallersById,
    activeRepairInstallerId,
    addRepairInstallerToContract,
    removeRepairInstallerFromContract,
    setActiveRepairInstallerId,
    activateOrToggleRepairInstaller,
    assignInstallerToFinalEstimateRow,
    assignInstallerToFinalEstimateRows,
    interactiveFinalEstimateSections,
    unassignedInteractiveRowsCount,
    activeFinalWorkOrderDocId,
    finalWorkOrderComputed,
    finalWorkOrderCategorySections,
    perInstallerWorkOrders,
    activeInstallerWorkOrder,
    estimateAppendixContractRef,
  ]);

  const handlePrint = () => {
    const windowsPrintOptions = resolveRepairEditorPrintOptions(packageKind, activeTab, form);

    if (
      activeTab === 'estimate' ||
      activeTab === 'finalWorkOrder' ||
      activeTab === 'finalEstimate' ||
      activeTab === 'specification'
    ) {
      const printTargetId =
        activeTab === 'estimate'
          ? 'estimate-sheet'
          : activeTab === 'finalWorkOrder'
            ? 'work-order-sheet'
            : 'final-estimate-sheet';
      const target = document.querySelector(`[data-print-target='${printTargetId}']`);
      if (!target) return;
      if (shouldUseWindowsPackageCompactPrint(packageKind, activeTab)) {
        const printOpts =
          windowsPrintOptions ?? pickWindowsPackagePrintDocumentOptions(activeTab, form);
        if (activeTab === 'estimate') {
          const sheetHtml = buildEstimateSheetPrintHtml({
            variant: 'windows',
            appendixNumber: 2,
            contractNum: estimateAppendixContractRef.num,
            contractDate: estimateAppendixContractRef.date,
            sections: selectedEstimateSections,
            snapshot: form.estimate.snapshot,
            directorName: form.executor.directorName,
            customerFullName: form.customer.fullName,
            contractDiscountPercent: form.contract.discountPercent,
            docPrintRootClass: WINDOWS_PACKAGE_UNIFIED_PRINT_CLASS,
          });
          printWindowsEstimateSheetHtml(
            sheetHtml,
            packageEditorTabLabel(packageKind, activeTab),
            printOpts
          );
          return;
        }
        printWindowsEstimateSheetFromDom(
          target,
          packageEditorTabLabel(packageKind, activeTab),
          printOpts
        );
        return;
      }
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
    const actTwinOnOneSheet = isRepairActTwinOneSheetTab(activeTab, packageKind);
    const printTitle =
      activeTab === 'contract' || actTwinOnOneSheet
        ? ''
        : isProductDirectionPackage
          ? packageEditorTabLabel(packageKind, activeTab)
          : REPAIR_DOCUMENT_TAB_LABELS[activeTab];
    const printBody = actTwinOnOneSheet
      ? wrapRepairActTwinCopiesOnOnePageHtml(renderedDoc)
      : renderedDoc;
    const contractCompactPrint =
      windowsPrintOptions != null ||
      activeTab === 'contract' ||
      isRepairActA4PreviewTab(activeTab) ||
      activeTab === 'productionLog' ||
      activeTab === 'memo';
    printDocumentHtml(
      printBody,
      printTitle,
      windowsPrintOptions ??
        (activeTab === 'contract'
          ? { marginFooter: pickPrintMarginFooterNames(form), contractCompact: true }
          : contractCompactPrint
            ? { contractCompact: true }
            : {})
    );
  };

  const headerContractNumberLabel = useMemo(
    () => getRepairContractNumberDisplayForForm(form),
    [form.contract.number, form._repairCopyContractNumberBaseline]
  );

  const unsignedAddendumOrdinals = useMemo(
    () => getUnsignedAddendumOrdinals(form, packageFlowStatus),
    [form, packageFlowStatus]
  );
  const signedAddendumOrdinals = useMemo(() => getSignedAddendumOrdinals(form), [form]);

  const repairAddendumTabAddBlockedReason = useMemo((): string | null => {
    if (packageFlowStatus === 'REFUSED') {
      return `Отказ по проекту договора: вкладки Д/с недоступны. При необходимости снимите отказ в «${REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE}».`;
    }
    if (packageFlowStatus !== 'CONTRACT_CONCLUDED') {
      return `Вкладки «Д/с №1»…«Д/с №5» доступны после подписания договора. Отметьте «Договор подписан» в «${REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE}».`;
    }
    if (
      form.addendumSlotCount > 0 &&
      form.addendumSlots[form.addendumSlotCount - 1]?.status !== 'SIGNED'
    ) {
      return `Сначала отметьте Д/с №${form.addendumSlotCount} как подписанное в «${REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE}».`;
    }
    return null;
  }, [packageFlowStatus, form.addendumSlotCount, form.addendumSlots]);

  const repairAddendumTabAddDisabled = repairAddendumTabAddBlockedReason !== null;

  const repairAddAddendumTabTitle =
    repairAddendumTabAddBlockedReason ??
    (form.addendumSlotCount === 0
      ? 'Добавить вкладку дополнительного соглашения (до пяти)'
      : 'Показать ещё одну вкладку дополнительного соглашения (до пяти)');

  const headerContractConcludedDateLabel =
    packageFlowStatus === 'CONTRACT_CONCLUDED'
      ? formatContractConcludedDateForHeader(form.contractConcludedAt)
      : null;

  const closeWorkOrdersHub = useCallback(() => {
    if (workOrdersHubListSurface) {
      onWorkOrdersHubListClose?.();
      onWorkOrdersHubListUpdated?.();
      return;
    }
    setWorkOrdersHubOpen(false);
  }, [workOrdersHubListSurface, onWorkOrdersHubListClose, onWorkOrdersHubListUpdated]);

  if (loading && workOrdersHubListSurface) {
    return (
      <Modal isOpen onClose={closeWorkOrdersHub} title="Заказ-наряды" size="lg">
        <p className={cdTemplates.hint} style={{ margin: 0 }}>
          Загрузка…
        </p>
      </Modal>
    );
  }

  if (loading) {
    return (
      <div className={cdBase.page}>
        <p className={cdTemplates.hint}>Загрузка…</p>
      </div>
    );
  }

  if (workOrdersHubListSurface) {
    return (
      <RepairContractWorkOrderHubProvider value={workOrderHubContextValue}>
        {error ? (
          <Modal isOpen onClose={closeWorkOrdersHub} title="Заказ-наряды" size="lg">
            <p data-modal-form-error style={{ margin: 0 }}>
              {error}
            </p>
          </Modal>
        ) : (
          <RepairContractWorkOrdersHubModal
            isOpen={workOrdersHubOpen}
            onClose={closeWorkOrdersHub}
            panelTab={workOrdersHubPanelTab}
            onPanelTabChange={setWorkOrdersHubPanelTab}
            addendumSlotCount={form.addendumSlotCount}
            packageKind={packageKind}
            unassignedInteractiveRowsCount={unassignedInteractiveRowsCount}
            headerContractNumberLabel={headerContractNumberLabel}
            headerContractDateLabel={headerContractConcludedDateLabel ?? undefined}
          />
        )}
      </RepairContractWorkOrderHubProvider>
    );
  }

  const orderedVisibleRepairTabs = resolvePackageEditorVisibleTabs({
    tabOrder: repairTabOrder,
    packageKind,
    addendumSlotCount: form.addendumSlotCount,
  });
  const customerSectionCompletionPercent = linkedCrmCustomerId
    ? form.customer.type === 'PERSON'
      ? calcPackageSectionCompletionPercent([
          form.customer.fullName,
          form.customer.address,
          form.customer.email,
          form.customer.phones,
          form.customer.passportSeriesNumber,
          form.customer.passportIssuedBy,
          form.customer.passportIssueDate,
          form.customer.bankDetails,
        ])
      : calcPackageSectionCompletionPercent([
          form.customer.representativeFullNameNominative,
          form.customer.representativeFullNameGenitive,
          form.customer.organizationName,
          form.customer.representativePositionNominative,
          form.customer.representativePositionGenitive,
          form.customer.inn,
          form.customer.ogrn,
          form.customer.address,
          form.customer.email,
          form.customer.phones,
          form.customer.bankDetails,
        ])
    : 0;
  const executorSectionCompletionPercent = calcPackageSectionCompletionPercent([
    form.executor.companyName,
    form.executor.inn,
    form.executor.executorKind === 'COMPANY' ? form.executor.kpp : form.executor.ogrnip,
    form.executor.ogrn,
    form.executor.email,
    form.executor.legalAddress,
    form.executor.actualAddress,
    form.executor.bankName,
    form.executor.bankBik,
    form.executor.bankCorrAccount,
    form.executor.bankSettlementAccount,
  ]);
  const managerSectionCompletionPercent = calcPackageSectionCompletionPercent([
    form.executor.signatoryCrmUserId,
    form.executor.directorNameNominative,
    form.executor.directorNameGenitive,
    form.executor.basis,
    form.executor.salesOffice,
    form.executor.officePhone,
  ]);
  return (
    <RepairContractWorkOrderHubProvider value={workOrderHubContextValue}>
      <div
        className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdBase.repairContractEditorPage} ${cdDataTab.repairContractEditorPage} ${cdWorkspace.repairContractEditorPage}`}
      >
        <PackageDocumentEditorHeader
          packageKind={packageKind}
          loading={loading}
          packageRefreshing={packageRefreshing}
          activeTab={activeTab}
          headerContractNumberLabel={headerContractNumberLabel}
          headerContractConcludedDateLabel={headerContractConcludedDateLabel}
          unsignedAddendumOrdinals={unsignedAddendumOrdinals}
          paymentInvoiceCount={paymentInvoiceCount}
          unassignedInteractiveRowsCount={unassignedInteractiveRowsCount}
          form={form}
          onOpenPackageHub={openPackageHub}
          onOpenInvoicesHub={() => setInvoicesHubOpen(true)}
          onOpenWorkOrdersHub={(defaultTab) => {
            setWorkOrdersHubPanelTab(defaultTab);
            setWorkOrdersHubOpen(true);
          }}
          onOpenQuestionnairesHub={(defaultTab) => {
            setQuestionnairesHubPanelTab(defaultTab);
            setQuestionnairesHubOpen(true);
          }}
          onOpenVersionsHistory={() => setIsVersionsHistoryOpen(true)}
          onRefreshFromServer={refreshPackageFromServer}
          onPrint={handlePrint}
        />
        {packageFlowStatus === 'REFUSED' ? (
          <div className={cdChrome.repairPackageRefusedBanner} role="status">
            <strong>Отказ по проекту договора.</strong>{' '}
            {form.contractRefusalReason.trim() ? (
              <span>{form.contractRefusalReason.trim()}</span>
            ) : (
              <span className={cdTemplates.hint}>Причина не указана.</span>
            )}
            <p
              className={cdTemplates.hint}
              style={{ marginTop: 'var(--admin-space-sm)', marginBottom: 0 }}
            >
              Если клиент передумал, откройте «Оплаты и Управление договором» и нажмите «Снять
              отказ» — пакет снова станет «в проекте», данные можно будет редактировать.
            </p>
          </div>
        ) : null}
        {error ? <p className={cdTemplates.error}>{error}</p> : null}
        {excelMessage ? <p className={cdTemplates.hint}>{excelMessage}</p> : null}
        <div className={cdChrome.repairPackageTabBarRow}>
          <div
            className={`${cdChrome.tabBar} ${cdChrome.blockTabs} ${cdChrome.repairPackageTabBarCompact} ${cdBase.blockTabs} ${cdBase.repairPackageTabBarCompact}`}
          >
            <PackageDocumentEditorTabBar
              packageKind={packageKind}
              tabs={orderedVisibleRepairTabs}
              activeTab={activeTab}
              contractAndEstimateLocked={contractAndEstimateLocked}
              unsignedAddendumOrdinals={unsignedAddendumOrdinals}
              signedAddendumOrdinals={signedAddendumOrdinals}
              onTabActivate={handleRepairTabActivate}
              onTabDragStart={handleRepairTabDragStart}
              onTabDragOver={handleRepairTabDragOver}
              onTabDrop={handleRepairTabDrop}
            />
            <div
              className={cdChrome.repairPackageTabBarAddendumActions}
              role="group"
              aria-label="Добавить или убрать вкладку доп. соглашения"
            >
              {form.addendumSlotCount < 5 ? (
                <span
                  className={cdChrome.repairAddAddendumTabBtnWrap}
                  title={repairAddAddendumTabTitle}
                >
                  <button
                    type="button"
                    className={`${cdWorkspace.secondaryBtn} ${cdChrome.repairAddAddendumTabBtn} ${cdBase.repairAddAddendumTabBtn}`}
                    disabled={repairAddendumTabAddDisabled}
                    aria-disabled={repairAddendumTabAddDisabled}
                    aria-label={`Добавить вкладку Д/с №${form.addendumSlotCount + 1}`}
                    onClick={() => {
                      if (repairAddendumTabAddDisabled) return;
                      const next = form.addendumSlotCount + 1;
                      const newSlotIdx = next - 1;
                      setForm((f) => {
                        const nextDates = [
                          ...f.addendumDocumentDates,
                        ] as RepairPackageFormData['addendumDocumentDates'];
                        if (newSlotIdx >= 0 && newSlotIdx < 5 && !nextDates[newSlotIdx]?.trim()) {
                          nextDates[newSlotIdx] = todayContractDateDdMmYyyy();
                        }
                        return {
                          ...f,
                          addendumSlotCount: next,
                          addendumDocumentDates: nextDates,
                        };
                      });
                      touchPackageData();
                      setActiveTab(`addendum${next}` as RepairDocumentTabId);
                    }}
                  >
                    + Д/с №{form.addendumSlotCount + 1}
                  </button>
                </span>
              ) : null}
              {form.addendumSlotCount > 0 ? (
                <span
                  className={cdChrome.repairAddAddendumTabBtnWrap}
                  title={
                    isRepairAddendumSlotRemovable(form.addendumSlots[form.addendumSlotCount - 1])
                      ? `Удалить пустое Д/с №${form.addendumSlotCount}`
                      : `Можно удалить только пустое Д/с №${form.addendumSlotCount}`
                  }
                >
                  <button
                    type="button"
                    className={`${cdWorkspace.secondaryBtn} ${cdChrome.repairAddAddendumTabBtn} ${cdBase.repairAddAddendumTabBtn}`}
                    disabled={
                      !isRepairAddendumSlotRemovable(form.addendumSlots[form.addendumSlotCount - 1])
                    }
                    aria-label={`Убрать вкладку Д/с №${form.addendumSlotCount}`}
                    onClick={() => {
                      const lastIdx = form.addendumSlotCount - 1;
                      if (!isRepairAddendumSlotRemovable(form.addendumSlots[lastIdx])) {
                        return;
                      }
                      const nextCount = form.addendumSlotCount - 1;
                      setForm((f) => {
                        const nextDates = [
                          ...f.addendumDocumentDates,
                        ] as RepairPackageFormData['addendumDocumentDates'];
                        nextDates[lastIdx] = '';
                        const nextSlots = [
                          ...f.addendumSlots,
                        ] as RepairPackageFormData['addendumSlots'];
                        nextSlots[lastIdx] = {
                          status: 'OPEN',
                          signedAt: '',
                          paidAt: '',
                          workPeriodIncreaseDays: '',
                          selectedPresetIds: [],
                          snapshot: null,
                          excludedSelectedPresetIds: [],
                          excludedSnapshot: null,
                          notes: '',
                          excludedNotes: '',
                          specificationAddedLines: [],
                          specificationExcludedLines: [],
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
                        setActiveTab(
                          nextCount > 0
                            ? (`addendum${nextCount}` as RepairDocumentTabId)
                            : 'contract'
                        );
                      }
                    }}
                  >
                    − Д/с №{form.addendumSlotCount}
                  </button>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {activeTab === 'data' ? (
          <PackageDataTab
            form={form}
            contractAndEstimateLocked={contractAndEstimateLocked}
            isSuperAdmin={isSuperAdmin}
            isProductDirectionPackage={isProductDirectionPackage}
            contractObjectBlockFieldClassName={contractObjectBlockFieldClassName}
            updateContract={updateContract}
            updateObject={updateObject}
            applyExecutorProfile={applyExecutorProfile}
            applySignatoryProfile={applySignatoryProfile}
            executorProfiles={executorProfiles}
            signatoryProfiles={signatoryProfiles}
            contractDateFieldHelp={contractDateFieldHelp}
            workPeriodFieldHelp={workPeriodFieldHelp}
            discountFieldHelp={discountFieldHelp}
            linkedCrmCustomerId={linkedCrmCustomerId}
            onCrmCustomerApplied={handleRepairCrmCustomerApplied}
            onCrmCustomerClear={handleRepairCrmCustomerClear}
            onCrmError={(text) => setError(text)}
            windowsContractCostBreakdown={windowsContractCostBreakdown}
            customerSectionCompletionPercent={customerSectionCompletionPercent}
            executorSectionCompletionPercent={executorSectionCompletionPercent}
            managerSectionCompletionPercent={managerSectionCompletionPercent}
            customerDataSectionExpanded={customerDataSectionExpanded}
            setCustomerDataSectionExpanded={setCustomerDataSectionExpanded}
            executorDataSectionExpanded={executorDataSectionExpanded}
            setExecutorDataSectionExpanded={setExecutorDataSectionExpanded}
            managerDataSectionExpanded={managerDataSectionExpanded}
            setManagerDataSectionExpanded={setManagerDataSectionExpanded}
            repairCustomerPhonesReadonlyDisplay={repairCustomerPhonesReadonlyDisplay}
          />
        ) : activeTab === 'estimate' ? (
          <PackageEstimateTab
            form={form}
            contractAndEstimateLocked={contractAndEstimateLocked}
            isProductDirectionPackage={isProductDirectionPackage}
            linkedCrmCustomerId={linkedCrmCustomerId}
            estimateAppendixContractRef={estimateAppendixContractRef}
            contractEstimateObjectKey={contractEstimateObjectKey}
            estimateAttachGroupKey={estimateAttachGroupKey}
            setEstimateAttachGroupKey={setEstimateAttachGroupKey}
            estimatePresetToAttach={estimatePresetToAttach}
            setEstimatePresetToAttach={setEstimatePresetToAttach}
            attachEstimatePickMeta={attachEstimatePickMeta}
            attachableForSelectedGroup={attachableForSelectedGroup}
            attachableEstimatePresets={attachableEstimatePresets}
            estimatePresets={estimatePresets}
            estimateUsageById={estimateUsageById}
            draggingEstimatePresetId={draggingEstimatePresetId}
            setDraggingEstimatePresetId={setDraggingEstimatePresetId}
            selectedEstimateSections={selectedEstimateSections}
            contractDiscountPercentParsed={contractDiscountPercentParsed}
            estimatePrintSheetRef={estimatePrintSheetRef}
            onEstimateObjectChange={(groupKey) => {
              setForm((prev) => ({ ...prev, estimateObjectGroupKey: groupKey }));
              touchPackageData();
            }}
            onAttachPreset={(presetId) => {
              addEstimatePresetToForm(presetId);
              setEstimatePresetToAttach('');
            }}
            onMovePreset={moveEstimatePresetInForm}
            onRemovePreset={removeEstimatePresetFromForm}
          />
        ) : activeTab === 'finalEstimate' ? (
          <RepairFinalEstimateTab
            contractNumberLabel={estimateAppendixContractRef.num}
            contractDateLabel={estimateAppendixContractRef.date}
            rooms={finalEstimateRooms}
            totalAmount={finalEstimateSummary.totalAmount}
            totalAfterDiscount={finalEstimateTotalAfterDiscount}
            contractDiscountPercent={contractDiscountPercentParsed}
          />
        ) : activeTab === 'specification' ? (
          <ProductSpecificationTab
            packageKind={packageKind}
            packageId={packageId}
            contractNumberLabel={estimateAppendixContractRef.num}
            contractDateLabel={estimateAppendixContractRef.date}
            disabled={contractAndEstimateLocked}
            windowsSpecificationAmount={form.windowsSpecificationAmount}
            windowsSpecificationFileUrl={form.windowsSpecificationFileUrl}
            windowsSpecificationFileName={form.windowsSpecificationFileName}
            onWindowsAmountChange={(value) => {
              setForm((p) => ({ ...p, windowsSpecificationAmount: value }));
              touchPackageData();
            }}
            onWindowsFileAttached={({ fileUrl, fileName }) => {
              setForm((p) => ({
                ...p,
                windowsSpecificationFileUrl: fileUrl,
                windowsSpecificationFileName: fileName,
              }));
              touchPackageData();
            }}
            onWindowsFileClear={() => {
              setForm((p) => ({
                ...p,
                windowsSpecificationFileUrl: '',
                windowsSpecificationFileName: '',
              }));
              touchPackageData();
            }}
            onError={(text) => setError(text)}
          />
        ) : (
          <PackageTemplateEditorPane
            activeTab={activeTab}
            packageKind={packageKind}
            contractAndEstimateLocked={contractAndEstimateLocked}
            renderedDoc={renderedDoc}
            unsignedAddendumBanner={
              activeAddendumSlot !== null &&
              unsignedAddendumOrdinals.includes(activeAddendumSlot) ? (
                <div className={cdDataTab.repairAddendumUnsignedBanner} role="status">
                  <strong>Д/с №{activeAddendumSlot} не отмечено как подписанное.</strong> Прикрепите
                  расчёты и нажмите «Д/с №{activeAddendumSlot} подписано» ниже или в модалке{' '}
                  <button
                    type="button"
                    className={cdDataTab.repairAddendumUnsignedBannerLink}
                    onClick={openPackageHub}
                  >
                    Оплаты и Управление договором
                  </button>
                  .
                </div>
              ) : null
            }
            addendumSlotContent={
              <PackageAddendumEditorPane
                activeAddendumSlot={activeAddendumSlot}
                isProductDirectionPackage={isProductDirectionPackage}
                addendumEditor={addendumEditor}
              />
            }
          />
        )}
        <RepairContractWorkOrdersHubModal
          isOpen={workOrdersHubOpen}
          onClose={closeWorkOrdersHub}
          panelTab={workOrdersHubPanelTab}
          onPanelTabChange={setWorkOrdersHubPanelTab}
          addendumSlotCount={form.addendumSlotCount}
          packageKind={packageKind}
          unassignedInteractiveRowsCount={unassignedInteractiveRowsCount}
          headerContractNumberLabel={headerContractNumberLabel}
          headerContractDateLabel={headerContractConcludedDateLabel ?? undefined}
        />
        <RepairContractQuestionnairesHubModal
          isOpen={questionnairesHubOpen}
          onClose={() => setQuestionnairesHubOpen(false)}
          panelTab={questionnairesHubPanelTab}
          onPanelTabChange={setQuestionnairesHubPanelTab}
          form={form}
          packageKind={packageKind}
          headerContractNumberLabel={headerContractNumberLabel}
          headerContractDateLabel={headerContractConcludedDateLabel ?? undefined}
          linkedCrmCustomerId={linkedCrmCustomerId}
          onPatchManagerQuestionnaire1={patchManagerQuestionnaire1}
          onToggleManagerQuestionnaire1Traffic={toggleManagerQuestionnaire1Traffic}
          onToggleManagerQuestionnaire1WhyChosen={toggleManagerQuestionnaire1WhyChosen}
          onToggleManagerQuestionnaire1Need={toggleManagerQuestionnaire1Need}
          onPatchPostWorkQuestionnaire2={patchPostWorkQuestionnaire2}
        />
        <RepairContractPackageEventsJournalModal
          isOpen={isVersionsHistoryOpen}
          onClose={() => setIsVersionsHistoryOpen(false)}
          versions={packageVersions}
          versionsBusy={versionsBusy}
          onRefresh={() => void refreshPackageVersions()}
          contractNumberLabel={headerContractNumberLabel}
          contractDateLabel={headerContractConcludedDateLabel}
        />
        <RepairContractPackageHubModal
          packageId={packageId}
          isOpen={packageHubOpen}
          onClose={() => setPackageHubOpen(false)}
          onUpdated={handlePackageHubUpdated}
          contractNumberLabel={headerContractNumberLabel}
          headerConcludedDateLabel={headerContractConcludedDateLabel}
          getLiveForm={getLiveFormForHub}
          getLivePersistOptions={getLivePersistOptionsForHub}
          blockPipelineActions={activeTab === 'data' && dirty}
          blockPipelineReason={
            activeTab === 'data' && dirty
              ? 'Сначала сохраните изменения на вкладке «Данные»'
              : undefined
          }
        />
        <RepairContractInvoicesModal
          packageId={packageId}
          packageKind={packageKind}
          form={form}
          isOpen={invoicesHubOpen}
          onClose={() => setInvoicesHubOpen(false)}
          onError={setError}
          onInvoicesChanged={() => {
            void listPackagePaymentInvoices(packageId)
              .then((list) => setPaymentInvoiceCount(list.length))
              .catch(() => undefined);
          }}
          contractTemplatePresets={contractTemplatePresets}
          templateOverrides={templateOverrides}
          selectedTemplateIds={selectedTemplateIds}
        />
      </div>
    </RepairContractWorkOrderHubProvider>
  );
}
