'use client';

import type { Dispatch, DragEvent, SetStateAction } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractDocumentPackageStatus,
} from '@/shared/api/admin-contract-document-packages';

import cdBase from '../../../styles/base.module.css';
import cdDataTab from '../../../styles/data-tab.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import {
  PackageDocumentEditorChrome,
  PackageDocumentEditorHeader,
  PackageDocumentEditorModals,
  PackageDocumentEditorTabContent,
} from '../editor';
import type { PackageDocumentEditorModalsProps } from '../editor/PackageDocumentEditorModals';
import type { PackageDocumentEditorTabContentProps } from '../editor/PackageDocumentEditorTabContent';
import type { PackageFormData } from '../form/packageForm';
import type { PackageDocumentTabId } from '../tabs/packageDocumentTabs';
import { PackageWorkOrderHubProvider } from './PackageWorkOrderHubContext';
import type { PackageWorkOrderHubContextValue } from './PackageWorkOrderHubContext';
import type { PackageQuestionnaireHubTabId } from './packageQuestionnaireHubTabs';
import type { PackageWorkOrderHubTabId } from './packageWorkOrderHubTabs';

export type PackageDocumentEditorMainViewProps = {
  workOrderHubContextValue: PackageWorkOrderHubContextValue;
  packageKind: ContractDocumentPackageKind;
  loading: boolean;
  packageRefreshing: boolean;
  activeTab: PackageDocumentTabId;
  headerContractNumberLabel: string;
  headerContractConcludedDateLabel: string | null;
  unsignedAddendumOrdinals: number[];
  signedAddendumOrdinals: number[];
  paymentInvoiceCount: number;
  unassignedInteractiveRowsCount: number;
  form: PackageFormData;
  onOpenPackageHub: () => void;
  onOpenInvoicesHub: () => void;
  onOpenWorkOrdersHub: (defaultTab: PackageWorkOrderHubTabId) => void;
  onOpenQuestionnairesHub: (defaultTab: PackageQuestionnaireHubTabId) => void;
  onOpenVersionsHistory: () => void;
  onRefreshFromServer: () => void;
  onPrint: () => void;
  packageFlowStatus: ContractDocumentPackageStatus;
  error: string | null;
  excelMessage: string | null;
  orderedVisibleTabs: readonly PackageDocumentTabId[];
  contractAndEstimateLocked: boolean;
  addendumTabAddDisabled: boolean;
  addendumTabAddTitle: string;
  setForm: Dispatch<SetStateAction<PackageFormData>>;
  setActiveTab: (tab: PackageDocumentTabId) => void;
  touchPackageData: () => void;
  onTabActivate: (id: PackageDocumentTabId) => void;
  onTabDragStart: (id: PackageDocumentTabId, event: DragEvent<HTMLButtonElement>) => void;
  onTabDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  onTabDrop: (id: PackageDocumentTabId) => (event: DragEvent<HTMLButtonElement>) => void;
  tabContentProps: PackageDocumentEditorTabContentProps;
  editorModalsProps: PackageDocumentEditorModalsProps;
};

export function PackageDocumentEditorMainView({
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
  onOpenPackageHub,
  onOpenInvoicesHub,
  onOpenWorkOrdersHub,
  onOpenQuestionnairesHub,
  onOpenVersionsHistory,
  onRefreshFromServer,
  onPrint,
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
  onTabActivate,
  onTabDragStart,
  onTabDragOver,
  onTabDrop,
  tabContentProps,
  editorModalsProps,
}: PackageDocumentEditorMainViewProps) {
  return (
    <PackageWorkOrderHubProvider value={workOrderHubContextValue}>
      <div
        className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdBase.packageDocumentEditorPage} ${cdDataTab.packageDocumentEditorPage} ${cdWorkspace.packageDocumentEditorPage}`}
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
          onOpenPackageHub={onOpenPackageHub}
          onOpenInvoicesHub={onOpenInvoicesHub}
          onOpenWorkOrdersHub={onOpenWorkOrdersHub}
          onOpenQuestionnairesHub={onOpenQuestionnairesHub}
          onOpenVersionsHistory={onOpenVersionsHistory}
          onRefreshFromServer={onRefreshFromServer}
          onPrint={onPrint}
        />
        <PackageDocumentEditorChrome
          packageFlowStatus={packageFlowStatus}
          refusalReason={form.contractRefusalReason}
          error={error}
          excelMessage={excelMessage}
          packageKind={packageKind}
          tabs={orderedVisibleTabs}
          activeTab={activeTab}
          contractAndEstimateLocked={contractAndEstimateLocked}
          unsignedAddendumOrdinals={unsignedAddendumOrdinals}
          signedAddendumOrdinals={signedAddendumOrdinals}
          form={form}
          addendumTabAddDisabled={addendumTabAddDisabled}
          addendumTabAddTitle={addendumTabAddTitle}
          setForm={setForm}
          setActiveTab={setActiveTab}
          touchPackageData={touchPackageData}
          onTabActivate={onTabActivate}
          onTabDragStart={onTabDragStart}
          onTabDragOver={onTabDragOver}
          onTabDrop={onTabDrop}
        />
        <PackageDocumentEditorTabContent {...tabContentProps} />
        <PackageDocumentEditorModals {...editorModalsProps} />
      </div>
    </PackageWorkOrderHubProvider>
  );
}
