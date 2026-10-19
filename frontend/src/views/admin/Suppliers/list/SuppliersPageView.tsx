'use client';

import { useId, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import type { AdminSupplierSummaryRow } from '@/shared/api/admin-suppliers';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { SuppliersRulesInfoTip } from '../SuppliersRulesInfoTip';
import { SupplierFormModal } from '../modals/SupplierFormModal';
import {
  BALANCE_STATUS_LABELS,
  formatSupplierDate,
  formatSupplierMoney,
} from '../suppliers-page.utils';
import styles from './SuppliersPage.module.css';
import type { SuppliersPageModel } from './hooks/useSuppliersPage';
import {
  SUPPLIERS_PAGE_LIMIT_OPTIONS,
  SUPPLIER_SORT_OPTIONS,
  SUPPLIER_STATUS_CHIPS,
  type SuppliersPageLimit,
} from './suppliers-page.constants';

type SuppliersPageViewProps = {
  model: SuppliersPageModel;
};

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

/** Сальдо с бейджем статуса: «К оплате» / «Расчёты завершены» / «Переплата». */
function BalanceCell({ row }: { row: AdminSupplierSummaryRow }) {
  const toneClass =
    row.status === 'PAYABLE'
      ? styles.badgePayable
      : row.status === 'OVERPAY'
        ? styles.badgeOverpay
        : styles.badgeSettled;
  const balanceClass =
    row.status === 'PAYABLE'
      ? styles.balancePayable
      : row.status === 'OVERPAY'
        ? styles.balanceOverpay
        : styles.balanceSettled;
  return (
    <span className={styles.supplierCell}>
      <strong className={balanceClass}>{formatSupplierMoney(row.balance)}</strong>
      {row.status !== 'SETTLED' ? (
        <span className={`${styles.badge} ${toneClass}`}>{BALANCE_STATUS_LABELS[row.status]}</span>
      ) : null}
    </span>
  );
}

/** Сводный список поставщиков — итоговая вкладка раздела (аналог «Итого» таблицы). */
export function SuppliersPageView({ model }: SuppliersPageViewProps) {
  const {
    rows,
    totals,
    total,
    page,
    setPage,
    limit,
    setLimit,
    loading,
    error,
    setError,
    load,
    search,
    setSearch,
    status,
    setStatus,
    sort,
    order,
    setSort,
    setOrder,
    resetFilters,
    filtersCollapsed,
    toggleFiltersCollapsed,
    editSupplier,
    openCreateModal,
    openEditModal,
    closeModal,
    saving,
    handleSave,
    canEdit,
  } = model;

  const router = useRouter();
  const filtersContentId = useId();

  const countTitle = `${total} ${total === 1 ? 'поставщик' : 'поставщиков'}`;

  const filtersSummary = useMemo(() => {
    const chips: { key: string; label: string }[] = [
      {
        key: 'status',
        label: `Статус: ${SUPPLIER_STATUS_CHIPS.find((c) => c.value === status)?.label ?? 'Все'}`,
      },
    ];
    if (search.trim()) chips.push({ key: 'search', label: `Поиск: ${search.trim()}` });
    return chips;
  }, [status, search]);

  const columns = useMemo(
    () => [
      {
        key: 'name',
        title: 'Поставщик',
        sortable: true,
        render: (item: AdminSupplierSummaryRow) => (
          <div className={styles.supplierCell}>
            <span className={styles.supplierCellName}>{item.legalName}</span>
            {(item.commercialName || item.inn) && (
              <span className={styles.supplierCellSub}>
                {[item.commercialName, item.inn].filter(Boolean).join(' · ')}
              </span>
            )}
            {!item.isActive ? (
              <span className={`${styles.badge} ${styles.badgeNeutral}`}>Неактивен</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'requisiteCount',
        title: 'Реквизиты',
        width: '110px',
        render: (item: AdminSupplierSummaryRow) =>
          item.requisiteCount > 0 ? `${item.requisiteCount} блок(а)` : '—',
      },
      {
        key: 'openingBalance',
        title: 'Сальдо нач.',
        render: (item: AdminSupplierSummaryRow) => formatSupplierMoney(item.openingBalance),
      },
      {
        key: 'amountSum',
        title: 'Начислено (счета)',
        render: (item: AdminSupplierSummaryRow) => formatSupplierMoney(item.amountSum),
      },
      {
        key: 'paymentSum',
        title: 'Оплачено',
        render: (item: AdminSupplierSummaryRow) => formatSupplierMoney(item.paymentSum),
      },
      {
        key: 'balance',
        title: 'К оплате',
        sortable: true,
        render: (item: AdminSupplierSummaryRow) => <BalanceCell row={item} />,
      },
      {
        key: 'lastEntry',
        title: 'Последняя запись',
        sortable: true,
        width: '140px',
        render: (item: AdminSupplierSummaryRow) => formatSupplierDate(item.lastEntryDate),
      },
      {
        key: 'actions',
        title: '',
        width: '90px',
        render: (item: AdminSupplierSummaryRow) => (
          <span className={styles.rowActions}>
            <button
              type="button"
              className={styles.rowActionBtn}
              disabled={!canEdit || loading}
              onClick={(e) => {
                e.stopPropagation();
                openEditModal(item.id);
              }}
              title={canEdit ? 'Реквизиты и карточка поставщика' : 'Нет прав на изменение'}
            >
              Карточка
            </button>
          </span>
        ),
      },
    ],
    [canEdit, loading, openEditModal]
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Поставщики</h1>
                <SuppliersRulesInfoTip />
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{total}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Обновить список"
                aria-label="Обновление списка поставщиков"
                onClick={() => void load()}
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={loading || !canEdit}
            onClick={openCreateModal}
            title={canEdit ? 'Новый поставщик' : 'Нет прав на изменение раздела'}
          >
            + Поставщик
          </button>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить список"
              aria-label="Обновление списка поставщиков"
              onClick={() => void load()}
            />
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

      {/* Итоги — как «Итого к оплате» на первой вкладке таблицы. */}
      <div
        className={`${dpStyles.totalsRow}${loading ? ` ${dpStyles.totalsRowLoading}` : ''}`}
        aria-label="Итоги расчётов с поставщиками"
      >
        <div className={`${dpStyles.totalsTile} ${dpStyles.totalsTileTotal}`}>
          <span className={dpStyles.totalsTileLabel}>Итого к оплате</span>
          <strong className={`${dpStyles.totalsTileValue} ${styles.balancePayable}`}>
            {formatSupplierMoney(totals?.payable ?? 0)}
          </strong>
        </div>
        <div className={dpStyles.totalsTile} title="Сумма отрицательных сальдо поставщиков">
          <span className={dpStyles.totalsTileLabel}>Переплата</span>
          <strong className={`${dpStyles.totalsTileValue} ${styles.balanceOverpay}`}>
            {formatSupplierMoney(totals?.overpay ?? 0)}
          </strong>
        </div>
        <div className={dpStyles.totalsTile} title="Поставщики с положительным сальдо">
          <span className={dpStyles.totalsTileLabel}>С задолженностью</span>
          <strong className={dpStyles.totalsTileValue}>
            {totals ? `${totals.suppliersWithDebt} из ${totals.suppliersTotal}` : '—'}
          </strong>
        </div>
        <div className={dpStyles.totalsTile} title="Всего поставщиков в разделе">
          <span className={dpStyles.totalsTileLabel}>Всего поставщиков</span>
          <strong className={dpStyles.totalsTileValue}>{totals?.suppliersTotal ?? total}</strong>
        </div>
      </div>

      <section className={cdHub.contractsListFiltersPanel} aria-label="Фильтры поставщиков">
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
              {filtersCollapsed ? 'Фильтры поставщиков' : 'Свернуть фильтры'}
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
            aria-label="Развернуть фильтры поставщиков"
          >
            {filtersSummary.map((item) => (
              <span
                key={item.key}
                className={cdHub.contractsListFiltersSummaryChip}
                data-filter-key={item.key}
                title={item.label}
              >
                {item.label}
              </span>
            ))}
          </button>
        ) : (
          <div id={filtersContentId} className={cdHub.contractsListFiltersPanelBody}>
            <div className={cdHub.contractsListFiltersStack}>
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус расчётов">
                <span className={cdHub.contractsListChipRowLabel}>Статус</span>
                {SUPPLIER_STATUS_CHIPS.map((chip) => (
                  <button
                    key={chip.value}
                    type="button"
                    disabled={loading}
                    className={`${cdHub.contractsListChip}${
                      status === chip.value ? ` ${cdHub.contractsListChipActive}` : ''
                    }`}
                    onClick={() => setStatus(chip.value)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className={cdHub.contractsListFilters}>
                <input
                  type="search"
                  placeholder="Поиск: название или ИНН…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={filterFieldClass(
                    cdHub.contractsListSearchInput,
                    Boolean(search.trim())
                  )}
                  aria-label="Поиск по поставщикам"
                />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  disabled={loading}
                  className={filterFieldClass(cdHub.contractsListSelect, sort !== 'name')}
                  aria-label="Сортировка списка"
                >
                  {SUPPLIER_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={cdHub.contractsListChip}
                  disabled={loading}
                  onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                  title={order === 'asc' ? 'По возрастанию — сменить' : 'По убыванию — сменить'}
                >
                  {order === 'asc' ? '↑ Возр.' : '↓ Убыв.'}
                </button>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value) as SuppliersPageLimit)}
                  disabled={loading}
                  className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
                  aria-label="Количество строк на странице"
                >
                  {SUPPLIERS_PAGE_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} на странице
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={dpStyles.resetBtn}
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
        data={rows}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage={search.trim() ? 'Поставщики по запросу не найдены' : 'Поставщиков пока нет'}
        onRowClick={(item) => router.push(`/admin/suppliers/${item.id}`)}
        serverSidePagination
        pagination={{ page, limit, total, onPageChange: setPage }}
        paginationClassName={cdHub.contractsListPagination}
        paginationActiveClassName={cdHub.contractsListPaginationPageActive}
        serverSideSort
        controlledSortBy={sort}
        controlledSortOrder={order}
        onSortChange={(sortBy, sortOrder) => {
          if (sortBy === 'balance' || sortBy === 'lastEntry' || sortBy === 'name') {
            setSort(sortBy);
          }
          setOrder(sortOrder);
        }}
      />

      <SupplierFormModal
        open={editSupplier !== undefined}
        onClose={closeModal}
        initial={editSupplier || null}
        submitting={saving}
        onSubmit={handleSave}
      />
    </div>
  );
}
