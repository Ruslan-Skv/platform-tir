'use client';

import { useId, useMemo } from 'react';

import Link from 'next/link';

import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { Modal } from '@/shared/ui/Modal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { AdminToolbarTrashButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import {
  DeleteIcon,
  DocumentsIcon,
  DownloadIcon,
  PrintIcon,
  ShareIcon,
  SignatureEpIcon,
} from '@/shared/ui/icons';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import { PackageIssueInvoicePanel } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageIssueInvoicePanel';
import { PackageInvoiceShareModal } from '@/views/admin/ContractDocuments/packages/platform/share/PackageInvoiceShareModal';

import { contractsListFilterFieldClass } from '../ContractDocuments/packages/pages/contracts/list/contractsListFormatters';
import cdBase from '../ContractDocuments/styles/base.module.css';
import cdHub from '../ContractDocuments/styles/contracts-list-hub.module.css';
import cdDataTab from '../ContractDocuments/styles/data-tab.module.css';
import cdChrome from '../ContractDocuments/styles/editor-chrome.module.css';
import pageStyles from './AccountingInvoicesPage.module.css';
import { currentMonthStartIso } from './Bank/bank-page.constants';
import { InvoicesTrashModal } from './InvoicesTrashModal';
import { PackageInvoicesModalLoader } from './PackageInvoicesModalLoader';
import { formatDateRu, formatMoneyRub } from './accounting-invoices-page.utils';
import {
  type AccountingInvoicesPageModel,
  INVOICES_PAGE_LIMIT_OPTIONS,
  type InvoicesPageLimit,
} from './hooks/useAccountingInvoicesPage';

type AccountingInvoicesPageViewProps = {
  model: AccountingInvoicesPageModel;
};

function formatInvoicesCount(count: number): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return `${count} счетов`;
  if (n1 > 1 && n1 < 5) return `${count} счёта`;
  if (n1 === 1) return `${count} счёт`;
  return `${count} счетов`;
}

/** Подсказка иконки ЭП: подписать / отменить подпись (как в модалке счетов договора). */
function epToggleTitle(invoice: ContractDocumentPaymentInvoice): string {
  if (!invoice.signedAt) {
    return 'Подписать счёт ЭП со стороны Подрядчика (без подписи заказчика)';
  }
  const who = [invoice.signedBy?.lastName, invoice.signedBy?.firstName].filter(Boolean).join(' ');
  return `Счёт подписан ЭП со стороны Подрядчика${who ? ` — ${who}` : ''}. Нажмите, чтобы отменить подпись`;
}

