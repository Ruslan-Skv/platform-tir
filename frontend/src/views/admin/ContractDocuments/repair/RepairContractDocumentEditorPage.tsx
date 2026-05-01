'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  type ContractEstimateGroup,
  type ContractEstimatePreset,
  type ContractSignatoryProfile,
  type ContractTemplatePreset,
  type ExecutorRequisiteProfile,
  getContractDocumentEstimatePresets,
  getContractDocumentExecutorProfiles,
  getContractDocumentGlobalTemplate,
  getContractDocumentPackage,
  getContractDocumentPackages,
  getContractDocumentSignatoryProfiles,
  getContractDocumentTemplatePresets,
  putContractDocumentTemplatePresets,
  updateContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';
import type { Contract } from '@/shared/api/admin-crm';
import { getContract, getContracts } from '@/shared/api/admin-crm';

import styles from '../ContractDocuments.module.css';
import { amountToRussianWords } from './amountToRussianWords';
import { mergeRepairFormFromCrmContract } from './applyCrmContractToForm';
import { applyTemplate } from './applyTemplate';
import { contractDateToDdMmYyyy, todayContractDateDdMmYyyy } from './contractDateFormat';
import {
  type RepairDocumentTemplateTabId,
  buildPersistedFormData,
  mergeFormDataFromStorage,
} from './formDataTemplateStorage';
import { getDisplayContractDate, getDisplayContractNumber } from './packageContractDisplay';
import { pickPrintMarginFooterNames, printDocumentHtml } from './printDocument';
import {
  type EstimateSnapshotRoom,
  applyEstimatePresetIdsToRepairForm,
  parseEstimateSnapshotFromDraft,
} from './repairApplyEstimatePresetIds';
import { REPAIR_CONTRACT_PLACEHOLDER_GROUPS } from './repairContractPlaceholders';
import {
  REPAIR_DOCUMENT_TAB_IDS,
  REPAIR_DOCUMENT_TAB_LABELS,
  REPAIR_DOCUMENT_TEMPLATES,
  type RepairDocumentTabId,
} from './repairDocumentTemplates';
import {
  type RepairPackageFormData,
  buildRepairTemplatePreviewFallbackData,
  mergeRepairPackageFormData,
  mergeRepairPackageFormWithPreviewFallback,
  repairPackageFormForTemplate,
} from './repairPackageForm';

/** Класс на `document.body` при печати сметы — см. `@media print` в ContractDocuments.module.css */
const BODY_PRINT_ESTIMATE_CLASS = 'body-print-estimate-sheet';

/** Встроенный в код шаблон (если в БД нет общего шаблона). */
const FILE_REPAIR_CONTRACT_TEMPLATE = REPAIR_DOCUMENT_TEMPLATES.contract;
const TEMPLATE_TAB_IDS = REPAIR_DOCUMENT_TAB_IDS.filter(
  (id) => id !== 'data' && id !== 'estimate'
) as Exclude<RepairDocumentTabId, 'data' | 'estimate'>[];

