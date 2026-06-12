'use client';

import { useCallback } from 'react';

import {
  type ContractDocumentPackageKind,
  type ContractDocumentPackageStatus,
  type ContractDocumentPackageVersionListItem,
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
import type { InstallerMaster } from '@/shared/api/admin-crm';
import { getInstallers } from '@/shared/api/admin-crm';
import { listPackagePaymentInvoices } from '@/shared/api/admin-payment-invoices';
import { normalizeExecutorRequisiteProfile } from '@/views/admin/ContractDocuments/packages/platform/form/executorBankFields';

import {
  contractDateToDdMmYyyy,
  todayContractDateDdMmYyyy,
} from '../../../../core/contractDateFormat';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import {
  DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
  normalizeWindowsWorkOrderMarkupPercent,
} from '../../../families/product-like/print/productWorkOrder';
import {
  packageContractSettingsKind,
  packageExecutorProfilesKind,
  packageSignatoryProfilesKind,
} from '../../catalogKinds';
import {
  type PackageContractObjectBlockFieldId,
  snapshotPackageContractObjectBlockFields,
} from '../../editor/shared/packageContractObjectBlock';
import {
  PACKAGE_TEMPLATE_TAB_IDS as TEMPLATE_TAB_IDS,
  normalizePackageContractTemplatePreset as normalizeContractTemplatePreset,
  normalizePackageTemplateTabId as normalizeTemplateTabId,
} from '../../editor/template/packageTemplateTabUtils';
import {
  applyEstimatePresetIdsToAddendumSlot,
  applyEstimatePresetIdsToPackageForm,
} from '../../estimates/applyEstimatePresetIds';
import { estimatePresetsCatalogKind } from '../../estimates/estimatePresetsCatalogKind';
import {
  DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
  DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
  resolvePackageWorkPeriodForForm,
} from '../../form/contractWorkPeriod';
import {
  type PackageDocumentTemplateTabId,
  buildPersistedFormData,
  mergeFormDataFromStorage,
} from '../../form/formDataTemplateStorage';
import {
  type PackageFormData,
  applyOpenAddendumDocumentDateAutofill,
} from '../../form/packageForm';
import {
  hydrateManagerQuestionnaire1FromLinkedCrmCustomer,
  parseLinkedCrmCustomerIdFromFormData,
} from '../../questionnaires/crmManagerQuestionnaire1';

export type PackageDocumentLoadSetters = {
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setPackageRefreshing: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setPackageVersions: React.Dispatch<
    React.SetStateAction<ContractDocumentPackageVersionListItem[]>
  >;
  setPackageKind: React.Dispatch<React.SetStateAction<ContractDocumentPackageKind>>;
  setWindowsWorkOrderMarkupPercent: React.Dispatch<React.SetStateAction<number>>;
  setPaymentInvoiceCount: React.Dispatch<React.SetStateAction<number>>;
  setDraftTitle: React.Dispatch<React.SetStateAction<string>>;
  setPackageFlowStatus: React.Dispatch<React.SetStateAction<ContractDocumentPackageStatus>>;
  setLinkedCrmCustomerId: React.Dispatch<React.SetStateAction<string | null>>;
  setForm: React.Dispatch<React.SetStateAction<PackageFormData>>;
  setContractObjectBlockBaseline: React.Dispatch<
    React.SetStateAction<Record<PackageContractObjectBlockFieldId, string> | null>
  >;
  setTemplateOverrides: React.Dispatch<
    React.SetStateAction<Partial<Record<PackageDocumentTemplateTabId, string>>>
  >;
  setExecutorProfiles: React.Dispatch<React.SetStateAction<ExecutorRequisiteProfile[]>>;
  setSignatoryProfiles: React.Dispatch<React.SetStateAction<ContractSignatoryProfile[]>>;
  setEstimatePresets: React.Dispatch<React.SetStateAction<ContractEstimatePreset[]>>;
  setContractInstallers: React.Dispatch<React.SetStateAction<InstallerMaster[]>>;
  setEstimateGroups: React.Dispatch<React.SetStateAction<ContractEstimateGroup[]>>;
  setEstimateAttachGroupKey: React.Dispatch<React.SetStateAction<string>>;
  setEstimatePresetToAttach: React.Dispatch<React.SetStateAction<string>>;
  setWorkspacePackages: React.Dispatch<
    React.SetStateAction<
      Array<{ id: string; title: string | null; formData: Record<string, unknown> }>
    >
  >;
  setContractTemplatePresets: React.Dispatch<React.SetStateAction<ContractTemplatePreset[]>>;
  setSelectedTemplateIds: React.Dispatch<
    React.SetStateAction<Partial<Record<PackageDocumentTemplateTabId, string>>>
  >;
  setEditingTemplateId: React.Dispatch<React.SetStateAction<string>>;
  setTemplateDraftTitle: React.Dispatch<React.SetStateAction<string>>;
  setTemplateDraftHtml: React.Dispatch<React.SetStateAction<string>>;
  setExcelMessage: React.Dispatch<React.SetStateAction<string | null>>;
  setDirty: React.Dispatch<React.SetStateAction<boolean>>;
};

export type UsePackageDocumentLoadOptions = {
  packageId: string;
  formRef: React.MutableRefObject<PackageFormData>;
  refreshPackageVersions: (opts?: { skipSpinner?: boolean }) => Promise<void>;
  flushPersistDebounced: () => Promise<void>;
  setters: PackageDocumentLoadSetters;
};

export function usePackageDocumentLoad({
  packageId,
  formRef,
  refreshPackageVersions,
  flushPersistDebounced,
  setters,
}: UsePackageDocumentLoadOptions) {
  const {
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
    setContractInstallers,
    setEstimateGroups,
    setEstimateAttachGroupKey,
    setEstimatePresetToAttach,
    setWorkspacePackages,
    setContractTemplatePresets,
    setSelectedTemplateIds,
    setEditingTemplateId,
    setTemplateDraftTitle,
    setTemplateDraftHtml,
    setExcelMessage,
    setDirty,
  } = setters;

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
        const row = await getContractDocumentPackage(packageId);
        const currentKind = row.kind;
        const profilesKind = packageExecutorProfilesKind(currentKind);
        const signatoriesKind = packageSignatoryProfilesKind(currentKind);
        const estimatePresetsKind = estimatePresetsCatalogKind(currentKind);
        const [
          profilesRes,
          signatoryRes,
          templateRes,
          estimateRes,
          packagesRes,
          installersRes,
          packageSettingsRes,
          paymentInvoicesRes,
        ] = await Promise.all([
          getContractDocumentExecutorProfiles(profilesKind).catch(() => ({
            items: [] as ExecutorRequisiteProfile[],
            updatedAt: null as string | null,
          })),
          getContractDocumentSignatoryProfiles(signatoriesKind).catch(() => ({
            items: [] as ContractSignatoryProfile[],
            updatedAt: null as string | null,
          })),
          getContractDocumentTemplatePresets(currentKind).catch(() => ({
            items: [] as ContractTemplatePreset[],
            updatedAt: null as string | null,
          })),
          getContractDocumentEstimatePresets(estimatePresetsKind).catch(() => ({
            items: [] as ContractEstimatePreset[],
            groups: [],
            updatedAt: null as string | null,
          })),
          getContractDocumentPackages(currentKind).catch(() => []),
          getInstallers().catch(() => [] as InstallerMaster[]),
          (packageContractSettingsKind(currentKind) === 'WINDOWS'
            ? getContractDocumentWindowsSettings()
            : getContractDocumentRepairSettings()
          ).catch(() =>
            packageContractSettingsKind(currentKind) === 'WINDOWS'
              ? {
                  defaultWorkPeriodDays: DEFAULT_PRODUCT_CONTRACT_WORK_PERIOD_DAYS,
                  windowsWorkOrderMarkupPercent: DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT,
                  updatedAt: null as string | null,
                }
              : {
                  defaultWorkPeriodDays: DEFAULT_PACKAGE_CONTRACT_WORK_PERIOD_DAYS,
                  updatedAt: null as string | null,
                }
          ),
          listPackagePaymentInvoices(packageId).catch(() => []),
        ]);
        setPackageKind(currentKind);
        if (isProductDirectionPackageKind(currentKind)) {
          const windowsSettings = packageSettingsRes as {
            windowsWorkOrderMarkupPercent?: number;
          };
          setWindowsWorkOrderMarkupPercent(
            normalizeWindowsWorkOrderMarkupPercent(windowsSettings.windowsWorkOrderMarkupPercent)
          );
        }
        setPaymentInvoiceCount(paymentInvoicesRes.length);
        setDraftTitle(row.title ?? '');
        setPackageFlowStatus(
          row.status === 'CONTRACT_CONCLUDED'
            ? 'CONTRACT_CONCLUDED'
            : row.status === 'REFUSED'
              ? 'REFUSED'
              : 'IN_PROGRESS'
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

        const workPeriodPackageKind: 'REPAIR' | 'WINDOWS' | 'DOORS' = isProductDirectionPackageKind(
          currentKind
        )
          ? currentKind
          : 'REPAIR';
        const workPeriodIsManualStored = mergedForm.contract.workPeriodIsManual === true;
        const { value: workPeriod, autofill: workPeriodAutofill } = resolvePackageWorkPeriodForForm(
          mergedForm.contract.workPeriod,
          packageSettingsRes.defaultWorkPeriodDays,
          workPeriodPackageKind,
          workPeriodIsManualStored
        );

        const mergedContractNumber = mergedForm.contract.number?.trim() ?? '';
        const contractNumber = mergedContractNumber;
        const persistContractMeta = persistContractDate || workPeriodAutofill;

        const formPayload: PackageFormData = {
          ...mergedForm,
          contract: {
            ...mergedForm.contract,
            number: contractNumber,
            date: contractDate,
            workPeriod,
            workPeriodIsManual: workPeriodAutofill ? false : workPeriodIsManualStored,
          },
          estimate: {
            ...mergedForm.estimate,
            selectedPresetIds: normalizedEstimateIds,
            selectedPresetId: normalizedEstimateIds[0] ?? '',
          },
        };
        const presetsList = estimateRes.items ?? [];
        const estGroupsList = estimateRes.groups ?? [];
        let finalForm: PackageFormData = formPayload;
        if (normalizedEstimateIds.length > 0) {
          finalForm = applyEstimatePresetIdsToPackageForm(
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
        const linkedId = parseLinkedCrmCustomerIdFromFormData(row.formData);
        setLinkedCrmCustomerId(linkedId);
        let formToApply = finalForm;
        if (linkedId) {
          try {
            const hydrated = await hydrateManagerQuestionnaire1FromLinkedCrmCustomer(
              linkedId,
              finalForm
            );
            formToApply = hydrated.form;
          } catch {
            /* оставляем анкету из пакета */
          }
        }
        const addendumDateAutofill = applyOpenAddendumDocumentDateAutofill(
          formToApply,
          todayContractDateDdMmYyyy()
        );
        if (addendumDateAutofill.changed) {
          formToApply = addendumDateAutofill.form;
        }
        const persistAddendumDocumentDates = addendumDateAutofill.changed;
        setForm(formToApply);
        formRef.current = formToApply;
        setContractObjectBlockBaseline(snapshotPackageContractObjectBlockFields(formToApply));
        const overridesSansContract = { ...ov };
        delete overridesSansContract.contract;
        setTemplateOverrides(overridesSansContract);
        setExecutorProfiles((profilesRes.items ?? []).map(normalizeExecutorRequisiteProfile));
        setSignatoryProfiles(signatoryRes.items ?? []);
        const templates = templateRes.items ?? [];
        setEstimatePresets(estimateRes.items ?? []);
        setContractInstallers(installersRes ?? []);
        setEstimateGroups(estimateRes.groups ?? []);
        setEstimateAttachGroupKey('');
        setEstimatePresetToAttach('');
        setWorkspacePackages(
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
        if (persistContractMeta || persistAddendumDocumentDates) {
          try {
            await updateContractDocumentPackage(packageId, {
              title: row.title?.trim() || null,
              formData: buildPersistedFormData(formToApply, overridesSansContract, selectedIds, {
                linkedCrmCustomerId: linkedId,
              }),
              recordVersion: false,
            });
            setWorkspacePackages((prev) =>
              prev.map((p) =>
                p.id === packageId
                  ? {
                      ...p,
                      formData: buildPersistedFormData(
                        formToApply,
                        overridesSansContract,
                        selectedIds,
                        { linkedCrmCustomerId: linkedId }
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
    [
      packageId,
      formRef,
      refreshPackageVersions,
      setContractObjectBlockBaseline,
      setContractTemplatePresets,
      setDirty,
      setDraftTitle,
      setEditingTemplateId,
      setError,
      setEstimateAttachGroupKey,
      setEstimateGroups,
      setEstimatePresetToAttach,
      setEstimatePresets,
      setExcelMessage,
      setExecutorProfiles,
      setForm,
      setLinkedCrmCustomerId,
      setLoading,
      setPackageFlowStatus,
      setPackageKind,
      setPackageRefreshing,
      setPackageVersions,
      setPaymentInvoiceCount,
      setContractInstallers,
      setWorkspacePackages,
      setSelectedTemplateIds,
      setSignatoryProfiles,
      setTemplateDraftHtml,
      setTemplateDraftTitle,
      setTemplateOverrides,
      setWindowsWorkOrderMarkupPercent,
    ]
  );

  const refreshPackageFromServer = useCallback(() => {
    void flushPersistDebounced()
      .then(() => load({ mode: 'refresh' }))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Не удалось обновить данные пакета');
      });
  }, [flushPersistDebounced, load, setError]);

  return { load, refreshPackageFromServer };
}