export function AccountingInvoicesPageView({ model }: AccountingInvoicesPageViewProps) {
  const {
    rows,
    loading,
    error,
    setError,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    setPeriod,
    resetFilters,
    filtersCollapsed,
    toggleFiltersCollapsed,
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
    shareInvoice,
    openShareInvoice,
    closeShareInvoice,
    handleIssueInvoice,
    handlePrintInvoice,
    handleDownloadInvoice,
    rowBusyId,
    handlePrintRow,
    handleDownloadRow,
    handleToggleEpRow,
    isSuperAdmin,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDeleteInvoice,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
    canEdit,
  } = model;

  const filtersContentId = useId();

  const countTitle = formatInvoicesCount(rows.length);

  const periodChipLabel = `Период: ${dateFrom ? formatDateRu(dateFrom) : '…'} — ${
    dateTo ? formatDateRu(dateTo) : '…'
  }`;

  const columns = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        title: '№ счёта',
        render: (item: (typeof rows)[number]) => item.invoiceNumber,
      },
      {
        key: 'invoiceDate',
        title: 'Дата',
        render: (item: (typeof rows)[number]) => formatDateRu(item.invoiceDate),
      },
      {
        key: 'contractNumber',
        title: 'Договор',
        render: (item: (typeof rows)[number]) => (
          <Link href={`/admin/contract-documents/contracts/${item.packageId}`}>
            {item.contractNumber || '—'}
          </Link>
        ),
      },
      {
        key: 'customerName',
        title: 'Заказчик',
        render: (item: (typeof rows)[number]) => item.customerName || '—',
      },
      {
        key: 'basis',
        title: 'Основание',
        render: (item: (typeof rows)[number]) => item.basis,
      },
      {
        key: 'amount',
        title: 'Сумма',
        render: (item: (typeof rows)[number]) => (
          <span className={dpStyles.amountCell}>{formatMoneyRub(item.amount)}</span>
        ),
      },
      {
        key: 'invoiceActions',
        title: '',
        render: (item: ContractDocumentPaymentInvoice) => {
          const busy = rowBusyId === item.id;
          const pdfTitle = item.signedFileUrl ? 'Печать счёта (со штампом ЭП)' : 'Печать счёта';
          const downloadTitle = item.signedFileUrl
            ? 'Скачать PDF счёта (со штампом ЭП)'
            : 'Скачать PDF счёта';
          const epTitle = epToggleTitle(item);
          return (
            <div className={dpStyles.entryActions}>
              <button
                type="button"
                className={cdBase.invoiceIssuedIconBtn}
                disabled={busy}
                onClick={() => void handlePrintRow(item)}
                title={pdfTitle}
                aria-label={pdfTitle}
              >
                <PrintIcon />
              </button>
              <button
                type="button"
                className={cdBase.invoiceIssuedIconBtn}
                disabled={busy}
                onClick={() => void handleDownloadRow(item)}
                title={downloadTitle}
                aria-label={downloadTitle}
              >
                <DownloadIcon />
              </button>
              <button
                type="button"
                className={
                  item.signedAt
                    ? `${cdBase.invoiceIssuedIconBtn} ${cdBase.invoiceIssuedIconBtnSigned}`
                    : cdBase.invoiceIssuedIconBtn
                }
                disabled={busy}
                title={epTitle}
                aria-label={epTitle}
                onClick={() => void handleToggleEpRow(item)}
              >
                <SignatureEpIcon />
              </button>
              <button
                type="button"
                className={cdBase.invoiceIssuedIconBtn}
                onClick={() => openShareInvoice(item)}
                title="Отправить заказчику (Telegram, WhatsApp, MAX, почта)"
                aria-label="Отправить счёт заказчику"
              >
                <ShareIcon tone="inherit" />
              </button>
              <button
                type="button"
                className={cdBase.invoiceIssuedIconBtn}
                onClick={() => openContractInvoices(item.packageId)}
                title="Счета договора — модалка «Счета на оплату по договору»"
                aria-label="Счета договора"
              >
                <DocumentsIcon />
              </button>
              {isSuperAdmin ? (
                <button
                  type="button"
                  className={cdBase.invoiceIssuedIconBtn}
                  onClick={() => setDeleteTarget(item)}
                  title="Удалить счёт в корзину (только супер-админ)"
                  aria-label="Удалить счёт в корзину"
                >
                  <DeleteIcon tone="inherit" />
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [
      isSuperAdmin,
      openContractInvoices,
      openShareInvoice,
      setDeleteTarget,
      rowBusyId,
      handlePrintRow,
      handleDownloadRow,
      handleToggleEpRow,
    ]
  );

  return (
    <div className={`${cdBase.page} ${cdBase.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Счета на оплату</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{rows.length}</span>
              </span>
            </div>
            {/* Мобильная шапка: в строке с названием — только иконки; «+» — в ряду ниже. */}
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Обновить список счетов"
                aria-label="Обновление списка счетов"
                onClick={() => void load()}
              />
              {isSuperAdmin ? (
                <AdminToolbarTrashButton
                  trashCount={trashCount}
                  onClick={() => setTrashOpen(true)}
                  title="Корзина счетов"
                  aria-label="Корзина счетов"
                />
              ) : null}
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={loading || !canEdit}
            onClick={() => void openIssueModal()}
            title={canEdit ? 'Выставить счёт по договору' : 'Нет прав на выставление счетов'}
          >
            + Выставить счёт
          </button>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить список счетов"
              aria-label="Обновление списка счетов"
              onClick={() => void load()}
            />
            {isSuperAdmin ? (
              <AdminToolbarTrashButton
                trashCount={trashCount}
                onClick={() => setTrashOpen(true)}
                title="Корзина счетов"
                aria-label="Корзина счетов"
              />
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <div className={dpStyles.pageMessage}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <section className={cdHub.contractsListFiltersPanel} aria-label="Фильтры счетов">
        <div className={cdHub.contractsListFiltersPanelHeader}>
          <button
            type="button"
            className={cdHub.contractsListFiltersPanelToggle}
            onClick={toggleFiltersCollapsed}
            aria-expanded={!filtersCollapsed}
            aria-controls={filtersContentId}
          >
            <span className={cdHub.contractsListFiltersPanelChevron} aria-hidden>
              {filtersCollapsed ? '▸' : '▾'}
            </span>
            <span className={cdHub.contractsListFiltersPanelTitle}>
              {filtersCollapsed ? 'Фильтры счетов' : 'Свернуть фильтры'}
            </span>
          </button>
          {filtersCollapsed ? (
            <button
              type="button"
              className={cdHub.contractsListFiltersPanelExpandLink}
              onClick={toggleFiltersCollapsed}
            >
              Изменить
            </button>
          ) : null}
        </div>

        {filtersCollapsed ? (
          <button
            type="button"
            className={cdHub.contractsListFiltersSummary}
            onClick={toggleFiltersCollapsed}
            aria-label="Развернуть фильтры счетов"
          >
            <span
              className={cdHub.contractsListFiltersSummaryChip}
              data-filter-key="period"
              title={periodChipLabel}
            >
              {periodChipLabel}
            </span>
            <span
              className={cdHub.contractsListFiltersSummaryChip}
              data-filter-key="search"
              title={search.trim() || 'Поиск: все счета'}
            >
              {search.trim() ? `Поиск: ${search.trim()}` : 'Поиск: все счета'}
            </span>
          </button>
        ) : (
          <div id={filtersContentId} className={cdHub.contractsListFiltersPanelBody}>
            <div className={cdHub.contractsListFiltersStack}>
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Быстрый период">
                <span className={cdHub.contractsListChipRowLabel}>Период</span>
                {(['today', 'week', 'month'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={cdHub.contractsListChip}
                    onClick={() => setPeriod(kind)}
                  >
                    {kind === 'today' ? 'Сегодня' : kind === 'week' ? 'Неделя' : 'Месяц'}
                  </button>
                ))}
              </div>

              <div className={cdHub.contractsListFilters}>
                {/* Не блокируем поле при загрузке: disabled снимает фокус
                    (поиск с дебаунсом перезагружает список на каждом символе). */}
                <input
                  type="search"
                  placeholder="Поиск: № счёта, договор, заказчик, основание…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={contractsListFilterFieldClass(
                    cdHub.contractsListSearchInput,
                    Boolean(search.trim()),
                    cdHub.contractsListFilterActive
                  )}
                  aria-label="Поиск по счетам"
                />
                <div className={cdHub.contractsListDateFilters}>
                  <label className={cdHub.contractsListDateLabel}>
                    <span className={cdHub.contractsListDateLabelText}>Дата от</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={contractsListFilterFieldClass(
                        cdHub.contractsListDateInput,
                        Boolean(dateFrom),
                        cdHub.contractsListFilterActive
                      )}
                      aria-label="Дата счёта от"
                    />
                  </label>
                  <label className={cdHub.contractsListDateLabel}>
                    <span className={cdHub.contractsListDateLabelText}>Дата до</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={contractsListFilterFieldClass(
                        cdHub.contractsListDateInput,
                        Boolean(dateTo),
                        cdHub.contractsListFilterActive
                      )}
                      aria-label="Дата счёта до"
                    />
                  </label>
                </div>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value) as InvoicesPageLimit)}
                  className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
                  aria-label="Количество строк на странице"
                >
                  {INVOICES_PAGE_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} на странице
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={dpStyles.resetBtn}
                  onClick={resetFilters}
                  disabled={!search.trim() && !dateTo && dateFrom === currentMonthStartIso()}
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <DataTable
        data={rows}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage={search.trim() ? 'Счетов по запросу нет' : 'Счетов пока нет'}
        pagination={{
          page,
          limit,
          total: rows.length,
          onPageChange: setPage,
        }}
        paginationClassName={cdHub.contractsListPagination}
        paginationActiveClassName={cdHub.contractsListPaginationPageActive}
      />

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

      {/* Модалка счетов договора: смонтирована всегда, чтобы открытие/закрытие
          анимировались плавно (как модалка «Отправить счёт»). */}
      <PackageInvoicesModalLoader
        packageId={contractEditorPackageId}
        isOpen={contractEditorOpen}
        onClose={closeContractInvoices}
        onError={setError}
        onInvoicesChanged={() => {
          void load();
          void refreshTrashCount();
        }}
      />

      <PackageInvoiceShareModal
        isOpen={shareInvoice != null}
        onClose={closeShareInvoice}
        invoice={shareInvoice}
      />

      <ConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDeleteInvoice()}
        title="Удалить счёт в корзину"
        message={
          deleteTarget
            ? `Счёт № ${deleteTarget.invoiceNumber} от ${formatDateRu(deleteTarget.invoiceDate)} на сумму ${formatMoneyRub(deleteTarget.amount)} будет перемещён в корзину и удалён безвозвратно через 30 дней. Продолжить?`
            : ''
        }
        confirmText="Удалить"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={deleting}
      />

      <InvoicesTrashModal isOpen={trashOpen} onClose={() => setTrashOpen(false)} />
    </div>
  );
}
