'use client';

import type { ReactNode } from 'react';

import Link from 'next/link';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF } from '@/views/admin/ContractDocuments/packages/config/contractDocumentsContractsRoutes';
import type { PackageFormData } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import type { PackageQuestionnaireHubTabId } from '@/views/admin/ContractDocuments/packages/platform/hub/questionnaires/packageQuestionnaireHubTabs';
import type { PackageWorkOrderHubTabId } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/packageWorkOrderHubTabs';
import type { PackageDocumentTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageDocumentTabs';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import { packageKindUiLabel } from '../../../config';
import { PackageDocumentEditorHeaderActions } from './PackageDocumentEditorHeaderActions';
import { PackageDocumentEditorRulesInfoTip } from './PackageDocumentEditorRulesInfoTip';

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
  /** Панель вкладок редактора — нижняя строка шапки на её разделителе. */
  children?: ReactNode;
};

export function PackageDocumentEditorHeader({
  children,
  ...props
}: PackageDocumentEditorHeaderProps) {
  const { packageKind, headerContractNumberLabel, headerContractConcludedDateLabel } = props;

  return (
    <>
      <Link
        className={`${cdChrome.backLink} ${cdChrome.packageEditorBackLink}`}
        href={ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF}
      >
        ← К списку договоров ({packageKindUiLabel(packageKind)})
      </Link>
      <div className={cdHub.editorHeader}>
        <div className={cdChrome.packageEditorHeaderTop}>
          <div className={cdHub.contractsListHeaderLeft}>
            <div className={cdHub.contractsHeaderTitleRow}>
              <div className={cdHub.contractsHeaderTitleCluster}>
                <div className={cdHub.contractsListHeaderTitleGroup}>
                  <h1
                    className={cdHub.title}
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
                  <PackageDocumentEditorRulesInfoTip />
                </div>
              </div>
            </div>
          </div>
          <PackageDocumentEditorHeaderActions {...props} />
        </div>
        {children}
      </div>
    </>
  );
}
