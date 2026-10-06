'use client';

import { useId, useMemo } from 'react';

import type { CashBookEntry, CashBookManagerTotals } from '@/shared/api/accounting/admin-cash-book';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import { ManualEntryModal } from '@/views/admin/CRM/MoneyMovements/modals/ManualEntryModal';
import {
  formatDpDate,
  formatDpMoney,
  formatDpTime,
} from '@/views/admin/CRM/MoneyMovements/money-movements-page.constants';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { formatDateRu } from '../accounting-invoices-page.utils';
import {
  CASH_PAGE_LIMIT_OPTIONS,
  type CashPageLimit,
  type CashPageModel,
} from './hooks/useCashPage';

type CashPageViewProps = {
  model: CashPageModel;
};

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

function formatDpPercent(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
}

/** Плитка менеджера кассы в блоке итогов: сумма за период и доля от итога. */
function CashManagerTotalsTile({
  manager,
  grandTotal,
}: {
  manager: CashBookManagerTotals;
  grandTotal: number;
}) {
  const percent = grandTotal !== 0 ? (manager.sum / grandTotal) * 100 : null;
  return (
    <div
      className={dpStyles.totalsTile}
      title="Сумма свёрнных наличных записей менеджера за период"
    >
      <span className={dpStyles.totalsTileLabel}>{manager.name}</span>
      <span className={dpStyles.totalsTileValueRow}>
        <strong className={dpStyles.totalsTileValue}>{formatDpMoney(manager.sum)}</strong>
        {percent !== null ? (
          <span className={dpStyles.totalsTilePercent}>{formatDpPercent(percent)}</span>
        ) : null}
      </span>
    </div>
  );
}

