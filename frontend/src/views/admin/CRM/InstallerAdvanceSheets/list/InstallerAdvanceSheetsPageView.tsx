'use client';

import { useId, useState } from 'react';

import Link from 'next/link';

import type { InstallerAdvanceSheetSummary } from '@/shared/api/crm/admin-installer-advance-sheets';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import isStyles from '@/views/admin/CRM/InstallerSettlements/InstallerSettlements.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import type { InstallerAdvanceSheetsPageModel } from '../hooks/useInstallerAdvanceSheetsPage';
import styles from '../shared/InstallerAdvanceSheets.module.css';
import {
  IAS_PAGE_LIMIT_OPTIONS,
  IAS_STATUS_OPTIONS,
  type IasPageLimit,
  formatIasCountLabel,
  formatIasDate,
  formatIasGradeShort,
  formatIasMoney,
} from '../shared/installer-advance-sheets-page.constants';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

/** Статус ведомости с учётом частичной выплаты. */
function sheetStatusLabel(item: InstallerAdvanceSheetSummary): string {
  if (item.status === 'PAID') return 'Выплачена';
  if (item.status === 'QUESTION') return 'Есть вопросы';
  if (item.paidCount > 0) return 'Выдано частично';
  return 'Ожидает выплаты';
}

function StatusBadge({ item }: { item: InstallerAdvanceSheetSummary }) {
  const label = sheetStatusLabel(item);
  const tone =
    item.status === 'PAID'
      ? 'paid'
      : item.status === 'QUESTION'
        ? 'question'
        : item.paidCount > 0
          ? 'partial'
          : 'pending';
  return <span className={`${styles.statusBadge} ${styles[`status_${tone}`]}`}>{label}</span>;
}

