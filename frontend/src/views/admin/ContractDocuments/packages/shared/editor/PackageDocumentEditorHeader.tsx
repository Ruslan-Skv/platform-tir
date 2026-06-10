'use client';

import Link from 'next/link';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { VersionsHistoryIcon } from '@/shared/ui/icons/VersionsHistoryIcon';
import { ADMIN_CONTRACT_DOCUMENTS_CONTRACTS_HREF } from '@/views/admin/ContractDocuments/packages/config/contractDocumentsContractsRoutes';
import type { RepairDocumentTabId } from '@/views/admin/ContractDocuments/packages/directions/repair/documents/repairDocumentTabs';
import {
  type RepairQuestionnaireHubTabId,
  defaultRepairQuestionnaireHubTab,
} from '@/views/admin/ContractDocuments/packages/directions/repair/questionnaires/repairQuestionnaireHubTabs';
import type { RepairPackageFormData } from '@/views/admin/ContractDocuments/packages/directions/repair/repairPackageForm';
import {
  type RepairWorkOrderHubTabId,
  defaultRepairWorkOrderHubTab,
} from '@/views/admin/ContractDocuments/packages/directions/repair/workOrders/repairWorkOrderHubTabs';
import { RepairContractInvoicesHubIcon } from '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractInvoicesHubIcon';
import { REPAIR_CONTRACT_INVOICES_MODAL_TITLE } from '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractInvoicesModal';
import { RepairContractPackageHubIcon } from '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractPackageHubIcon';
import { RepairContractQuestionnairesHubIcon } from '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractQuestionnairesHubIcon';
import { RepairContractWorkOrdersHubIcon } from '@/views/admin/ContractDocuments/packages/shared/hub/RepairContractWorkOrdersHubIcon';
import { REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE } from '@/views/admin/ContractDocuments/packages/shared/hub/repairContractPackageHubConstants';

import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdDataTab from '../../../styles/data-tab.module.css';
import cdChrome from '../../../styles/editor-chrome.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import { packageKindUiLabel } from '../../config';

export type PackageDocumentEditorHeaderProps = {
  packageKind: ContractDocumentPackageKind;
  loading: boolean;
  packageRefreshing: boolean;
  activeTab: RepairDocumentTabId;
  headerContractNumberLabel: string;
  headerContractConcludedDateLabel: string | null;
  unsignedAddendumOrdinals: number[];
  paymentInvoiceCount: number;
  unassignedInteractiveRowsCount: number;
  form: RepairPackageFormData;
  onOpenPackageHub: () => void;
  onOpenInvoicesHub: () => void;
  onOpenWorkOrdersHub: (defaultTab: RepairWorkOrderHubTabId) => void;
  onOpenQuestionnairesHub: (defaultTab: RepairQuestionnaireHubTabId) => void;
  onOpenVersionsHistory: () => void;
  onRefreshFromServer: () => void;
  onPrint: () => void;
};