function normalizeTemplateTabId(
  value: string | undefined
): Exclude<RepairDocumentTabId, 'data' | 'estimate'> {
  if (!value) return 'contract';
  return (TEMPLATE_TAB_IDS as string[]).includes(value)
    ? (value as Exclude<RepairDocumentTabId, 'data' | 'estimate'>)
    : 'contract';
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

interface RepairContractDocumentEditorPageProps {
  packageId: string;
}

export function RepairContractDocumentEditorPage({
  packageId,
}: RepairContractDocumentEditorPageProps) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [activeTab, setActiveTab] = useState<RepairDocumentTabId>('data');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCrmContractId, setDraftCrmContractId] = useState<string | null>(null);
  const [form, setForm] = useState<RepairPackageFormData>(() => mergeRepairPackageFormData({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaveSuccessModalOpen, setIsSaveSuccessModalOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [contractQuery, setContractQuery] = useState('');
  const [contractResults, setContractResults] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [templateOverrides, setTemplateOverrides] = useState<
    Partial<Record<RepairDocumentTemplateTabId, string>>
  >({});
  const [excelMessage, setExcelMessage] = useState<string | null>(null);
  const contractHtmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const estimatePrintSheetRef = useRef<HTMLArticleElement | null>(null);
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
  const [estimateGroups, setEstimateGroups] = useState<ContractEstimateGroup[]>([]);
  /** '' | '__ungrouped__' | id группы — для связки с выбором расчёта. */
  const [estimateAttachGroupKey, setEstimateAttachGroupKey] = useState('');
  const [estimatePresetToAttach, setEstimatePresetToAttach] = useState('');
  const [draggingEstimatePresetId, setDraggingEstimatePresetId] = useState<string | null>(null);
  const [repairPackages, setRepairPackages] = useState<
    Array<{
      id: string;
      title: string | null;
      formData: Record<string, unknown>;
      crmContract?: { contractNumber: string; contractDate: string } | null;
    }>
  >([]);
  const [estimateDataRefreshing, setEstimateDataRefreshing] = useState(false);

  /** Актуальная форма для отложенного сохранения (после setState ref обновится на следующем рендере). */
  const formRef = useRef(form);
  formRef.current = form;
  const templateOverridesRef = useRef(templateOverrides);
  templateOverridesRef.current = templateOverrides;
  const selectedTemplateIdsRef = useRef(selectedTemplateIds);
  selectedTemplateIdsRef.current = selectedTemplateIds;
  const draftTitleRef = useRef(draftTitle);
  draftTitleRef.current = draftTitle;
  const draftCrmContractIdRef = useRef(draftCrmContractId);
  draftCrmContractIdRef.current = draftCrmContractId;
  const persistRepairPackageDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            crmContractId: draftCrmContractIdRef.current,
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [row, globalTpl, profilesRes, signatoryRes, templateRes, estimateRes, packagesRes] =
        await Promise.all([
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
        ]);
      if (row.kind !== 'REPAIR') {
        setError('Этот пакет относится к другому направлению.');
        return;
      }
      setDraftTitle(row.title ?? '');
      setDraftCrmContractId(row.crmContractId ?? null);
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

      const formPayload: RepairPackageFormData = {
        ...mergedForm,
        contract: {
          ...mergedForm.contract,
          date: contractDate,
        },
        estimate: {
          ...mergedForm.estimate,
          selectedPresetIds: normalizedEstimateIds,
          selectedPresetId: normalizedEstimateIds[0] ?? '',
        },
      };
      setForm(formPayload);
      const overridesSansContract = { ...ov };
      delete overridesSansContract.contract;
      setTemplateOverrides(overridesSansContract);
      setGlobalContractState({ loaded: true, html: globalTpl.html });
      setExecutorProfiles(profilesRes.items ?? []);
      setSignatoryProfiles(signatoryRes.items ?? []);
      const templates = templateRes.items ?? [];
      setEstimatePresets(estimateRes.items ?? []);
      setEstimateGroups(estimateRes.groups ?? []);
      setEstimateAttachGroupKey('');
      setEstimatePresetToAttach('');
      setRepairPackages(
        (packagesRes ?? []).map((p) => ({
          id: p.id,
          title: p.title ?? null,
          formData: (p.formData ?? {}) as Record<string, unknown>,
          crmContract: p.crmContract
            ? {
                contractNumber: p.crmContract.contractNumber,
                contractDate: p.crmContract.contractDate,
              }
            : null,
        }))
      );
      const normalizedTemplates = templates.map((it) => ({
        ...it,
        tabId: normalizeTemplateTabId(it.tabId),
      }));
      setContractTemplatePresets(normalizedTemplates);
      const selectedIds = { ...templatePresetIds };
      if (contractTemplateId && !selectedIds.contract) {
        selectedIds.contract = contractTemplateId;
      }
      for (const tab of TEMPLATE_TAB_IDS) {
        if (!selectedIds[tab]) {
          const tabItems = normalizedTemplates.filter(
            (it) => normalizeTemplateTabId(it.tabId) === tab
          );
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
      if (persistContractDate) {
        try {
          await updateContractDocumentPackage(packageId, {
            title: row.title?.trim() || null,
            formData: buildPersistedFormData(formPayload, overridesSansContract, selectedIds),
            crmContractId: row.crmContractId ?? null,
          });
          setRepairPackages((prev) =>
            prev.map((p) =>
              p.id === packageId
                ? {
                    ...p,
                    formData: buildPersistedFormData(
                      formPayload,
                      overridesSansContract,
                      selectedIds
                    ) as Record<string, unknown>,
                  }
                : p
            )
          );
        } catch {
          /* оставляем дату в форме; пользователь сможет сохранить вручную */
        }
      }
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshEstimateListsFromServer = useCallback(async () => {
    setEstimateDataRefreshing(true);
    setError(null);
    try {
      const [estimateRes, packagesRes] = await Promise.all([
        getContractDocumentEstimatePresets('REPAIR').catch(() => ({
          items: [] as ContractEstimatePreset[],
          groups: [] as ContractEstimateGroup[],
          updatedAt: null as string | null,
        })),
        getContractDocumentPackages('REPAIR').catch(() => []),
      ]);
      setEstimatePresets(estimateRes.items ?? []);
      setEstimateGroups(estimateRes.groups ?? []);
      setRepairPackages(
        (packagesRes ?? []).map((p) => ({
          id: p.id,
          title: p.title ?? null,
          formData: (p.formData ?? {}) as Record<string, unknown>,
          crmContract: p.crmContract
            ? {
                contractNumber: p.crmContract.contractNumber,
                contractDate: p.crmContract.contractDate,
              }
            : null,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось обновить списки расчётов');
    } finally {
      setEstimateDataRefreshing(false);
    }
  }, []);

  const searchContracts = useCallback(async (q: string) => {
    setContractsLoading(true);
    try {
      const res = await getContracts({
        search: q.trim() || undefined,
        limit: 25,
        page: 1,
      });
      setContractResults(res.data);
    } catch {
      setContractResults([]);
    } finally {
      setContractsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void searchContracts(contractQuery);
    }, 350);
    return () => window.clearTimeout(t);
  }, [contractQuery, searchContracts]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateContractDocumentPackage(packageId, {
        title: draftTitle.trim() || null,
        formData: buildPersistedFormData(form, templateOverrides, selectedTemplateIds),
        crmContractId: draftCrmContractId,
      });
      setDirty(false);
      setIsSaveSuccessModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handlePullFromCrm = async () => {
    if (!draftCrmContractId) return;
    setError(null);
    try {
      const c = await getContract(draftCrmContractId);
      setForm((prev) => mergeRepairFormFromCrmContract(c, prev));
      setDirty(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить договор CRM');
    }
  };

  const updateCustomer = <K extends keyof RepairPackageFormData['customer']>(
    key: K,
    value: string
  ) => {
    setForm((p) => {
      const nextCustomer = { ...p.customer, [key]: value };
      if (key === 'type') {
        const nextType = value as RepairPackageFormData['customer']['type'];
        if (nextType === 'PERSON') {
          nextCustomer.organizationName = '';
          nextCustomer.representativeFullNameNominative = '';
          nextCustomer.representativeFullNameGenitive = '';
          nextCustomer.representativePositionNominative = '';
          nextCustomer.representativePositionGenitive = '';
          nextCustomer.inn = '';
          nextCustomer.ogrn = '';
        } else {
          nextCustomer.fullName = '';
          nextCustomer.passportSeriesNumber = '';
          nextCustomer.passportIssuedBy = '';
          nextCustomer.passportIssueDate = '';
        }
      }
      return { ...p, customer: nextCustomer };
    });
    setDirty(true);
  };

  const updateExecutor = <K extends keyof RepairPackageFormData['executor']>(
    key: K,
    value: string
  ) => {
    setForm((p) => {
      let nextExecutor = { ...p.executor, [key]: value } as RepairPackageFormData['executor'];
      if (key === 'executorKind') {
        if (value === 'ENTREPRENEUR') {
          nextExecutor = { ...nextExecutor, kpp: '', ogrn: '' };
        } else {
          nextExecutor = { ...nextExecutor, ogrnip: '' };
        }
      }
      // Keep legacy placeholder value in sync for old templates.
      if (key === 'directorNameNominative') {
        nextExecutor.directorName = value;
      }
      return { ...p, executor: nextExecutor };
    });
    setDirty(true);
  };

  const applyExecutorProfile = (title: string) => {
    setForm((p) => {
      const profile = executorProfiles.find((it) => it.title === title);
      if (!profile) {
        return { ...p, executor: { ...p.executor, selectedProfileTitle: '' } };
      }
      const kind = profile.kind === 'ENTREPRENEUR' ? 'ENTREPRENEUR' : 'COMPANY';
      return {
        ...p,
        executor: {
          ...p.executor,
          selectedProfileTitle: title,
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
        },
      };
    });
    setDirty(true);
  };

  const applySignatoryProfile = (title: string) => {
    setForm((p) => {
      const profile = signatoryProfiles.find((it) => it.title === title);
      if (!profile) {
        return { ...p, executor: { ...p.executor, selectedSignatoryProfileTitle: '' } };
      }
      return {
        ...p,
        executor: {
          ...p.executor,
          selectedSignatoryProfileTitle: title,
          signatoryCrmUserId: profile.crmUserId ?? '',
          directorNameNominative: profile.directorNameNominative ?? '',
          directorNameGenitive: profile.directorNameGenitive ?? '',
          directorName: profile.directorNameNominative ?? '',
          basis: profile.basis ?? '',
          salesOffice: profile.salesOffice ?? '',
          officePhone: profile.officePhone ?? '',
        },
      };
    });
    setDirty(true);
  };

  const updateObject = <K extends keyof RepairPackageFormData['object']>(key: K, value: string) => {
    setForm((p) => ({ ...p, object: { ...p.object, [key]: value } }));
    setDirty(true);
  };

  const updateContract = <K extends keyof RepairPackageFormData['contract']>(
    key: K,
    value: string
  ) => {
    setForm((p) => {
      const nextContract = { ...p.contract, [key]: value };
      if (key === 'totalAmount') {
        nextContract.totalAmountWords = amountToRussianWords(value);
        const parsedAmount = parseDecimalAmount(value);
        nextContract.recommendedPrepayment =
          parsedAmount === null ? '' : formatMoneyValue(parsedAmount * 0.7);
      }
      return { ...p, contract: nextContract };
    });
    setDirty(true);
  };

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
      const estimateRaw = (pkg.formData?.estimate ?? null) as Record<string, unknown> | null;
      const ids: string[] = [];
      if (estimateRaw && typeof estimateRaw.selectedPresetId === 'string') {
        const legacy = estimateRaw.selectedPresetId.trim();
        if (legacy) ids.push(legacy);
      }
      if (estimateRaw && Array.isArray(estimateRaw.selectedPresetIds)) {
        for (const id of estimateRaw.selectedPresetIds) {
          if (typeof id === 'string' && id.trim()) ids.push(id.trim());
        }
      }
      const uniqueIds = [...new Set(ids)];
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
    return estimatePresets.filter((preset) => {
      if (selected.has(preset.id)) return false;
      return (estimateUsageById.get(preset.id)?.length ?? 0) === 0;
    });
  }, [estimatePresets, estimateUsageById, form.estimate.selectedPresetIds]);

  const attachEstimatePickMeta = useMemo(() => {
    const hasUngrouped = attachableEstimatePresets.some((p) => !p.groupId);
    const groupIdsWithAttachable = new Set(
      attachableEstimatePresets.map((p) => p.groupId).filter((id): id is string => Boolean(id))
    );
    const groupsOrdered = [...estimateGroups]
      .filter((g) => groupIdsWithAttachable.has(g.id))
      .sort((a, b) => a.title.localeCompare(b.title, 'ru'));
    return { hasUngrouped, groupsOrdered };
  }, [attachableEstimatePresets, estimateGroups]);

  const attachableForSelectedGroup = useMemo(() => {
    if (!estimateAttachGroupKey) return [];
    if (estimateAttachGroupKey === '__ungrouped__') {
      return attachableEstimatePresets.filter((p) => !p.groupId);
    }
    return attachableEstimatePresets.filter((p) => p.groupId === estimateAttachGroupKey);
  }, [estimateAttachGroupKey, attachableEstimatePresets]);

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
      const snapshot = preset.snapshot ?? parseEstimateSnapshotFromDraft(preset.calculatorDraft);
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
  }, [form.estimate.selectedPresetIds, estimatePresets]);

  const estimateAppendixContractRef = useMemo(() => {
    const num = form.contract.number.trim() || '—';
    const raw = form.contract.date.trim();
    const date = !raw ? '—' : contractDateToDdMmYyyy(raw) || raw;
    return { num, date };
  }, [form.contract.number, form.contract.date]);

  const applyEstimatePresetIdsToForm = (presetIds: string[]) => {
    setForm((p) => {
      const uniqueIds = [...new Set(presetIds.filter(Boolean))];
      const nextForm = applyEstimatePresetIdsToRepairForm(p, uniqueIds, estimatePresets);
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

  const renderedDoc = useMemo(() => {
    if (activeTab === 'data') return '';
    const tab = activeTab as RepairDocumentTemplateTabId;
    let tpl: string;
    if (tab === 'contract') {
      tpl =
        isSuperAdmin && contractDocView === 'edit'
          ? contractTemplateSource
          : resolveTemplateHtml('contract');
    } else {
      tpl = templateOverrides[tab] ?? resolveTemplateHtml(tab);
    }
    return applyTemplate(tpl, repairPackageFormForTemplate(formMergedForTemplate));
  }, [
    activeTab,
    formMergedForTemplate,
    templateOverrides,
    resolveTemplateHtml,
    isSuperAdmin,
    contractDocView,
    contractTemplateSource,
  ]);

  const persistContractTemplatePresets = async (items: ContractTemplatePreset[]) => {
    setTemplateSaving(true);
    setError(null);
    try {
      await putContractDocumentTemplatePresets({ kind: 'REPAIR', items });
      setContractTemplatePresets(
        items.map((it) => ({ ...it, tabId: normalizeTemplateTabId(it.tabId) }))
      );
      setExcelMessage('Шаблоны договора сохранены.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблоны договора');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleContractTemplateChange = (value: string) => {
    setTemplateDraftHtml(value);
  };

  const handleEditTemplateSelect = (templateId: string) => {
    setEditingTemplateId(templateId);
    const t = contractTemplatePresets.find((it) => it.id === templateId);
    setTemplateDraftTitle(t?.title ?? '');
    setTemplateDraftHtml(t?.html ?? '');
  };

  const handleSaveTemplateDraft = async () => {
    if (!isSuperAdmin) return;
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
                (it) => normalizeTemplateTabId(it.tabId) === currentTab
              ).length === 0,
          },
        ];
    await persistContractTemplatePresets(finalItems);
    setEditingTemplateId(id);
    setSelectedTemplateIds((p) => ({ ...p, [currentTab]: p[currentTab] || id }));
  };

  const handleCreateTemplate = (mode: 'blank' | 'copy') => {
    if (!isSuperAdmin) return;
    const sourceHtml = mode === 'copy' ? contractTemplateSource : '<div class="docPrint"></div>';
    const id = `tpl_${Date.now()}`;
    setEditingTemplateId(id);
    setTemplateDraftTitle(mode === 'copy' ? 'Копия шаблона' : 'Новый шаблон');
    setTemplateDraftHtml(sourceHtml);
  };

  const handleDeleteTemplate = async () => {
    if (!isSuperAdmin || !editingTemplateId) return;
    const next = contractTemplatePresets.filter((it) => it.id !== editingTemplateId);
    await persistContractTemplatePresets(next);
    const fallbackId = next.find((it) => it.isDefault)?.id ?? next[0]?.id ?? '';
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
    const next = contractTemplatePresets.map((it) => ({
      ...it,
      isDefault: it.id === editingTemplateId,
    }));
    await persistContractTemplatePresets(next);
  };

  const insertContractPlaceholder = (path: string) => {
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
      content: '<hr style="border: 0; border-top: 1px solid #999; margin: 12pt 0;" />',
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
<table class="contractRequisitesBlock" style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid #bbb;">
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
<blockquote style="margin: 8pt 0; padding: 8pt 10pt; border-left: 3px solid #94a3b8; background: #f8fafc;">
  <p style="margin: 0; font-style: italic;">Текст примечания / важного условия.</p>
</blockquote>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const insertSimpleTable = () => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin: 8pt 0;">
  <tr>
    <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Пункт</th>
    <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Содержание</th>
  </tr>
  <tr>
    <td style="border: 1px solid #cbd5e1; padding: 6px;">1</td>
    <td style="border: 1px solid #cbd5e1; padding: 6px;">Описание</td>
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
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid #bbb;">
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
    const t = contractTemplatePresets.find((it) => it.id === editingTemplateId);
    setTemplateDraftTitle(t?.title ?? '');
    setTemplateDraftHtml(t?.html ?? '');
    setExcelMessage(null);
  };

  const handlePrint = () => {
    if (activeTab === 'estimate') {
      if (!estimatePrintSheetRef.current) return;
      document.body.classList.add(BODY_PRINT_ESTIMATE_CLASS);
      const cleanup = (): void => {
        document.body.classList.remove(BODY_PRINT_ESTIMATE_CLASS);
      };
      window.addEventListener('afterprint', cleanup, { once: true });
      window.setTimeout(cleanup, 120_000);
      window.print();
      return;
    }
    if (!renderedDoc) return;
    const printTitle = activeTab === 'contract' ? '' : REPAIR_DOCUMENT_TAB_LABELS[activeTab];
    printDocumentHtml(renderedDoc, printTitle, {
      marginFooter: pickPrintMarginFooterNames(formMergedForTemplate),
    });
  };

  useEffect(() => {
    if (activeTab !== 'contract') {
      setContractDocView('preview');
    }
  }, [activeTab]);

  useEffect(() => {
    if (contractDocView !== 'edit') {
      setFormatToolbarLevel('basic');
    }
  }, [contractDocView]);

  useEffect(() => {
    setShowAllFormatTools(false);
    setFormatToolbarQuery('');
  }, [formatToolbarLevel]);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Загрузка…</p>
      </div>
    );
  }

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

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <div className={`${styles.editorHeader} ${styles.blockHeader}`}>
        <div>
          <Link className={styles.backLink} href="/admin/contract-documents/repair">
            ← К списку (Ремонт)
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            Пакет документов
          </h1>
          <p className={styles.subtitle} style={{ marginBottom: 0 }}>
            ID: {packageId}
            {draftCrmContractId ? (
              <>
                {' '}
                ·{' '}
                <Link className={styles.link} href={`/admin/crm/contracts/${draftCrmContractId}`}>
                  Договор в CRM
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className={styles.headerActions}>
          <input
            type="text"
            placeholder="Название черновика"
            value={draftTitle}
            onChange={(e) => {
              setDraftTitle(e.target.value);
              setDirty(true);
              schedulePersistRepairPackageDebounced();
            }}
            className={styles.draftTitleInput}
          />
          <div className={styles.headerButtonsRow}>
            {activeTab !== 'data' ? (
              <button type="button" className={styles.secondaryBtn} onClick={handlePrint}>
                Печать
              </button>
            ) : null}
            {activeTab === 'data' ? (
              <button
                type="button"
                className={styles.primaryBtn}
                disabled={saving || !dirty}
                onClick={() => void handleSave()}
              >
                {saving ? 'Сохранение…' : dirty ? 'Сохранить' : 'Сохранено'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {excelMessage ? <p className={styles.hint}>{excelMessage}</p> : null}
      {isSaveSuccessModalOpen ? (
        <div className={styles.saveModalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.saveModalCard}>
            <h3 className={styles.saveModalTitle}>Сохранено</h3>
            <p className={styles.saveModalText}>Изменения успешно сохранены.</p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setIsSaveSuccessModalOpen(false)}
            >
              Ок
            </button>
          </div>
        </div>
      ) : null}

      <div className={`${styles.tabBar} ${styles.blockTabs}`} role="tablist">
        {REPAIR_DOCUMENT_TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(id)}
          >
            {REPAIR_DOCUMENT_TAB_LABELS[id]}
          </button>
        ))}
      </div>

      {activeTab === 'data' ? (
        <div className={`${styles.blockData} ${styles.dataCompact}`}>
          <div className={styles.formGrid}>
            <div className={styles.dataTopRow}>
              <div className={styles.dataTopBlock}>
                <h3 className={styles.sectionTitle}>Связь с CRM</h3>
                <div
                  className={`${styles.field} ${styles.crmCompactField} ${styles.crmCompactBox}`}
                >
                  <label htmlFor="crm_search">Найти договор (№, ФИО, телефон)</label>
                  <input
                    id="crm_search"
                    value={contractQuery}
                    onChange={(e) => setContractQuery(e.target.value)}
                    placeholder="Начните вводить для поиска…"
                  />
                  <p className={styles.hint} style={{ marginTop: 2 }}>
                    {contractsLoading ? 'Поиск…' : `Найдено: ${contractResults.length}`}
                  </p>
                  {contractResults.length > 0 ? (
                    <ul className={styles.crmResultsList}>
                      {contractResults.map((c) => (
                        <li key={c.id} className={styles.crmResultItem}>
                          <button
                            type="button"
                            className={`${styles.secondaryBtn} ${styles.crmResultBtn}`}
                            onClick={() => {
                              setDraftCrmContractId(c.id);
                              setDirty(true);
                            }}
                          >
                            № {c.contractNumber} · {c.customerName || '—'}{' '}
                            {draftCrmContractId === c.id ? '(выбран)' : ''}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div
                  className={`${styles.field} ${styles.crmCompactField} ${styles.crmCompactBox}`}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                >
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={!draftCrmContractId}
                    onClick={() => void handlePullFromCrm()}
                  >
                    Подставить данные из CRM в форму
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={!draftCrmContractId}
                    onClick={() => {
                      setDraftCrmContractId(null);
                      setDirty(true);
                    }}
                  >
                    Отвязать договор
                  </button>
                  {draftCrmContractId ? (
                    <Link
                      className={styles.secondaryBtn}
                      href={`/admin/crm/contracts/${draftCrmContractId}`}
                    >
                      Открыть карточку в CRM
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className={`${styles.dataTopBlock} ${styles.contractCompactBlock}`}>
                <h3 className={styles.sectionTitle}>Договор (реквизиты для подстановки)</h3>
                <div className={styles.contractInlineRow}>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="cn">Номер договора</label>
                    <input
                      id="cn"
                      value={form.contract.number}
                      onChange={(e) => updateContract('number', e.target.value)}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="cd">Дата договора (дд.мм.гггг)</label>
                    <input
                      id="cd"
                      value={form.contract.date}
                      onChange={(e) => updateContract('date', e.target.value)}
                      placeholder="дд.мм.гггг"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className={`${styles.contractInlineRow} ${styles.contractAmountsRow}`}>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="cta">Сумма договора (цифрами)</label>
                    <input
                      id="cta"
                      value={form.contract.totalAmount}
                      readOnly
                      className={styles.autoFilledInput}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="ctaw">Сумма прописью</label>
                    <input
                      id="ctaw"
                      className={styles.autoFilledInput}
                      value={form.contract.totalAmountWords}
                      onChange={(e) => updateContract('totalAmountWords', e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.contractInlineRow}>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="crp">Рекомендованная предоплата (70%)</label>
                    <input
                      id="crp"
                      className={styles.autoFilledInput}
                      value={form.contract.recommendedPrepayment}
                      readOnly
                    />
                  </div>
                </div>
                <div className={styles.contractInlineRow}>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="prep">Аванс / предоплата</label>
                    <input
                      id="prep"
                      value={form.contract.prepaymentAmount}
                      onChange={(e) => updateContract('prepaymentAmount', e.target.value)}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="wp">Сроки / период работ</label>
                    <input
                      id="wp"
                      value={form.contract.workPeriod}
                      onChange={(e) => updateContract('workPeriod', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.sectionCard} ${styles.sectionCustomer}`}>
              <h3 className={styles.sectionTitle}>Заказчик</h3>
              <div className={styles.sectionFields}>
                <div className={styles.field}>
                  <label htmlFor="c_type">Тип заказчика</label>
                  <select
                    id="c_type"
                    value={form.customer.type}
                    onChange={(e) =>
                      updateCustomer(
                        'type',
                        e.target.value as RepairPackageFormData['customer']['type']
                      )
                    }
                  >
                    <option value="PERSON">Физлицо</option>
                    <option value="COMPANY">ЮЛ</option>
                    <option value="ENTREPRENEUR">ИП</option>
                  </select>
                </div>
                {form.customer.type === 'PERSON' ? (
                  <div className={styles.field}>
                    <label htmlFor="c_fullName">ФИО</label>
                    <input
                      id="c_fullName"
                      value={form.customer.fullName}
                      onChange={(e) => updateCustomer('fullName', e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="c_repFullNameNom">ФИО представителя (именительный)</label>
                      <input
                        id="c_repFullNameNom"
                        value={form.customer.representativeFullNameNominative}
                        onChange={(e) =>
                          updateCustomer('representativeFullNameNominative', e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_repFullNameGen">ФИО представителя (родительный)</label>
                      <input
                        id="c_repFullNameGen"
                        value={form.customer.representativeFullNameGenitive}
                        onChange={(e) =>
                          updateCustomer('representativeFullNameGenitive', e.target.value)
                        }
                      />
                    </div>
                  </>
                )}
                {form.customer.type !== 'PERSON' ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="c_orgName">Наименование организации</label>
                      <input
                        id="c_orgName"
                        value={form.customer.organizationName}
                        onChange={(e) => updateCustomer('organizationName', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_posNom">Должность представителя (именительный)</label>
                      <input
                        id="c_posNom"
                        value={form.customer.representativePositionNominative}
                        onChange={(e) =>
                          updateCustomer('representativePositionNominative', e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_posGen">Должность представителя (родительный)</label>
                      <input
                        id="c_posGen"
                        value={form.customer.representativePositionGenitive}
                        onChange={(e) =>
                          updateCustomer('representativePositionGenitive', e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_inn">ИНН</label>
                      <input
                        id="c_inn"
                        value={form.customer.inn}
                        onChange={(e) => updateCustomer('inn', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_ogrn">ОГРН</label>
                      <input
                        id="c_ogrn"
                        value={form.customer.ogrn}
                        onChange={(e) => updateCustomer('ogrn', e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
                <div className={styles.field}>
                  <label htmlFor="c_address">Адрес</label>
                  <input
                    id="c_address"
                    value={form.customer.address}
                    onChange={(e) => updateCustomer('address', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="c_phone">Телефон</label>
                  <input
                    id="c_phone"
                    value={form.customer.phone}
                    onChange={(e) => updateCustomer('phone', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="c_email">E-mail</label>
                  <input
                    id="c_email"
                    value={form.customer.email}
                    onChange={(e) => updateCustomer('email', e.target.value)}
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldSpanAll}`}>
                  <label htmlFor="c_bank_details">Банковские реквизиты</label>
                  <textarea
                    id="c_bank_details"
                    value={form.customer.bankDetails}
                    onChange={(e) => updateCustomer('bankDetails', e.target.value)}
                  />
                </div>
                {form.customer.type === 'PERSON' ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="c_passport">Паспорт (серия и номер)</label>
                      <input
                        id="c_passport"
                        value={form.customer.passportSeriesNumber}
                        onChange={(e) => updateCustomer('passportSeriesNumber', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_passportBy">Кем выдан</label>
                      <input
                        id="c_passportBy"
                        value={form.customer.passportIssuedBy}
                        onChange={(e) => updateCustomer('passportIssuedBy', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_passportDate">Дата выдачи</label>
                      <input
                        id="c_passportDate"
                        value={form.customer.passportIssueDate}
                        onChange={(e) => updateCustomer('passportIssueDate', e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className={`${styles.sectionCard} ${styles.sectionExecutor}`}>
              <h3 className={styles.sectionTitle}>Исполнитель</h3>
              <div className={styles.sectionFields}>
                <div className={styles.field}>
                  <label htmlFor="e_profile">Наши реквизиты (из справочника)</label>
                  <select
                    id="e_profile"
                    value={form.executor.selectedProfileTitle}
                    onChange={(e) => applyExecutorProfile(e.target.value)}
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
                  <label htmlFor="e_exec_kind">Тип исполнителя</label>
                  <select
                    id="e_exec_kind"
                    value={form.executor.executorKind}
                    onChange={(e) => updateExecutor('executorKind', e.target.value)}
                  >
                    <option value="COMPANY">Юридическое лицо (ЮЛ)</option>
                    <option value="ENTREPRENEUR">Индивидуальный предприниматель (ИП)</option>
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_company">Наименование организации</label>
                  <input
                    id="e_company"
                    value={form.executor.companyName}
                    onChange={(e) => updateExecutor('companyName', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_inn">ИНН</label>
                  <input
                    id="e_inn"
                    value={form.executor.inn}
                    onChange={(e) => updateExecutor('inn', e.target.value)}
                  />
                </div>
                {form.executor.executorKind === 'COMPANY' ? (
                  <div className={styles.field}>
                    <label htmlFor="e_kpp">КПП</label>
                    <input
                      id="e_kpp"
                      value={form.executor.kpp}
                      onChange={(e) => updateExecutor('kpp', e.target.value)}
                    />
                  </div>
                ) : null}
                {form.executor.executorKind === 'COMPANY' ? (
                  <div className={styles.field}>
                    <label htmlFor="e_ogrn">ОГРН</label>
                    <input
                      id="e_ogrn"
                      value={form.executor.ogrn}
                      onChange={(e) => updateExecutor('ogrn', e.target.value)}
                    />
                  </div>
                ) : (
                  <div className={styles.field}>
                    <label htmlFor="e_ogrnip">ОГРНИП</label>
                    <input
                      id="e_ogrnip"
                      value={form.executor.ogrnip}
                      onChange={(e) => updateExecutor('ogrnip', e.target.value)}
                    />
                  </div>
                )}
                <div className={styles.field}>
                  <label htmlFor="e_email">E-mail</label>
                  <input
                    id="e_email"
                    type="email"
                    autoComplete="email"
                    value={form.executor.email}
                    onChange={(e) => updateExecutor('email', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_legal">Юридический адрес</label>
                  <textarea
                    id="e_legal"
                    value={form.executor.legalAddress}
                    onChange={(e) => updateExecutor('legalAddress', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_actual">Адрес для корреспонденции</label>
                  <textarea
                    id="e_actual"
                    value={form.executor.actualAddress}
                    onChange={(e) => updateExecutor('actualAddress', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_bank">Банковские реквизиты</label>
                  <textarea
                    id="e_bank"
                    value={form.executor.bankDetails}
                    onChange={(e) => updateExecutor('bankDetails', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={`${styles.sectionCard} ${styles.sectionExecutor}`}>
              <h3 className={styles.sectionTitle}>Подписант</h3>
              <div className={styles.sectionFields}>
                <div className={styles.field}>
                  <label htmlFor="s_profile">Карточка подписанта (из справочника)</label>
                  <select
                    id="s_profile"
                    value={form.executor.selectedSignatoryProfileTitle}
                    onChange={(e) => applySignatoryProfile(e.target.value)}
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
                  <label htmlFor="e_directorNom">Подписант (именительный падеж)</label>
                  <input
                    id="e_directorNom"
                    value={form.executor.directorNameNominative}
                    onChange={(e) => updateExecutor('directorNameNominative', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_directorGen">Подписант (родительный падеж)</label>
                  <input
                    id="e_directorGen"
                    value={form.executor.directorNameGenitive}
                    onChange={(e) => updateExecutor('directorNameGenitive', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_basis">Действует на основании</label>
                  <input
                    id="e_basis"
                    value={form.executor.basis}
                    onChange={(e) => updateExecutor('basis', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_sales_office">Офис продаж</label>
                  <input
                    id="e_sales_office"
                    value={form.executor.salesOffice}
                    onChange={(e) => updateExecutor('salesOffice', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_office_phone">Телефон офиса</label>
                  <input
                    id="e_office_phone"
                    value={form.executor.officePhone}
                    onChange={(e) => updateExecutor('officePhone', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={`${styles.sectionCard} ${styles.sectionObject}`}>
              <h3 className={styles.sectionTitle}>Объект</h3>
              <div className={`${styles.sectionFields} ${styles.objectSectionFields}`}>
                <div className={styles.field}>
                  <label htmlFor="o_addr">Адрес объекта</label>
                  <input
                    id="o_addr"
                    value={form.object.objectAddress}
                    onChange={(e) => updateObject('objectAddress', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="o_floor">Этаж</label>
                  <input
                    id="o_floor"
                    value={form.object.objectFloor}
                    onChange={(e) => updateObject('objectFloor', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="o_desc">Описание работ / объекта</label>
                  <textarea
                    id="o_desc"
                    value={form.object.objectDescription}
                    onChange={(e) => updateObject('objectDescription', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className={styles.hint}>
            Полная инструкция:{' '}
            <Link className={styles.link} href="/admin/contract-documents/instruction">
              Оформление договоров → Инструкция
            </Link>
            . На вкладке «Договор» можно править HTML и вставлять плейсхолдеры.
          </p>
        </div>
      ) : activeTab === 'estimate' ? (
        <div className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact}`}>
          <div className={styles.formGrid}>
            <div className={styles.sectionCard}>
              <div className={styles.estimateSectionHeader}>
                <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>Смета</h3>
                <div className={styles.headerButtonsRow}>
                  <button
                    type="button"
                    className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn}`}
                    disabled={saving || estimateDataRefreshing}
                    aria-busy={estimateDataRefreshing}
                    aria-label={
                      estimateDataRefreshing
                        ? 'Обновление списков расчётов'
                        : 'Обновить списки расчётов'
                    }
                    title="Обновить"
                    onClick={() => void refreshEstimateListsFromServer()}
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
                      className={
                        estimateDataRefreshing ? styles.estimatesRefreshIconSpinning : undefined
                      }
                      aria-hidden
                    >
                      <path d="M23 4v6h-6" />
                      <path d="M1 20v-6h6" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className={styles.sectionFields}>
                <div className={`${styles.estimatePickAndAttachedRow} ${styles.fieldSpanAll}`}>
                  <div className={styles.estimatePickColumn}>
                    <div className={styles.estimateSelectsRow}>
                      <div className={styles.field}>
                        <label htmlFor="estimate_group_select">Объект</label>
                        <select
                          id="estimate_group_select"
                          value={estimateAttachGroupKey}
                          onChange={(e) => {
                            setEstimateAttachGroupKey(e.target.value);
                            setEstimatePresetToAttach('');
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
                          disabled={!estimateAttachGroupKey}
                          onChange={(e) => setEstimatePresetToAttach(e.target.value)}
                        >
                          <option value="">
                            {!estimateAttachGroupKey ? '— сначала объект —' : '— расчёт —'}
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
                          disabled={!estimatePresetToAttach}
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
                          Объект → расчёт → «Прикрепить». Справа — порядок в смете (перетаскивание).
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
                              draggable
                              onDragStart={() => setDraggingEstimatePresetId(presetId)}
                              onDragEnd={() => setDraggingEstimatePresetId(null)}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
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
                          <p className={styles.estimateA4Total}>
                            Итого по смете:{' '}
                            <strong>{formatMoneyValue(form.estimate.snapshot.total)} руб.</strong>
                          </p>
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
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'contract' ? (
            <div className={styles.estimateA4Wrap}>
              <article className={styles.estimateA4Sheet}>
                <div
                  className={styles.contractA4Preview}
                  dangerouslySetInnerHTML={{ __html: renderedDoc }}
                />
              </article>
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