export function InstallerAdvanceSheetsPageView({
  model,
}: {
  model: InstallerAdvanceSheetsPageModel;
}) {
  const {
    status,
    setStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    installerId,
    setInstallerId,
    searchInput,
    setSearchInput,
    page,
    setPage,
    limit,
    setLimit,
    items,
    installers,
    total,
    loading,
    message,
    setMessage,
    refresh,
    resetFilters,
    canCreateSheets,
  } = model;

  const filtersContentId = useId();
  /** Всегда свёрнуто при открытии страницы — как в журнале ДП. */
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const toggleFiltersCollapsed = () => setFiltersCollapsed((value) => !value);

  const columns = [
    {
      key: 'number',
      title: 'Ведомость',
      render: (item: InstallerAdvanceSheetSummary) => (
        <Link href={`/admin/installer-advance-sheets/${item.id}`} className={styles.sheetLink}>
          № {item.number}
          <span className={isStyles.cellSubline}>от {formatIasDate(item.createdAt)}</span>
        </Link>
      ),
    },
    {
      key: 'installer',
      title: 'Мастер',
      render: (item: InstallerAdvanceSheetSummary) => {
        const grade = formatIasGradeShort(item.installer.grade);
        return (
          <div>
            {item.installer.name}
            {grade ? <span className={isStyles.cellSubline}>{grade}</span> : null}
          </div>
        );
      },
    },
    {
      key: 'items',
      title: 'Строки',
      render: (item: InstallerAdvanceSheetSummary) => (
        <span>
          выдано {item.paidCount} из {item.itemsCount}
          {item.questionCount > 0 ? (
            <span className={styles.questionCountSubline}>вопросов: {item.questionCount}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'amount',
      title: 'Сумма',
      render: (item: InstallerAdvanceSheetSummary) => (
        <span className={isStyles.amountCell}>
          {formatIasMoney(item.totalAmount)}
          {item.paidAmount > 0 && item.paidAmount < item.totalAmount ? (
            <span className={isStyles.cellSubline}>выдано {formatIasMoney(item.paidAmount)}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Статус',
      render: (item: InstallerAdvanceSheetSummary) => <StatusBadge item={item} />,
    },
    {
      key: 'createdBy',
      title: 'Создал',
      render: (item: InstallerAdvanceSheetSummary) => item.createdBy?.name || '—',
    },
    {
      key: 'actions',
      title: '',
      render: (item: InstallerAdvanceSheetSummary) => (
        <Link
          href={`/admin/installer-advance-sheets/${item.id}`}
          className={styles.openLink}
          aria-label={`Открыть ведомость № ${item.number}`}
        >
          Открыть
        </Link>
      ),
    },
  ];

  return (
    <div
      className={`${cdBase.page} ${cdWorkspace.pageWide} ${isStyles.pageFull} ${cdHub.contractsListPage}`}
    >
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Расчётники мастеров</h1>
              </div>
              <span
                className={cdHub.contractsListCount}
                title={`${formatIasCountLabel(total)} в разделе`}
              >
                <span className={cdHub.contractsListCountDesktop}>
                  {formatIasCountLabel(total)}
                </span>
                <span className={cdHub.contractsListCountMobile}>{total}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Обновить список ведомостей"
                aria-label="Обновить список ведомостей"
                onClick={() => void refresh()}
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          {canCreateSheets ? (
            <Link
              href="/admin/installer-advance-sheets/new"
              data-admin-mutation
              className={cdChrome.contractsListHeaderAddBtn}
            >
              + Ведомость
            </Link>
          ) : null}
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить список ведомостей"
              aria-label="Обновить список ведомостей"
              onClick={() => void refresh()}
            />
          </div>
        </div>
      </div>

      {message ? (
        <div className={isStyles.pageMessage}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <section className={cdHub.contractsListFiltersPanel} aria-label="Фильтры ведомостей">
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
              {filtersCollapsed ? 'Фильтры ведомостей' : 'Свернуть фильтры'}
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
          <div className={cdHub.contractsListFiltersSummary} aria-hidden>
            <span className={cdHub.contractsListFiltersSummaryChip}>
              {status ? IAS_STATUS_OPTIONS.find((o) => o.value === status)?.label : 'Все статусы'}
            </span>
            {searchInput.trim() ? (
              <span className={cdHub.contractsListFiltersSummaryChip}>«{searchInput.trim()}»</span>
            ) : null}
          </div>
        ) : (
          <div id={filtersContentId} className={cdHub.contractsListFiltersPanelBody}>
            <div className={cdHub.contractsListFiltersStack}>
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус">
                <span className={cdHub.contractsListChipRowLabel}>Статус</span>
                <button
                  type="button"
                  disabled={loading}
                  className={chipClass(!status)}
                  onClick={() => setStatus('')}
                >
                  Все
                </button>
                {IAS_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={loading}
                    className={chipClass(status === option.value)}
                    onClick={() => setStatus(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className={cdHub.contractsListFilters}>
                <input
                  type="search"
                  placeholder="Поиск: № ведомости, мастер, № договора, заказчик…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={filterFieldClass(
                    cdHub.contractsListSearchInput,
                    Boolean(searchInput.trim())
                  )}
                  aria-label="Поиск по ведомостям"
                />
                <select
                  value={installerId}
                  onChange={(e) => setInstallerId(e.target.value)}
                  disabled={loading}
                  className={filterFieldClass(cdHub.contractsListSelect, Boolean(installerId))}
                  aria-label="Мастер"
                >
                  <option value="">Все мастера</option>
                  {installers.map((installer) => (
                    <option key={installer.id} value={installer.id}>
                      {installer.fullName}
                    </option>
                  ))}
                </select>
                <div className={cdHub.contractsListDateFilters}>
                  <label className={cdHub.contractsListDateLabel}>
                    <span className={cdHub.contractsListDateLabelText}>Создана от</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      disabled={loading}
                      className={filterFieldClass(cdHub.contractsListDateInput, Boolean(dateFrom))}
                      aria-label="Дата создания от"
                    />
                  </label>
                  <label className={cdHub.contractsListDateLabel}>
                    <span className={cdHub.contractsListDateLabelText}>до</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      disabled={loading}
                      className={filterFieldClass(cdHub.contractsListDateInput, Boolean(dateTo))}
                      aria-label="Дата создания до"
                    />
                  </label>
                </div>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value) as IasPageLimit)}
                  disabled={loading}
                  className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
                  aria-label="Количество строк на странице"
                >
                  {IAS_PAGE_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} на странице
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={isStyles.resetBtn}
                  onClick={resetFilters}
                  disabled={loading}
                >
                  Сбросить
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Ведомостей по выбранным фильтрам нет"
        serverSidePagination
        pagination={{
          page,
          limit,
          total,
          onPageChange: setPage,
        }}
        paginationClassName={cdHub.contractsListPagination}
        paginationActiveClassName={cdHub.contractsListPaginationPageActive}
      />
    </div>
  );
}
