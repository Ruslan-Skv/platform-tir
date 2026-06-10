'use client';

import type {
  ContractDocumentPackageKind,
  ContractDocumentPackageVersionListItem,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';
import { listPackagePaymentInvoices } from '@/shared/api/admin-payment-invoices';

import type { PackageDocumentTemplateTabId } from '../form/formDataTemplateStorage';
import type {
  PackageFormData,
  PackageManagerQuestionnaire1Block,
  PackagePostWorkQuestionnaire2Block,
} from '../form/packageForm';
import { PackageEventsJournalModal } from '../hub/PackageEventsJournalModal';
import { PackageHubModal } from '../hub/PackageHubModal';
import { PackageInvoicesModal } from '../hub/PackageInvoicesModal';
import { PackageQuestionnairesHubModal } from '../hub/PackageQuestionnairesHubModal';
import { PackageWorkOrdersHubModal } from '../hub/PackageWorkOrdersHubModal';
import type { PackageQuestionnaireHubTabId } from '../hub/packageQuestionnaireHubTabs';
import type { PackageWorkOrderHubTabId } from '../hub/packageWorkOrderHubTabs';
import type { PackageDocumentTabId } from '../tabs/packageDocumentTabs';

export type PackageDocumentEditorModalsProps = {
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
  onWorkOrdersHubPanelTabChange: (tab: PackageWorkOrderHubTabId) => void;
  onCloseWorkOrdersHub: () => void;
  questionnairesHubOpen: boolean;
  questionnairesHubPanelTab: PackageQuestionnaireHubTabId;
  onQuestionnairesHubPanelTabChange: (tab: PackageQuestionnaireHubTabId) => void;
  onCloseQuestionnairesHub: () => void;
  packageHubOpen: boolean;
  onClosePackageHub: () => void;
  onPackageHubUpdated: () => void;
  getLiveFormForHub: () => PackageFormData;
  getLivePersistOptionsForHub: () => { linkedCrmCustomerId: string | null };
  invoicesHubOpen: boolean;
  onCloseInvoicesHub: () => void;
  onPaymentInvoiceCountChange: (count: number) => void;
  onError: (message: string | null) => void;
  contractTemplatePresets: ContractTemplatePreset[];
  templateOverrides: Partial<Record<PackageDocumentTemplateTabId, string>>;
  selectedTemplateIds: Partial<Record<PackageDocumentTemplateTabId, string>>;
  isVersionsHistoryOpen: boolean;
  onCloseVersionsHistory: () => void;
  packageVersions: ContractDocumentPackageVersionListItem[];
  versionsBusy: boolean;
  onRefreshPackageVersions: () => void;
  onPatchManagerQuestionnaire1: (patch: Partial<PackageManagerQuestionnaire1Block>) => void;
  onToggleManagerQuestionnaire1Traffic: (id: string) => void;
  onToggleManagerQuestionnaire1WhyChosen: (id: string) => void;
  onToggleManagerQuestionnaire1Need: (id: string) => void;
  onPatchPostWorkQuestionnaire2: (patch: Partial<PackagePostWorkQuestionnaire2Block>) => void;
};

export function PackageDocumentEditorModals({
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
  onWorkOrdersHubPanelTabChange,
  onCloseWorkOrdersHub,
  questionnairesHubOpen,
  questionnairesHubPanelTab,
  onQuestionnairesHubPanelTabChange,
  onCloseQuestionnairesHub,
  packageHubOpen,
  onClosePackageHub,
  onPackageHubUpdated,
  getLiveFormForHub,
  getLivePersistOptionsForHub,
  invoicesHubOpen,
  onCloseInvoicesHub,
  onPaymentInvoiceCountChange,
  onError,
  contractTemplatePresets,
  templateOverrides,
  selectedTemplateIds,
  isVersionsHistoryOpen,
  onCloseVersionsHistory,
  packageVersions,
  versionsBusy,
  onRefreshPackageVersions,
  onPatchManagerQuestionnaire1,
  onToggleManagerQuestionnaire1Traffic,
  onToggleManagerQuestionnaire1WhyChosen,
  onToggleManagerQuestionnaire1Need,
  onPatchPostWorkQuestionnaire2,
}: PackageDocumentEditorModalsProps) {
  return (
    <>
      <PackageWorkOrdersHubModal
        isOpen={workOrdersHubOpen}
        onClose={onCloseWorkOrdersHub}
        panelTab={workOrdersHubPanelTab}
        onPanelTabChange={onWorkOrdersHubPanelTabChange}
        addendumSlotCount={form.addendumSlotCount}
        packageKind={packageKind}
        unassignedInteractiveRowsCount={unassignedInteractiveRowsCount}
        headerContractNumberLabel={headerContractNumberLabel}
        headerContractDateLabel={headerContractConcludedDateLabel ?? undefined}
      />
      <PackageQuestionnairesHubModal
        isOpen={questionnairesHubOpen}
        onClose={onCloseQuestionnairesHub}
        panelTab={questionnairesHubPanelTab}
        onPanelTabChange={onQuestionnairesHubPanelTabChange}
        form={form}
        packageKind={packageKind}
        headerContractNumberLabel={headerContractNumberLabel}
        headerContractDateLabel={headerContractConcludedDateLabel ?? undefined}
        linkedCrmCustomerId={linkedCrmCustomerId}
        onPatchManagerQuestionnaire1={onPatchManagerQuestionnaire1}
        onToggleManagerQuestionnaire1Traffic={onToggleManagerQuestionnaire1Traffic}
        onToggleManagerQuestionnaire1WhyChosen={onToggleManagerQuestionnaire1WhyChosen}
        onToggleManagerQuestionnaire1Need={onToggleManagerQuestionnaire1Need}
        onPatchPostWorkQuestionnaire2={onPatchPostWorkQuestionnaire2}
      />
      <PackageEventsJournalModal
        isOpen={isVersionsHistoryOpen}
        onClose={onCloseVersionsHistory}
        versions={packageVersions}
        versionsBusy={versionsBusy}
        onRefresh={onRefreshPackageVersions}
        contractNumberLabel={headerContractNumberLabel}
        contractDateLabel={headerContractConcludedDateLabel}
      />
      <PackageHubModal
        packageId={packageId}
        isOpen={packageHubOpen}
        onClose={onClosePackageHub}
        onUpdated={onPackageHubUpdated}
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
      <PackageInvoicesModal
        packageId={packageId}
        packageKind={packageKind}
        form={form}
        isOpen={invoicesHubOpen}
        onClose={onCloseInvoicesHub}
        onError={onError}
        onInvoicesChanged={() => {
          void listPackagePaymentInvoices(packageId)
            .then((list) => onPaymentInvoiceCountChange(list.length))
            .catch(() => undefined);
        }}
        contractTemplatePresets={contractTemplatePresets}
        templateOverrides={templateOverrides}
        selectedTemplateIds={selectedTemplateIds}
      />
    </>
  );
}
