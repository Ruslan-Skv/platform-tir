'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import {
  type ContractDocumentPackageKind,
  type ContractDocumentPackageStatus,
  type ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';

import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT } from '../../../families/product-like/print/productWorkOrder';
import { type PackageContractObjectBlockFieldId, executePackageDocumentPrint } from '../../editor';
import {
  type PackageDocumentTemplateTabId,
  buildPersistedFormData,
} from '../../form/formDataTemplateStorage';
import { type PackageFormData, mergePackageFormData } from '../../form/packageForm';
import type { PackageDocumentEditorMainViewProps } from '../../hub/hubModal/PackageDocumentEditorMainView';
import { type PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import { usePackageAddendumEditor } from '../addendum/usePackageAddendumEditor';
import { usePackageContractFieldHandlers } from '../contract/usePackageContractFieldHandlers';
import { usePackageContractObjectBlockUi } from '../contract/usePackageContractObjectBlockUi';
import {
  usePackageAddendumSlotActions,
  usePackageContractTotalSync,
} from '../contract/usePackageContractTotalSync';
import { usePackageDataTabFieldHelp } from '../data-tab/usePackageDataTabFieldHelp';
import { usePackageDataTabSectionExpansion } from '../data-tab/usePackageDataTabSectionExpansion';
import { usePackageDocumentLoad } from '../document/usePackageDocumentLoad';
import { usePackageDocumentPersist } from '../document/usePackageDocumentPersist';
import { usePackageDocumentVersions } from '../document/usePackageDocumentVersions';
import { usePackageRenderedDocument } from '../document/usePackageRenderedDocument';
import { usePackageEstimateAttachCatalog } from '../estimate/usePackageEstimateAttachCatalog';
import { usePackageEstimatePresetHandlers } from '../estimate/usePackageEstimatePresetHandlers';
import { usePackageEstimateTabHandlers } from '../estimate/usePackageEstimateTabHandlers';
import { usePackageProductSpecificationHandlers } from '../product-spec/usePackageProductSpecificationHandlers';
import { usePackageProfileDirectoryHandlers } from '../profile/usePackageProfileDirectoryHandlers';
import { usePackageManagerQuestionnaire1CrmHydrate } from '../questionnaire/usePackageManagerQuestionnaire1CrmHydrate';
import { usePackageManagerQuestionnaire1CrmSync } from '../questionnaire/usePackageManagerQuestionnaire1CrmSync';
import { usePackageQuestionnaireHandlers } from '../questionnaire/usePackageQuestionnaireHandlers';
import { usePackageTemplatePresetResolution } from '../template/usePackageTemplatePresetResolution';
import { usePackageWorkOrderHubContext } from '../work-orders/usePackageWorkOrderHubContext';
import { usePackageDocumentEditorUiProps } from './usePackageDocumentEditorUiProps';
import { usePackageEditorActiveTabGuards } from './usePackageEditorActiveTabGuards';
import { usePackageEditorCatalogState } from './usePackageEditorCatalogState';
import { usePackageEditorEstimateDerivedState } from './usePackageEditorEstimateDerivedState';
import { usePackageEditorHeaderHubActions } from './usePackageEditorHeaderHubActions';
import { usePackageEditorHeaderState } from './usePackageEditorHeaderState';
import { usePackageEditorHubCallbacks } from './usePackageEditorHubCallbacks';
import { usePackageEditorHubPanelState } from './usePackageEditorHubPanelState';
import { usePackageEditorTabNavigation } from './usePackageEditorTabNavigation';
import { usePackageTemplateEditorState } from './usePackageTemplateEditorState';

export type UsePackageDocumentEditorControllerOptions = {
  packageId: string;
  workOrdersHubListSurface?: boolean;
  workOrdersHubListSurfaceOpen?: boolean;
  onWorkOrdersHubListClose?: () => void;
  onWorkOrdersHubListUpdated?: () => void;
  invoicesHubListSurface?: boolean;
  invoicesHubListSurfaceOpen?: boolean;
  onInvoicesHubListClose?: () => void;
  onInvoicesHubListUpdated?: () => void;
};

export type PackageDocumentEditorControllerResult = {
  loading: boolean;
  workOrdersHubListSurface: boolean;
  invoicesHubListSurface: boolean;
  workOrdersListSurfaceProps: ReturnType<
    typeof usePackageDocumentEditorUiProps
  >['workOrdersListSurfaceProps'];
  invoicesListSurfaceProps: {
    loading: boolean;
    error: string | null;
    invoicesHubOpen: boolean;
    invoicesHubVisible: boolean;
    onCloseInvoicesHub: () => void;
    onAfterClose?: () => void;
    onInvoicesChanged?: () => void;
    packageId: string;
    packageKind: ContractDocumentPackageKind;
    form: PackageFormData;
    onError: (message: string) => void;
    contractTemplatePresets: ContractTemplatePreset[];
    templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
    selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
  };
  mainViewProps: PackageDocumentEditorMainViewProps;
};

export function usePackageDocumentEditorController({
  packageId,
  workOrdersHubListSurface = false,
  workOrdersHubListSurfaceOpen = false,
  onWorkOrdersHubListClose,
  onWorkOrdersHubListUpdated: _onWorkOrdersHubListUpdated,
  invoicesHubListSurface = false,
  invoicesHubListSurfaceOpen = false,
  onInvoicesHubListClose,
  onInvoicesHubListUpdated,
}: UsePackageDocumentEditorControllerOptions) {
  const { canEdit: isSuperAdmin } = useAdminSectionCanEdit();
  const [packageKind, setPackageKind] = useState<ContractDocumentPackageKind>('REPAIR');
  const [windowsWorkOrderMarkupPercent, setWindowsWorkOrderMarkupPercent] = useState(
    DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT
  );
  const [activeTab, setActiveTab] = useState<PackageDocumentTabId>('data');
  const {
    packageHubOpen,
    setPackageHubOpen,
    invoicesHubOpen,
    setInvoicesHubOpen,
    paymentInvoiceCount,
    setPaymentInvoiceCount,
    workOrdersHubOpen,
    setWorkOrdersHubOpen,
    workOrdersHubPanelTab,
    setWorkOrdersHubPanelTab,
    questionnairesHubOpen,
    setQuestionnairesHubOpen,
    questionnairesHubPanelTab,
    setQuestionnairesHubPanelTab,
    customerShareOpen,
    setCustomerShareOpen,
    remoteSigningOpen,
    setRemoteSigningOpen,
  } = usePackageEditorHubPanelState({
    workOrdersHubListSurface,
    workOrdersHubListSurfaceOpen,
    invoicesHubListSurface,
    invoicesHubListSurfaceOpen,
  });
  const [activeFinalWorkOrderDocId, setActiveFinalWorkOrderDocId] = useState<string>('common');
  const activeAddendumSlot = useMemo(() => {
    const m = /^addendum([1-5])$/.exec(activeTab);
    return m ? Number(m[1]) : null;
  }, [activeTab]);

  const {
    editorTabOrder,
    handleTabActivate,
    handleTabDragStart,
    handleTabDragOver,
    handleTabDrop,
  } = usePackageEditorTabNavigation(setActiveTab);
  const [draftTitle, setDraftTitle] = useState('');
  const [form, setForm] = useState<PackageFormData>(() => mergePackageFormData({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isProductDirectionPackage = isProductDirectionPackageKind(packageKind);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  const [linkedCrmCustomerId, setLinkedCrmCustomerId] = useState<string | null>(null);
  const [responsibleManagerId, setResponsibleManagerId] = useState<string | null>(null);
  const responsibleManagerIdRef = useRef<string | null>(null);
  responsibleManagerIdRef.current = responsibleManagerId;
  const linkedCrmCustomerIdRef = useRef<string | null>(null);
  linkedCrmCustomerIdRef.current = linkedCrmCustomerId;
  const [templateOverrides, setTemplateOverrides] = useState<
    Partial<Record<PackageDocumentTemplateTabId, string>>
  >({});
  const [excelMessage, setExcelMessage] = useState<string | null>(null);
  const estimatePrintSheetRef = useRef<HTMLElement | null>(null);
  const catalog = usePackageEditorCatalogState();
  const {
    executorProfiles,
    signatoryProfiles,
    contractTemplatePresets,
    selectedTemplateIds,
    estimatePresets,
    contractInstallers,
    activeInstallerId,
    setActiveInstallerId,
    estimateGroups,
    estimateAttachGroupKey,
    setEstimateAttachGroupKey,
    estimatePresetToAttach,
    setEstimatePresetToAttach,
    draggingEstimatePresetId,
    setDraggingEstimatePresetId,
    addendumPresetToAttach,
    setAddendumPresetToAttach,
    addendumExcludedPresetToAttach,
    setAddendumExcludedPresetToAttach,
    draggingAddendumEstimatePresetId,
    setDraggingAddendumEstimatePresetId,
    draggingAddendumExcludedEstimatePresetId,
    setDraggingAddendumExcludedEstimatePresetId,
    workspacePackages,
    setWorkspacePackages,
    setExecutorProfiles,
    setSignatoryProfiles,
    setContractTemplatePresets,
    setSelectedTemplateIds,
    setEstimatePresets,
    setContractInstallers,
    setEstimateGroups,
  } = catalog;
  const [packageRefreshing, setPackageRefreshing] = useState(false);
  const [packageFlowStatus, setPackageFlowStatus] =
    useState<ContractDocumentPackageStatus>('IN_PROGRESS');
  const packageFlowStatusRef = useRef<ContractDocumentPackageStatus>('IN_PROGRESS');
  packageFlowStatusRef.current = packageFlowStatus;
  /** После «Договор подписан» или «Отказ» вкладки «Договор» и «Смета» только для просмотра. */
  const contractAndEstimateLocked =
    packageFlowStatus === 'CONTRACT_CONCLUDED' || packageFlowStatus === 'REFUSED';
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
  const [contractObjectBlockBaseline, setContractObjectBlockBaseline] = useState<Record<
    PackageContractObjectBlockFieldId,
    string
  > | null>(null);

  const { contractObjectBlockFieldClassName } = usePackageContractObjectBlockUi({
    form,
    contractAndEstimateLocked,
    contractObjectBlockBaseline,
  });

  /** Актуальная форма для отложенного сохранения (после setState ref обновится на следующем рендере). */
  const formRef = useRef(form);
  formRef.current = form;
  const templateOverridesRef = useRef(templateOverrides);
  templateOverridesRef.current = templateOverrides;
  const selectedTemplateIdsRef = useRef(selectedTemplateIds);
  selectedTemplateIdsRef.current = selectedTemplateIds;
  const draftTitleRef = useRef(draftTitle);
  draftTitleRef.current = draftTitle;

  const buildEditorPersistedFormData = useCallback((nextForm: PackageFormData) => {
    return buildPersistedFormData(
      nextForm,
      templateOverridesRef.current,
      selectedTemplateIdsRef.current,
      { linkedCrmCustomerId: linkedCrmCustomerIdRef.current }
    );
  }, []);

  const {
    flushPersistDebounced: flushPersistPackageDebounced,
    schedulePersistDebounced: schedulePersistPackageDebounced,
    touchPackageData,
  } = usePackageDocumentPersist({
    packageId,
    loading,
    packageFlowStatusRef,
    formRef,
    draftTitleRef,
    dirtyRef,
    responsibleManagerIdRef,
    buildPersistedFormData: buildEditorPersistedFormData,
    setForm,
    setDirty,
    setError,
    setWorkspacePackages,
    isVersionsHistoryOpenRef,
    refreshPackageVersionsRef,
  });

  const { scheduleManagerQuestionnaire1CrmSync } = usePackageManagerQuestionnaire1CrmSync({
    linkedCrmCustomerIdRef,
    setError,
  });

  usePackageEditorActiveTabGuards({
    activeTab,
    setActiveTab,
    packageKind,
    editorTabOrder,
    addendumSlotCount: form.addendumSlotCount,
  });

  const { resolveTemplateHtml } = usePackageTemplatePresetResolution({
    packageKind,
    contractTemplatePresets,
    selectedTemplateIds,
  });

  const { templateLoadSetters } = usePackageTemplateEditorState();

  const { load, refreshPackageFromServer } = usePackageDocumentLoad({
    packageId,
    formRef,
    refreshPackageVersions,
    flushPersistDebounced: flushPersistPackageDebounced,
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
      setResponsibleManagerId,
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
      ...templateLoadSetters,
      setExcelMessage,
      setDirty,
    },
  });

  const {
    getLiveFormForHub,
    getLivePersistOptionsForHub,
    openPackageHub,
    handlePackageHubUpdated,
    closeWorkOrdersHub,
  } = usePackageEditorHubCallbacks({
    formRef,
    linkedCrmCustomerIdRef,
    flushPersistDebounced: flushPersistPackageDebounced,
    load,
    setError,
    setPackageHubOpen,
    workOrdersHubListSurface,
    onWorkOrdersHubListClose,
    setWorkOrdersHubOpen,
  });

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (isVersionsHistoryOpen && !loading) {
      void refreshPackageVersions({ skipSpinner: true });
    }
  }, [isVersionsHistoryOpen, loading, refreshPackageVersions]);

  usePackageManagerQuestionnaire1CrmHydrate({
    questionnairesHubOpen,
    linkedCrmCustomerId,
    formRef,
    setForm,
  });

  const {
    customerPhonesReadonlyDisplay,
    handleCrmCustomerApplied,
    handleCrmCustomerClear,
    applyExecutorProfile,
    applySignatoryProfile,
  } = usePackageProfileDirectoryHandlers({
    form,
    setForm,
    formRef,
    contractAndEstimateLocked,
    touchPackageData,
    executorProfiles,
    signatoryProfiles,
    setLinkedCrmCustomerId,
    onResponsibleManagerIdChange: setResponsibleManagerId,
  });

  const { updateContract, updateObject, updateWorkOrder } = usePackageContractFieldHandlers({
    form,
    setForm,
    contractAndEstimateLocked,
    isSuperAdmin,
    touchPackageData,
  });

  const {
    patchManagerQuestionnaire1,
    patchPostWorkQuestionnaire2,
    toggleManagerQuestionnaire1Need,
    toggleManagerQuestionnaire1Traffic,
    toggleManagerQuestionnaire1WhyChosen,
  } = usePackageQuestionnaireHandlers({
    setForm,
    formRef,
    touchPackageData,
    scheduleManagerQuestionnaire1CrmSync,
  });

  const {
    estimateUsageById,
    attachableEstimatePresets,
    contractEstimateObjectKey,
    attachEstimatePickMeta,
    attachableForSelectedGroup,
    attachableAddendumEstimatePresets,
    attachableAddendumExcludedEstimatePresets,
  } = usePackageEstimateAttachCatalog({
    packageId,
    form,
    isProductDirectionPackage,
    linkedCrmCustomerId,
    activeAddendumSlot,
    estimatePresets,
    estimateGroups,
    workspacePackages,
    estimateAttachGroupKey,
    setEstimateAttachGroupKey,
    estimatePresetToAttach,
    setEstimatePresetToAttach,
    addendumPresetToAttach,
    setAddendumPresetToAttach,
    addendumExcludedPresetToAttach,
    setAddendumExcludedPresetToAttach,
    setDraggingAddendumEstimatePresetId,
    setDraggingAddendumExcludedEstimatePresetId,
  });

  const { selectedEstimateSections, estimateAppendixContractRef } =
    usePackageEditorEstimateDerivedState({ form, estimatePresets, estimateGroups });

  const { productContractCostBreakdown } = usePackageContractTotalSync({
    form,
    formRef,
    setForm,
    touchPackageData,
    isProductDirectionPackage,
  });

  const { workPeriodFieldHelp, contractDateFieldHelp } = usePackageDataTabFieldHelp({
    packageKind,
    isProductDirectionPackage,
    contractAndEstimateLocked,
    isSuperAdmin,
    form,
  });

  const {
    workOrderHubContextValue,
    finalEstimateSummary,
    contractDiscountPercentParsed,
    finalEstimateTotalAfterDiscount,
    finalEstimateRooms,
    unassignedInteractiveRowsCount,
  } = usePackageWorkOrderHubContext({
    packageId,
    packageKind,
    isProductDirectionPackage,
    windowsWorkOrderMarkupPercent,
    form,
    setForm,
    touchPackageData,
    contractInstallers,
    activeInstallerId,
    setActiveInstallerId,
    activeFinalWorkOrderDocId,
    setActiveFinalWorkOrderDocId,
    selectedEstimateSections,
    estimateAppendixContractRef,
    estimatePresets,
    estimateGroups,
    templateOverrides,
    resolveTemplateHtml,
    updateWorkOrder,
  });

  const { addEstimatePresetToForm, moveEstimatePresetInForm, removeEstimatePresetFromForm } =
    usePackageEstimatePresetHandlers({
      contractAndEstimateLocked,
      form,
      setForm,
      setDirty,
      formRef,
      estimatePresets,
      estimateGroups,
      schedulePersistDebounced: schedulePersistPackageDebounced,
    });

  const { patchAddendumDocumentDate } = usePackageAddendumSlotActions({
    activeAddendumSlot,
    form,
    setForm,
    touchPackageData,
  });

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
    schedulePersistDebounced: schedulePersistPackageDebounced,
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

  const handlePrint = () => {
    executePackageDocumentPrint({
      packageKind,
      activeTab,
      form,
      renderedDoc,
      isProductDirectionPackage,
      estimateAppendixContractRef,
      selectedEstimateSections,
      directorName: form.executor.directorName,
      customerFullName: form.customer.fullName,
    });
  };

  const {
    headerContractNumberLabel,
    unsignedAddendumOrdinals,
    signedAddendumOrdinals,
    addendumTabAddDisabled,
    addendumTabAddTitle,
    headerContractConcludedDateLabel,
  } = usePackageEditorHeaderState({ form, packageFlowStatus });

  const estimateTabHandlers = usePackageEstimateTabHandlers({
    setForm,
    touchPackageData,
    setEstimatePresetToAttach,
    addEstimatePresetToForm,
    moveEstimatePresetInForm,
    removeEstimatePresetFromForm,
  });

  const productSpecificationHandlers = usePackageProductSpecificationHandlers({
    setForm,
    touchPackageData,
    setError,
  });

  const {
    customerDataSectionExpanded,
    setCustomerDataSectionExpanded,
    executorDataSectionExpanded,
    setExecutorDataSectionExpanded,
    managerDataSectionExpanded,
    setManagerDataSectionExpanded,
    customerSectionCompletionPercent,
    executorSectionCompletionPercent,
    managerSectionCompletionPercent,
  } = usePackageDataTabSectionExpansion(form, linkedCrmCustomerId);

  const headerHubActions = usePackageEditorHeaderHubActions({
    setWorkOrdersHubPanelTab,
    setWorkOrdersHubOpen,
    setQuestionnairesHubPanelTab,
    setQuestionnairesHubOpen,
    setInvoicesHubOpen,
    setIsVersionsHistoryOpen,
    setCustomerShareOpen,
    setRemoteSigningOpen,
  });

  const { workOrdersListSurfaceProps, orderedVisibleTabs, tabContentProps, editorModalsProps } =
    usePackageDocumentEditorUiProps({
      tab: {
        form,
        contractAndEstimateLocked,
        isSuperAdmin,
        isProductDirectionPackage,
        packageKind,
        contractObjectBlockFieldClassName,
        updateContract,
        updateObject,
        applyExecutorProfile,
        applySignatoryProfile,
        executorProfiles,
        signatoryProfiles,
        contractDateFieldHelp,
        workPeriodFieldHelp,
        linkedCrmCustomerId,
        onCrmCustomerApplied: handleCrmCustomerApplied,
        onCrmCustomerClear: handleCrmCustomerClear,
        onCrmError: setError,
        productContractCostBreakdown,
        customerSectionCompletionPercent,
        executorSectionCompletionPercent,
        managerSectionCompletionPercent,
        customerDataSectionExpanded,
        setCustomerDataSectionExpanded,
        executorDataSectionExpanded,
        setExecutorDataSectionExpanded,
        managerDataSectionExpanded,
        setManagerDataSectionExpanded,
        customerPhonesReadonlyDisplay,
        estimateAppendixContractRef,
        contractEstimateObjectKey,
        estimateAttachGroupKey,
        setEstimateAttachGroupKey,
        estimatePresetToAttach,
        setEstimatePresetToAttach,
        attachEstimatePickMeta,
        attachableForSelectedGroup,
        attachableEstimatePresets,
        estimatePresets,
        estimateUsageById,
        draggingEstimatePresetId,
        setDraggingEstimatePresetId,
        selectedEstimateSections,
        contractDiscountPercentParsed,
        estimatePrintSheetRef,
        estimateTabHandlers,
        finalEstimateRooms,
        finalEstimateTotalAmount: finalEstimateSummary.totalAmount,
        finalEstimateTotalAfterDiscount,
        productSpecificationHandlers,
      },
      modals: {
        packageId,
        packageKind,
        activeTab,
        form,
        dirty,
        linkedCrmCustomerId,
        headerContractNumberLabel,
        headerContractConcludedDateLabel,
        unassignedInteractiveRowsCount,
        workOrdersHubOpen,
        workOrdersHubPanelTab,
        setWorkOrdersHubPanelTab,
        closeWorkOrdersHub,
        questionnairesHubOpen,
        questionnairesHubPanelTab,
        setQuestionnairesHubPanelTab,
        setQuestionnairesHubOpen,
        packageHubOpen,
        setPackageHubOpen,
        handlePackageHubUpdated,
        getLiveFormForHub,
        getLivePersistOptionsForHub,
        invoicesHubOpen,
        setInvoicesHubOpen,
        setPaymentInvoiceCount,
        setError,
        customerShareOpen,
        setCustomerShareOpen,
        remoteSigningOpen,
        setRemoteSigningOpen,
        contractTemplatePresets,
        templateOverrides,
        selectedTemplateIds,
        isVersionsHistoryOpen,
        setIsVersionsHistoryOpen,
        packageVersions,
        versionsBusy,
        refreshPackageVersions,
        patchManagerQuestionnaire1,
        toggleManagerQuestionnaire1Traffic,
        toggleManagerQuestionnaire1WhyChosen,
        toggleManagerQuestionnaire1Need,
        patchPostWorkQuestionnaire2,
      },
      shell: {
        activeTab,
        activeAddendumSlot,
        packageKind,
        packageId,
        contractAndEstimateLocked,
        renderedDoc,
        unsignedAddendumOrdinals,
        isProductDirectionPackage,
        onOpenPackageHub: openPackageHub,
        addendumEditor,
        editorTabOrder,
        addendumSlotCount: form.addendumSlotCount,
      },
      workOrdersList: {
        error,
        workOrdersHubOpen,
        workOrdersHubPanelTab,
        setWorkOrdersHubPanelTab,
        closeWorkOrdersHub,
        workOrderHubContextValue,
        form,
        packageKind,
        unassignedInteractiveRowsCount,
        headerContractNumberLabel,
        headerContractConcludedDateLabel,
      },
    });

  const mainViewProps: PackageDocumentEditorMainViewProps = {
    workOrderHubContextValue,
    packageKind,
    loading,
    packageRefreshing,
    activeTab,
    headerContractNumberLabel,
    headerContractConcludedDateLabel,
    unsignedAddendumOrdinals,
    signedAddendumOrdinals,
    paymentInvoiceCount,
    unassignedInteractiveRowsCount,
    form,
    onOpenPackageHub: openPackageHub,
    onOpenInvoicesHub: headerHubActions.onOpenInvoicesHub,
    onOpenWorkOrdersHub: headerHubActions.onOpenWorkOrdersHub,
    onOpenQuestionnairesHub: headerHubActions.onOpenQuestionnairesHub,
    onOpenVersionsHistory: headerHubActions.onOpenVersionsHistory,
    onOpenCustomerShare: headerHubActions.onOpenCustomerShare,
    onOpenRemoteSigning: headerHubActions.onOpenRemoteSigning,
    onRefreshFromServer: refreshPackageFromServer,
    onPrint: handlePrint,
    packageFlowStatus,
    error,
    excelMessage,
    orderedVisibleTabs,
    contractAndEstimateLocked,
    addendumTabAddDisabled,
    addendumTabAddTitle,
    setForm,
    setActiveTab,
    touchPackageData,
    onTabActivate: handleTabActivate,
    onTabDragStart: handleTabDragStart,
    onTabDragOver: handleTabDragOver,
    onTabDrop: handleTabDrop,
    tabContentProps,
    editorModalsProps,
  };

  return {
    loading,
    workOrdersHubListSurface,
    invoicesHubListSurface,
    workOrdersListSurfaceProps: {
      ...workOrdersListSurfaceProps,
      workOrdersHubOpen: workOrdersHubOpen && !loading,
    },
    invoicesListSurfaceProps: {
      loading,
      error,
      invoicesHubOpen,
      invoicesHubVisible: invoicesHubOpen && !loading,
      onCloseInvoicesHub: () => setInvoicesHubOpen(false),
      onAfterClose: onInvoicesHubListClose,
      onInvoicesChanged: onInvoicesHubListUpdated,
      packageId,
      packageKind,
      form,
      onError: (message: string) => setError(message),
      contractTemplatePresets,
      templateOverrides,
      selectedTemplateIds,
    },
    mainViewProps,
  };
}
