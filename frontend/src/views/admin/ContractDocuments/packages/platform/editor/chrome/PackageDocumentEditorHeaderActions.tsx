'use client';

import { ShareIcon } from '@/shared/ui/icons';
import { VersionsHistoryIcon } from '@/shared/ui/icons/VersionsHistoryIcon';
import { PackageHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/hubModal/PackageHubIcon';
import { PACKAGE_HUB_MODAL_TITLE } from '@/views/admin/ContractDocuments/packages/platform/hub/hubModal/packageHubConstants';
import { PackageInvoicesHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageInvoicesHubIcon';
import { PACKAGE_INVOICES_MODAL_TITLE } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageInvoicesModal';
import { PackageQuestionnairesHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/questionnaires/PackageQuestionnairesHubIcon';
import { defaultPackageQuestionnaireHubTab } from '@/views/admin/ContractDocuments/packages/platform/hub/questionnaires/packageQuestionnaireHubTabs';
import { PackageWorkOrdersHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/PackageWorkOrdersHubIcon';
import { defaultPackageWorkOrderHubTab } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/packageWorkOrderHubTabs';
import type { PackageDocumentTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageDocumentTabs';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import type { PackageDocumentEditorHeaderProps } from './PackageDocumentEditorHeader';

type PackageDocumentEditorHeaderActionsProps = Pick<
  PackageDocumentEditorHeaderProps,
  | 'packageKind'
  | 'loading'
  | 'packageRefreshing'
  | 'activeTab'
  | 'headerContractNumberLabel'
  | 'unsignedAddendumOrdinals'
  | 'paymentInvoiceCount'
  | 'unassignedInteractiveRowsCount'
  | 'form'
  | 'onOpenPackageHub'
  | 'onOpenInvoicesHub'
  | 'onOpenWorkOrdersHub'
  | 'onOpenQuestionnairesHub'
  | 'onOpenVersionsHistory'
  | 'onOpenCustomerShare'
  | 'onOpenRemoteSigning'
  | 'onRefreshFromServer'
  | 'onPrint'
>;

function printActionLabel(activeTab: PackageDocumentTabId): string {
  if (activeTab === 'finalWorkOrder') return 'Печать документа';
  if (activeTab === 'finalEstimate') return 'Печать итоговой сметы';
  if (activeTab === 'specification') return 'Печать спецификации';
  return 'Печать';
}

export function PackageDocumentEditorHeaderActions({
  packageKind,
  loading,
  packageRefreshing,
  activeTab,
  headerContractNumberLabel,
  unsignedAddendumOrdinals,
  paymentInvoiceCount,
  unassignedInteractiveRowsCount,
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
}: PackageDocumentEditorHeaderActionsProps) {
  const printLabel = printActionLabel(activeTab);

  return (
    <div className={cdHub.headerActions}>
      <div className={cdHub.packageEditorDraftTitleRow}>
        {!loading ? (
          <button
            type="button"
            className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn} ${cdDataTab.packageEditorHubPrimaryBtn}`}
            onClick={onOpenPackageHub}
            title={
              unsignedAddendumOrdinals.length > 0
                ? `${PACKAGE_HUB_MODAL_TITLE}. Неподписанные Д/с: №${unsignedAddendumOrdinals.join(', №')}`
                : PACKAGE_HUB_MODAL_TITLE
            }
            aria-label={PACKAGE_HUB_MODAL_TITLE}
          >
            <PackageHubIcon />
            <span className={cdDataTab.packageEditorHubBtnLabel}>Оплаты и этапы</span>
            {unsignedAddendumOrdinals.length > 0 ? (
              <span
                className={cdDataTab.packageEditorHubPendingBadge}
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
            className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn} ${cdDataTab.packageEditorHubPrimaryBtn}`}
            onClick={onOpenInvoicesHub}
            title={PACKAGE_INVOICES_MODAL_TITLE}
            aria-label={PACKAGE_INVOICES_MODAL_TITLE}
          >
            <PackageInvoicesHubIcon />
            <span className={cdDataTab.packageEditorHubBtnLabel}>Счета</span>
            {paymentInvoiceCount > 0 ? (
              <span
                className={cdDataTab.packageEditorHubPendingBadge}
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
            className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn} ${cdDataTab.packageEditorHubPrimaryBtn}`}
            onClick={() =>
              onOpenWorkOrdersHub(
                defaultPackageWorkOrderHubTab(null, form.addendumSlotCount, packageKind)
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
            <PackageWorkOrdersHubIcon />
            <span className={cdDataTab.packageEditorHubBtnLabel}>Заказ-наряды</span>
            {unassignedInteractiveRowsCount > 0 ? (
              <span
                className={cdDataTab.packageEditorHubPendingBadge}
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
            className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn} ${cdDataTab.packageEditorHubPrimaryBtn}`}
            onClick={() => onOpenQuestionnairesHub(defaultPackageQuestionnaireHubTab(null))}
            title={
              headerContractNumberLabel ? `Анкеты договора №${headerContractNumberLabel}` : 'Анкеты'
            }
            aria-label={
              headerContractNumberLabel ? `Анкеты договора №${headerContractNumberLabel}` : 'Анкеты'
            }
          >
            <PackageQuestionnairesHubIcon />
            <span className={cdDataTab.packageEditorHubBtnLabel}>Анкеты</span>
          </button>
        ) : null}
        {!loading ? (
          <button
            type="button"
            className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn}`}
            onClick={onOpenCustomerShare}
            title={
              headerContractNumberLabel
                ? `Отправить заказчику документы договора №${headerContractNumberLabel}`
                : 'Отправить заказчику'
            }
            aria-label={
              headerContractNumberLabel
                ? `Отправить заказчику документы договора №${headerContractNumberLabel}`
                : 'Отправить заказчику (Telegram, WhatsApp, MAX, почта)'
            }
          >
            <ShareIcon />
          </button>
        ) : null}
        {!loading ? (
          <button
            type="button"
            className={`${cdWorkspace.secondaryBtn} ${cdChrome.estimatesPageRefreshIconBtn}`}
            onClick={onOpenRemoteSigning}
            title={
              headerContractNumberLabel
                ? `Отправить на подписание договор №${headerContractNumberLabel}`
                : 'Отправить на подписание'
            }
            aria-label="Отправить на дистанционное подписание"
          >
            <span style={{ fontSize: 12, fontWeight: 700 }}>ЭП</span>
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
          data-admin-mutation
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
            title={printLabel}
            aria-label={printLabel}
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
  );
}