export function PackageDocumentEditorHeader({
  packageKind,
  loading,
  packageRefreshing,
  activeTab,
  headerContractNumberLabel,
  headerContractConcludedDateLabel,
  unsignedAddendumOrdinals,
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
}: PackageDocumentEditorHeaderProps) {
  return (
    <div className={`${cdHub.editorHeader} ${cdHub.blockHeader}`}>
      <div className={cdChrome.repairEditorHeaderLeft}>
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
                className={cdHub.repairHeaderContractSignedDate}
                title="Дата присвоения статуса «Договор подписан»"
              >
                {` от ${headerContractConcludedDateLabel}`}
              </span>
            ) : null}
          </h1>
        </div>
      </div>
      <div className={cdHub.headerActions}>
        <div className={cdHub.repairEditorDraftTitleRow}>
          {!loading ? (
            <button
              type="button"
              className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn} ${cdDataTab.repairEditorHubPrimaryBtn}`}
              onClick={onOpenPackageHub}
              title={
                unsignedAddendumOrdinals.length > 0
                  ? `${REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE}. Неподписанные Д/с: №${unsignedAddendumOrdinals.join(', №')}`
                  : REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE
              }
              aria-label={REPAIR_CONTRACT_PACKAGE_HUB_MODAL_TITLE}
            >
              <RepairContractPackageHubIcon />
              <span className={cdDataTab.repairEditorHubBtnLabel}>Оплаты и этапы</span>
              {unsignedAddendumOrdinals.length > 0 ? (
                <span
                  className={cdDataTab.repairEditorHubPendingBadge}
                  title={`Неподписанные Д/с: ${unsignedAddendumOrdinals.map((n) => `№${n}`).join(', ')}`}
                >
                  {unsignedAddendumOrdinals.length}
                </span>
              ) : null}
            </button>
          ) : null}
          {!loading ? (
            <button
              type="button"
              className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn} ${cdDataTab.repairEditorHubPrimaryBtn}`}
              onClick={onOpenInvoicesHub}
              title={REPAIR_CONTRACT_INVOICES_MODAL_TITLE}
              aria-label={REPAIR_CONTRACT_INVOICES_MODAL_TITLE}
            >
              <RepairContractInvoicesHubIcon />
              <span className={cdDataTab.repairEditorHubBtnLabel}>Счета</span>
              {paymentInvoiceCount > 0 ? (
                <span
                  className={cdDataTab.repairEditorHubPendingBadge}
                  title={`Выставлено счетов: ${paymentInvoiceCount}`}
                >
                  {paymentInvoiceCount}
                </span>
              ) : null}
            </button>
          ) : null}
          {!loading ? (
            <button
              type="button"
              className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn} ${cdDataTab.repairEditorHubPrimaryBtn}`}
              onClick={() =>
                onOpenWorkOrdersHub(
                  defaultRepairWorkOrderHubTab(null, form.addendumSlotCount, packageKind)
                )
              }
              title={
                headerContractNumberLabel
                  ? `Заказ-наряды договора №${headerContractNumberLabel}`
                  : 'Заказ-наряды'
              }
              aria-label={
                headerContractNumberLabel
                  ? `Заказ-наряды договора №${headerContractNumberLabel}`
                  : 'Заказ-наряды и итоговые сметы'
              }
            >
              <RepairContractWorkOrdersHubIcon />
              <span className={cdDataTab.repairEditorHubBtnLabel}>Заказ-наряды</span>
              {unassignedInteractiveRowsCount > 0 ? (
                <span
                  className={cdDataTab.repairEditorHubPendingBadge}
                  title="Неприкреплённые позиции в интерактивной итоговой смете"
                >
                  {unassignedInteractiveRowsCount}
                </span>
              ) : null}
            </button>
          ) : null}
          {!loading ? (
            <button
              type="button"
              className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn} ${cdDataTab.repairEditorHubPrimaryBtn}`}
              onClick={() => onOpenQuestionnairesHub(defaultRepairQuestionnaireHubTab(null))}
              title={
                headerContractNumberLabel
                  ? `Анкеты договора №${headerContractNumberLabel}`
                  : 'Анкеты'
              }
              aria-label={
                headerContractNumberLabel
                  ? `Анкеты договора №${headerContractNumberLabel}`
                  : 'Анкеты'
              }
            >
              <RepairContractQuestionnairesHubIcon />
              <span className={cdDataTab.repairEditorHubBtnLabel}>Анкеты</span>
            </button>
          ) : null}
          {!loading ? (
            <button
              type="button"
              className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn}`}
              onClick={onOpenVersionsHistory}
              title={
                headerContractNumberLabel
                  ? `Журнал событий договора №${headerContractNumberLabel}`
                  : 'Журнал событий договора'
              }
              aria-label={
                headerContractNumberLabel
                  ? `Открыть журнал событий договора №${headerContractNumberLabel}`
                  : 'Открыть журнал событий договора'
              }
            >
              <VersionsHistoryIcon />
            </button>
          ) : null}
          <button
            type="button"
            className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn}`}
            disabled={packageRefreshing}
            aria-busy={packageRefreshing}
            aria-label={packageRefreshing ? 'Обновление данных' : 'Обновить данные с сервера'}
            title="Сохранить несохранённые правки и обновить данные с сервера"
            onClick={onRefreshFromServer}
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
              className={packageRefreshing ? cdChrome.estimatesRefreshIconSpinning : undefined}
              aria-hidden
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
          {activeTab !== 'data' ? (
            <button
              type="button"
              className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn}`}
              onClick={onPrint}
              title={
                activeTab === 'finalWorkOrder'
                  ? 'Печать документа'
                  : activeTab === 'finalEstimate'
                    ? 'Печать итоговой сметы'
                    : activeTab === 'specification'
                      ? 'Печать спецификации'
                      : 'Печать'
              }
              aria-label={
                activeTab === 'finalWorkOrder'
                  ? 'Печать документа'
                  : activeTab === 'finalEstimate'
                    ? 'Печать итоговой сметы'
                    : activeTab === 'specification'
                      ? 'Печать спецификации'
                      : 'Печать'
              }
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
                aria-hidden
              >
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect width="12" height="8" x="6" y="14" rx="1" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
