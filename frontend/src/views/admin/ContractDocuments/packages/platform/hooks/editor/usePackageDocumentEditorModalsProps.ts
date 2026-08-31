import { useCallback, useMemo } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractDocumentPackageVersionListItem,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';

import type { PackageDocumentEditorModalsProps } from '../../editor/chrome/PackageDocumentEditorModals';
import type { PackageDocumentTemplateTabId } from '../../form/formDataTemplateStorage';
import type {
  PackageFormData,
  PackageManagerQuestionnaire1Block,
  PackagePostWorkQuestionnaire2Block,
} from '../../form/packageForm';
import type { PackageQuestionnaireHubTabId } from '../../hub/questionnaires/packageQuestionnaireHubTabs';
import type { PackageWorkOrderHubTabId } from '../../hub/workOrders/packageWorkOrderHubTabs';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';

export type UsePackageDocumentEditorModalsPropsOptions = {
  packageId: string;
  packageKind: ContractDocumentPackageKind;
  activeTab: PackageDocumentTabId;
  form: PackageFormData;
  dirty: boolean;
  linkedCrmCustomerId: string | null;
  headerContractNumberLabel: string;
  headerContractConcludedDateLabel: string | null;
  unassignedInteractiveRowsCount: number;
  workOrdersHubOpen: boolean;
  workOrdersHubPanelTab: PackageWorkOrderHubTabId;
  setWorkOrdersHubPanelTab: React.Dispatch<React.SetStateAction<PackageWorkOrderHubTabId>>;
  closeWorkOrdersHub: () => void;
  questionnairesHubOpen: boolean;
  questionnairesHubPanelTab: PackageQuestionnaireHubTabId;
  setQuestionnairesHubPanelTab: React.Dispatch<React.SetStateAction<PackageQuestionnaireHubTabId>>;
  setQuestionnairesHubOpen: React.Dispatch<React.SetStateAction<boolean>>;
  packageHubOpen: boolean;
  setPackageHubOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handlePackageHubUpdated: () => void;
  getLiveFormForHub: () => PackageFormData;
  getLivePersistOptionsForHub: () => { linkedCrmCustomerId: string | null };
  invoicesHubOpen: boolean;
  setInvoicesHubOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setPaymentInvoiceCount: React.Dispatch<React.SetStateAction<number>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  customerShareOpen: boolean;
  setCustomerShareOpen: React.Dispatch<React.SetStateAction<boolean>>;
  remoteSigningOpen: boolean;
  setRemoteSigningOpen: React.Dispatch<React.SetStateAction<boolean>>;
  contractTemplatePresets: ContractTemplatePreset[];
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
  isVersionsHistoryOpen: boolean;
  setIsVersionsHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  packageVersions: ContractDocumentPackageVersionListItem[];
  versionsBusy: boolean;
  refreshPackageVersions: () => void | Promise<void>;
  patchManagerQuestionnaire1: (patch: Partial<PackageManagerQuestionnaire1Block>) => void;
  toggleManagerQuestionnaire1Traffic: (id: string) => void;
  toggleManagerQuestionnaire1WhyChosen: (id: string) => void;
  toggleManagerQuestionnaire1Need: (id: string) => void;
  patchPostWorkQuestionnaire2: (patch: Partial<PackagePostWorkQuestionnaire2Block>) => void;
};

export function usePackageDocumentEditorModalsProps({
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
}: UsePackageDocumentEditorModalsPropsOptions): PackageDocumentEditorModalsProps {
  const onCloseQuestionnairesHub = useCallback(() => {
    setQuestionnairesHubOpen(false);
  }, [setQuestionnairesHubOpen]);

  const onClosePackageHub = useCallback(() => {
    setPackageHubOpen(false);
  }, [setPackageHubOpen]);

  const onCloseInvoicesHub = useCallback(() => {
    setInvoicesHubOpen(false);
  }, [setInvoicesHubOpen]);

  const onCloseCustomerShare = useCallback(() => {
    setCustomerShareOpen(false);
  }, [setCustomerShareOpen]);

  const onCloseRemoteSigning = useCallback(() => {
    setRemoteSigningOpen(false);
  }, [setRemoteSigningOpen]);

  const onCloseVersionsHistory = useCallback(() => {
    setIsVersionsHistoryOpen(false);
  }, [setIsVersionsHistoryOpen]);

  const onRefreshPackageVersions = useCallback(() => {
    void refreshPackageVersions();
  }, [refreshPackageVersions]);

  return useMemo(
    (): PackageDocumentEditorModalsProps => ({
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
      onWorkOrdersHubPanelTabChange: setWorkOrdersHubPanelTab,
      onCloseWorkOrdersHub: closeWorkOrdersHub,
      questionnairesHubOpen,
      questionnairesHubPanelTab,
      onQuestionnairesHubPanelTabChange: setQuestionnairesHubPanelTab,
      onCloseQuestionnairesHub,
      packageHubOpen,
      onClosePackageHub,
      onPackageHubUpdated: handlePackageHubUpdated,
      getLiveFormForHub,
      getLivePersistOptionsForHub,
      invoicesHubOpen,
      onCloseInvoicesHub,
      onPaymentInvoiceCountChange: setPaymentInvoiceCount,
      onError: setError,
      customerShareOpen,
      onCloseCustomerShare,
      remoteSigningOpen,
      onCloseRemoteSigning,
      contractTemplatePresets,
      templateOverrides,
      selectedTemplateIds,
      isVersionsHistoryOpen,
      onCloseVersionsHistory,
      packageVersions,
      versionsBusy,
      onRefreshPackageVersions,
      onPatchManagerQuestionnaire1: patchManagerQuestionnaire1,
      onToggleManagerQuestionnaire1Traffic: toggleManagerQuestionnaire1Traffic,
      onToggleManagerQuestionnaire1WhyChosen: toggleManagerQuestionnaire1WhyChosen,
      onToggleManagerQuestionnaire1Need: toggleManagerQuestionnaire1Need,
      onPatchPostWorkQuestionnaire2: patchPostWorkQuestionnaire2,
    }),
    [
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
      onCloseQuestionnairesHub,
      packageHubOpen,
      onClosePackageHub,
      handlePackageHubUpdated,
      getLiveFormForHub,
      getLivePersistOptionsForHub,
      invoicesHubOpen,
      onCloseInvoicesHub,
      setPaymentInvoiceCount,
      setError,
      customerShareOpen,
      onCloseCustomerShare,
      remoteSigningOpen,
      onCloseRemoteSigning,
      contractTemplatePresets,
      templateOverrides,
      selectedTemplateIds,
      isVersionsHistoryOpen,
      onCloseVersionsHistory,
      packageVersions,
      versionsBusy,
      onRefreshPackageVersions,
      patchManagerQuestionnaire1,
      toggleManagerQuestionnaire1Traffic,
      toggleManagerQuestionnaire1WhyChosen,
      toggleManagerQuestionnaire1Need,
      patchPostWorkQuestionnaire2,
    ]
  );
}
