'use client';

import type { Dispatch, DragEvent, SetStateAction } from 'react';

import type {
  ContractDocumentPackageKind,
  ContractDocumentPackageStatus,
} from '@/shared/api/admin-contract-document-packages';

import cdBase from '../../../../styles/base.module.css';
import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import {
  PackageDocumentEditorChrome,
  PackageDocumentEditorHeader,
  PackageDocumentEditorModals,
  PackageDocumentEditorTabContent,
  PackageDocumentEditorTabStrip,
} from '../../editor';
import type { PackageDocumentEditorModalsProps } from '../../editor/chrome/PackageDocumentEditorModals';
import type { PackageDocumentEditorTabContentProps } from '../../editor/chrome/PackageDocumentEditorTabContent';
import type { PackageFormData } from '../../form/packageForm';
import type { PackageDocumentTabId } from '../../tabs/packageDocumentTabs';
import type { PackageQuestionnaireHubTabId } from '../questionnaires/packageQuestionnaireHubTabs';
import { PackageWorkOrderHubProvider } from '../workOrders/PackageWorkOrderHubContext';
import type { PackageWorkOrderHubContextValue } from '../workOrders/PackageWorkOrderHubContext';
import type { PackageWorkOrderHubTabId } from '../workOrders/packageWorkOrderHubTabs';

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
  /** Есть подписанные (SIGNED) сессии ЭП — золотая тонировка кнопки «ЭП» в шапке. */
  hasSignedSigningSessions: boolean;
  form: PackageFormData;
  onOpenPackageHub: () => void;
  onOpenInvoicesHub: () => void;
  onOpenWorkOrdersHub: (defaultTab: PackageWorkOrderHubTabId) => void;
  onOpenQuestionnairesHub: (defaultTab: PackageQuestionnaireHubTabId) => void;
  onOpenVersionsHistory: () => void;
  onOpenCustomerShare: () => void;
  onOpenRemoteSigning: () => void;
  onRefreshFromServer: () => void;
  onPrint: () => void;
  packageFlowStatus: ContractDocumentPackageStatus;
  error: string | null;
  excelMessage: string | null;
  orderedVisibleTabs: readonly PackageDocumentTabId[];
  /** «Счёт-заказ»/«Смета» и «Спецификация» только для просмотра (подписан/отказ). */
  signedDocsLocked: boolean;
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
  hasSignedSigningSessions,
  form,
  onOpenPackageHub,
  onOpenInvoicesHub,
  onOpenWorkOrdersHub,
  onOpenQuestionnairesHub,
  onOpenVersionsHistory,
  onOpenCustomerShare,
  onOpenRemoteSigning,
  onRefreshFromServer,
  onPrint,
  packageFlowStatus,
  error,
  excelMessage,
  orderedVisibleTabs,
  signedDocsLocked,
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
        className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage} ${cdBase.packageDocumentEditorPage} ${cdDataTab.packageDocumentEditorPage} ${cdWorkspace.packageDocumentEditorPage}`}
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
          hasSignedSigningSessions={hasSignedSigningSessions}
          form={form}
          onOpenPackageHub={onOpenPackageHub}
          onOpenInvoicesHub={onOpenInvoicesHub}
          onOpenWorkOrdersHub={onOpenWorkOrdersHub}
          onOpenQuestionnairesHub={onOpenQuestionnairesHub}
          onOpenVersionsHistory={onOpenVersionsHistory}
          onOpenCustomerShare={onOpenCustomerShare}
          onOpenRemoteSigning={onOpenRemoteSigning}
          onRefreshFromServer={onRefreshFromServer}
          onPrint={onPrint}
        >
          <PackageDocumentEditorTabStrip
            packageKind={packageKind}
            tabs={orderedVisibleTabs}
            activeTab={activeTab}
            signedDocsLocked={signedDocsLocked}
            contractConcluded={packageFlowStatus === 'CONTRACT_CONCLUDED'}
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
        </PackageDocumentEditorHeader>
        <PackageDocumentEditorChrome
          packageFlowStatus={packageFlowStatus}
          refusalReason={form.contractRefusalReason}
          error={error}
          excelMessage={excelMessage}
        />
        <PackageDocumentEditorTabContent {...tabContentProps} onNavigateToTab={setActiveTab} />
        <PackageDocumentEditorModals {...editorModalsProps} />
      </div>
    </PackageWorkOrderHubProvider>
  );
}
