'use client';

import Link from 'next/link';

import { Modal } from '@/shared/ui/Modal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import { PackageIssueInvoicePanel } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageIssueInvoicePanel';

import { contractsListFilterFieldClass } from '../ContractDocuments/packages/pages/contracts/list/contractsListFormatters';
import cdBase from '../ContractDocuments/styles/base.module.css';
import cdHub from '../ContractDocuments/styles/contracts-list-hub.module.css';
import cdDataTab from '../ContractDocuments/styles/data-tab.module.css';
import cdChrome from '../ContractDocuments/styles/editor-chrome.module.css';
import pageStyles from './AccountingInvoicesPage.module.css';
import { PackageInvoicesModalLoader } from './PackageInvoicesModalLoader';
import { formatDateRu, formatMoneyRub } from './accounting-invoices-page.utils';
import type { AccountingInvoicesPageModel } from './hooks/useAccountingInvoicesPage';

type AccountingInvoicesPageViewProps = {
  model: AccountingInvoicesPageModel;
};

export function AccountingInvoicesPageView({ model }: AccountingInvoicesPageViewProps) {
  const {
    rows,
    loading,
    error,
    setError,
    search,
    setSearch,
    issueOpen,
    packagesLoading,
    selectedPackageId,
    setSelectedPackageId,
    issuePackageForm,
    issuePackageInvoices,
    issuePaymentRows,
    issueSaving,
    contractEditorOpen,
    contractEditorPackageId,
    packageOptions,
    load,
    openIssueModal,
    closeIssueModal,
    openContractInvoices,
    closeContractInvoices,
    handleIssueInvoice,
    handlePrintInvoice,
    handleDownloadInvoice,
  } = model;

  return (
    <div
      className={`${cdBase.page} ${cdBase.pageWide} ${cdHub.contractsListPage} ${pageStyles.pageMobile}`}
    >
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsListHeaderTitleGroup}>
            <h1 className={cdHub.title}>Счета на оплату</h1>
          </div>
          <span className={cdHub.contractsListCount}>{rows.length} счетов</span>
        </div>
        <div className={cdChrome.headerButtonsRow}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={loading}
            onClick={() => void openIssueModal()}
          >
            + Выставить счёт
          </button>
          <AdminListRefreshButton
            disabled={loading}
            busy={loading}
            title="Обновить список"
            aria-label={loading ? 'Обновление списка счетов' : 'Обновить список счетов'}
            onClick={() => void load()}
          />
        </div>
      </div>

      <div className={`${cdHub.contractsListFilters} ${pageStyles.toolbarSpaced}`}>
        <input
          type="search"
          placeholder="Поиск: № счёта, договор, заказчик, основание…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loading}
          className={contractsListFilterFieldClass(
            cdHub.contractsListSearchInput,
            Boolean(search.trim()),
            cdHub.contractsListFilterActive
          )}
          aria-label="Поиск по счетам"
        />
      </div>

      {error ? <p className={cdBase.errorBanner}>{error}</p> : null}

      <div className={cdBase.paymentsTableWrap}>
        <table
          className={`${cdBase.paymentsTable} ${cdBase.repairContractsTable} ${pageStyles.desktopTable}`}
        >
          <thead>
            <tr>
              <th>№ счёта</th>
              <th>Дата</th>
              <th>Договор</th>
              <th>Заказчик</th>
              <th>Основание</th>
              <th className={cdBase.paymentsHubSummaryNumCol}>Сумма</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <p className={cdBase.hint}>Загрузка…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <p className={cdBase.hint}>Счетов пока нет.</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.invoiceNumber}</td>
                  <td>{formatDateRu(row.invoiceDate)}</td>
                  <td>
                    <Link href={`/admin/contract-documents/contracts/${row.packageId}`}>
                      {row.contractNumber || '—'}
                    </Link>
                  </td>
                  <td>{row.customerName || '—'}</td>
                  <td>{row.basis}</td>
                  <td className={cdBase.paymentsHubSummaryNumCol}>{formatMoneyRub(row.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className={cdBase.paymentsHubConductSecondaryBtn}
                      onClick={() => openContractInvoices(row.packageId)}
                    >
                      Счета договора
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className={pageStyles.mobileCards} aria-label="Список счетов">
          {loading ? (
            <p className={cdBase.hint}>Загрузка…</p>
          ) : rows.length === 0 ? (
            <p className={cdBase.hint}>Счетов пока нет.</p>
          ) : (
            rows.map((row) => (
              <article key={row.id} className={pageStyles.mobileCard}>
                <div className={pageStyles.mobileCardTop}>
                  <div className={pageStyles.mobileCardNumber}>№ {row.invoiceNumber}</div>
                  <div className={pageStyles.mobileCardAmount}>{formatMoneyRub(row.amount)}</div>
                </div>
                <dl className={pageStyles.mobileCardRows}>
                  <div className={pageStyles.mobileCardRow}>
                    <dt>Дата</dt>
                    <dd>{formatDateRu(row.invoiceDate)}</dd>
                  </div>
                  <div className={pageStyles.mobileCardRow}>
                    <dt>Договор</dt>
                    <dd>
                      <Link
                        href={`/admin/contract-documents/contracts/${row.packageId}`}
                        className={pageStyles.mobileCardLink}
                      >
                        {row.contractNumber || '—'}
                      </Link>
                    </dd>
                  </div>
                  <div className={pageStyles.mobileCardRow}>
                    <dt>Заказчик</dt>
                    <dd>{row.customerName || '—'}</dd>
                  </div>
                  <div className={pageStyles.mobileCardRow}>
                    <dt>Основание</dt>
                    <dd>{row.basis}</dd>
                  </div>
                </dl>
                <div className={pageStyles.mobileCardActions}>
                  <button
                    type="button"
                    className={pageStyles.mobileCardActionBtn}
                    onClick={() => openContractInvoices(row.packageId)}
                  >
                    Счета договора
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={issueOpen}
        onClose={closeIssueModal}
        title="Выставить счёт по договору"
        size="lg"
        className={crmFormStyles.modalPanel}
        showCloseButton
        compactOnMobile
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint className={pageStyles.modalHint}>
            Выберите договор, основание и позиции в таблице. Итог и номер счёта подставляются
            автоматически.
          </p>
          <div
            className={`${cdBase.field} ${cdDataTab.contractInlineField} ${pageStyles.modalFieldSpaced}`}
          >
            <label htmlFor="accounting_issue_package">Договор</label>
            <select
              id="accounting_issue_package"
              value={selectedPackageId}
              disabled={packagesLoading}
              onChange={(e) => setSelectedPackageId(e.target.value)}
            >
              <option value="">— выберите договор —</option>
              {packageOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {selectedPackageId ? (
            <PackageIssueInvoicePanel
              packageId={selectedPackageId}
              form={issuePackageForm}
              issuedRows={issuePackageInvoices}
              paymentRows={issuePaymentRows}
              onError={setError}
              saving={issueSaving}
              onIssue={handleIssueInvoice}
              onPrint={handlePrintInvoice}
              onDownload={handleDownloadInvoice}
              showIssuedTable={false}
            />
          ) : null}
        </div>
      </Modal>

      {contractEditorOpen && contractEditorPackageId ? (
        <PackageInvoicesModalLoader
          packageId={contractEditorPackageId}
          isOpen={contractEditorOpen}
          onClose={closeContractInvoices}
          onError={setError}
          onInvoicesChanged={() => void load()}
        />
      ) : null}
    </div>
  );
}