export function CashPageView({ model }: CashPageViewProps) {
  const {
    rows,
    totalSum,
    byManager,
    managers,
    executors,
    total,
    page,
    setPage,
    limit,
    setLimit,
    loading,
    error,
    setError,
    load,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    managerId,
    setManagerId,
    search,
    setSearch,
    resetFilters,
    setPeriod,
    filtersCollapsed,
    toggleFiltersCollapsed,
    modalOpen,
    saving,
    openCreateModal,
    closeModal,
    handleCreate,
    canEdit,
    defaultManager,
  } = model;

  const filtersContentId = useId();

  const countTitle = `${total} ${total === 1 ? 'запись' : 'записей'}`;

  /** Чипы сводки фильтров в свёрнутом состоянии — как в Банке и ДП. */
  const filtersSummary = useMemo(() => {
    const chips: { key: string; label: string }[] = [
      {
        key: 'manager',
        label: managerId
          ? `Менеджер: ${managers.find((m) => m.id === managerId)?.name ?? managerId}`
          : 'Все менеджеры',
      },
    ];
    if (dateFrom || dateTo) {
      chips.push({
        key: 'period',
        label: `Период: ${dateFrom ? formatDateRu(dateFrom) : '…'} — ${dateTo ? formatDateRu(dateTo) : '…'}`,
      });
    } else {
      chips.push({ key: 'period', label: 'Период: всё время' });
    }
    if (search.trim()) chips.push({ key: 'search', label: `Поиск: ${search.trim()}` });
    return chips;
  }, [managerId, managers, dateFrom, dateTo, search]);

  const columns = useMemo(
    () => [
      {
        key: 'paymentDate',
        title: 'Дата',
        render: (item: CashBookEntry) => formatDpDate(item.paymentDate),
      },
      {
        key: 'performedAt',
        title: 'Время',
        render: (item: CashBookEntry) => formatDpTime(item.performedAt),
      },
      {
        key: 'manager',
        title: 'Менеджер',
        render: (item: CashBookEntry) => item.manager?.name || '—',
      },
      {
        key: 'direction',
        title: 'Направление',
        render: (item: CashBookEntry) => item.direction || '—',
      },
      {
        key: 'contractNumber',
        title: '№ договора',
        render: (item: CashBookEntry) => item.contractNumber || '—',
      },
      {
        key: 'customerName',
        title: 'Заказчик',
        render: (item: CashBookEntry) => item.customerName || '—',
      },
      {
        key: 'basis',
        title: 'Основание',
        render: (item: CashBookEntry) => (
          <div className={dpStyles.basisCell}>
            {item.basis || '—'}
            {item.notes ? <span className={dpStyles.basisSubline}>{item.notes}</span> : null}
          </div>
        ),
      },
      {
        key: 'amount',
        title: 'Сумма',
        render: (item: CashBookEntry) => (
          <span
            className={`${dpStyles.amountCell}${
              Number(item.amount) < 0 ? ` ${dpStyles.amountCellRefund}` : ''
            }`}
          >
            {formatDpMoney(item.amount)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Касса — наличные</h1>
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{total}</span>
              </span>
            </div>
            {/* Мобильная шапка: в строке с названием — только иконки; «+» — в ряду ниже. */}
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Обновить кассу"
                aria-label="Обновление кассы"
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
            title={canEdit ? 'Ручная запись движения наличных' : 'Нет прав на записи в кассу'}
          >
            + Запись
          </button>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить кассу"
              aria-label="Обновление кассы"
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

      {/* Блок итогов: сумма свёрнных наличных за период и разбивка по менеджерам. */}
      <div
        className={`${dpStyles.totalsRow}${loading ? ` ${dpStyles.totalsRowLoading}` : ''}`}
        aria-label="Итоги кассы за выбранный период"
      >
        <div className={`${dpStyles.totalsTile} ${dpStyles.totalsTileTotal}`}>
          <span className={dpStyles.totalsTileLabel}>Итого за период</span>
          <strong className={dpStyles.totalsTileValue}>{formatDpMoney(totalSum)}</strong>
        </div>
        {byManager.map((manager) => (
          <CashManagerTotalsTile key={manager.managerId} manager={manager} grandTotal={totalSum} />
        ))}
      </div>

      <section className={cdHub.contractsListFiltersPanel} aria-label="Фильтры кассы">
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
              {filtersCollapsed ? 'Фильтры кассы' : 'Свернуть фильтры'}
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
            aria-label="Развернуть фильтры кассы"
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
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Быстрый период">
                <span className={cdHub.contractsListChipRowLabel}>Период</span>
                {(['today', 'week', 'month'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={loading}
                    className={cdHub.contractsListChip}
                    onClick={() => setPeriod(kind)}
                  >
                    {kind === 'today' ? 'Сегодня' : kind === 'week' ? 'Неделя' : 'Месяц'}
                  </button>
                ))}
              </div>

              <div className={cdHub.contractsListFilters}>
                <input
                  type="search"
                  placeholder="Поиск: № договора, заказчик, основание…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={filterFieldClass(
                    cdHub.contractsListSearchInput,
                    Boolean(search.trim())
                  )}
                  aria-label="Поиск по кассе"
                />
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  disabled={loading}
                  className={filterFieldClass(cdHub.contractsListSelect, Boolean(managerId))}
                  aria-label="Менеджер кассы"
                >
                  <option value="">Все менеджеры</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <div className={cdHub.contractsListDateFilters}>
                  <label className={cdHub.contractsListDateLabel}>
                    <span className={cdHub.contractsListDateLabelText}>Дата от</span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      disabled={loading}
                      className={filterFieldClass(cdHub.contractsListDateInput, Boolean(dateFrom))}
                      aria-label="Дата от"
                    />
                  </label>
                  <label className={cdHub.contractsListDateLabel}>
                    <span className={cdHub.contractsListDateLabelText}>Дата до</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      disabled={loading}
                      className={filterFieldClass(cdHub.contractsListDateInput, Boolean(dateTo))}
                      aria-label="Дата до"
                    />
                  </label>
                </div>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value) as CashPageLimit)}
                  disabled={loading}
                  className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
                  aria-label="Количество строк на странице"
                >
                  {CASH_PAGE_LIMIT_OPTIONS.map((n) => (
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
        emptyMessage="Записей кассы за выбранный период нет"
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

      <ManualEntryModal
        open={modalOpen}
        onClose={closeModal}
        managers={managers}
        defaultManager={defaultManager}
        executors={executors}
        submitting={saving}
        onSubmit={handleCreate}
        fixedPaymentForm="CASH"
        heading="Запись в кассу"
      />
    </div>
  );
}
