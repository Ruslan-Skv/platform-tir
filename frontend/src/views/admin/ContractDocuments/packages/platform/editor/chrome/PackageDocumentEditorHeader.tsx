'use client';

import Link from 'next/link';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF } from '@/views/admin/ContractDocuments/packages/config/contractDocumentsContractsRoutes';
import type { PackageFormData } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import type { PackageQuestionnaireHubTabId } from '@/views/admin/ContractDocuments/packages/platform/hub/questionnaires/packageQuestionnaireHubTabs';
import type { PackageWorkOrderHubTabId } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/packageWorkOrderHubTabs';
import type { PackageDocumentTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageDocumentTabs';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import { packageKindUiLabel } from '../../../config';
import { PackageDocumentEditorHeaderActions } from './PackageDocumentEditorHeaderActions';

export type PackageDocumentEditorHeaderProps = {
  packageKind: ContractDocumentPackageKind;
  loading: boolean;
  packageRefreshing: boolean;
  activeTab: PackageDocumentTabId;
  headerContractNumberLabel: string;
  headerContractConcludedDateLabel: string | null;
  unsignedAddendumOrdinals: number[];
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
};

export function PackageDocumentEditorHeader(props: PackageDocumentEditorHeaderProps) {
  const { packageKind, headerContractNumberLabel, headerContractConcludedDateLabel } = props;

  return (
    <div className={`${cdHub.editorHeader} ${cdHub.blockHeader}`}>
      <div className={cdChrome.packageEditorHeaderLeft}>
        <Link className={cdChrome.backLink} href={ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}>
          ← К списку договоров ({packageKindUiLabel(packageKind)})
        </Link>
        <div className={cdHub.editorHeaderTitleRow}>
          <h1
            className={cdWorkspace.title}
            aria-label={
              headerContractConcludedDateLabel
                ? `Договор ${headerContractNumberLabel} от ${headerContractConcludedDateLabel}`
                : 'Пакет документов'
            }
          >
            {headerContractNumberLabel}
            {headerContractConcludedDateLabel ? (
              <span
                className={cdHub.packageHeaderContractSignedDate}
                title="Дата присвоения статуса «Договор подписан»"
              >
                {` от ${headerContractConcludedDateLabel}`}
              </span>
            ) : null}
          </h1>
        </div>
      </div>
      <PackageDocumentEditorHeaderActions {...props} />
    </div>
  );
}
