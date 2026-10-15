'use client';

import { useId, useMemo } from 'react';

import {
  SALARY_PAYOUT_CATEGORY_LABELS,
  SALARY_PAYOUT_METHOD_LABELS,
  type SalaryPayoutItem,
} from '@/shared/api/accounting/admin-salary-payouts';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import {
  formatDpDate,
  formatDpMoney,
} from '@/views/admin/CRM/MoneyMovements/money-movements-page.constants';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { formatDateRu } from '../accounting-invoices-page.utils';
import {
  PAYOUTS_PAGE_LIMIT_OPTIONS,
  type PayoutsPageLimit,
  type PayoutsPageModel,
} from './hooks/usePayoutsPage';
import { PayoutModal } from './modals/PayoutModal';

type PayoutsPageViewProps = {
  model: PayoutsPageModel;
};

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

function formatDpPercent(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
}

/** Плитка получателя в блоке итогов: сумма выплат за период и доля от итога. */
function RecipientTotalsTile({
  recipient: { name, sum, count },
  grandTotal,
}: {
  recipient: { name: string; sum: number; count: number };
  grandTotal: number;
}) {
  const percent = grandTotal !== 0 ? (sum / grandTotal) * 100 : null;
  return (
    <div
      className={dpStyles.totalsTile}
      title={`Выплачено ${name} за период: ${count} ${count === 1 ? 'выплата' : count < 5 ? 'выплаты' : 'выплат'}`}
    >
      <span className={dpStyles.totalsTileLabel}>{name}</span>
      <span className={dpStyles.totalsTileValueRow}>
        <strong className={dpStyles.totalsTileValue}>{formatDpMoney(sum)}</strong>
        {percent !== null ? (
          <span className={dpStyles.totalsTilePercent}>{formatDpPercent(percent)}</span>
        ) : null}
      </span>
    </div>
  );
}

export function PayoutsPageView({ model }: PayoutsPageViewProps) {
  const {
    rows,
    totalSum,
    cashSum,
    bankSum,
    byRecipient,
    managers,
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
    method,
    setMethod,
    search,
    setSearch,
    resetFilters,
    setPeriod,
    filtersCollapsed,
    toggleFiltersCollapsed,
    createModalOpen,
    editing,
    saving,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSubmit,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleDelete,
    canEdit,
    canManage,
    defaultManager,
  } = model;

  const filtersContentId = useId();

  const countTitle = `${total} ${total === 1 ? 'выплата' : total < 5 ? 'выплаты' : 'выплат'}`;

  /** Чипы сводки фильтров в свёрнутом состоянии — как в Кассе и Банке. */
  const filtersSummary = useMemo(() => {
    const chips: { key: string; label: string }[] = [
      {
        key: 'method',
        label: method
          ? `Способ: ${SALARY_PAYOUT_METHOD_LABELS[method as 'CASH' | 'BANK']}`
          : 'Все способы',
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
  }, [method, dateFrom, dateTo, search]);

  const columns = useMemo(
    () => [
      {
        key: 'paidAt',
        title: 'Дата',
        render: (item: SalaryPayoutItem) => formatDpDate(item.paidAt),
      },
      {
        key: 'recipientName',
        title: 'Получатель',
        render: (item: SalaryPayoutItem) => (
          <div className={dpStyles.basisCell}>
            {item.recipientName}
            {item.source === 'DP' ? (
              <span className={dpStyles.basisSubline}>Запись журнала ДП</span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'category',
        title: 'Категория',
        render: (item: SalaryPayoutItem) =>
          SALARY_PAYOUT_CATEGORY_LABELS[item.category] ?? item.category,
      },
      {
        key: 'method',
        title: 'Способ',
        render: (item: SalaryPayoutItem) => (
          <span
            className={`${dpStyles.amountCell}${
              item.method === 'BANK' ? ` ${dpStyles.muted}` : ''
            }`}
          >
            {SALARY_PAYOUT_METHOD_LABELS[item.method]}
          </span>
        ),
      },
      {
        key: 'note',
        title: 'Примечание',
        render: (item: SalaryPayoutItem) =>
          item.note ? (
            <div className={dpStyles.basisCell}>{item.note}</div>
          ) : (
            <span className={dpStyles.muted}>—</span>
          ),
      },
      {
        key: 'manager',
        title: 'Касса / кто выдал',
        render: (item: SalaryPayoutItem) => item.manager?.name || item.createdBy?.name || '—',
      },
      {
        key: 'amount',
        title: 'Сумма',
        render: (item: SalaryPayoutItem) => (
          <span className={dpStyles.amountCell}>{formatDpMoney(item.amount)}</span>
        ),
      },
      ...(canManage
        ? [
            {
              key: 'payoutActions',
              title: '',
              render: (item: SalaryPayoutItem) => {
                if (!canManage || item.source !== 'PAYOUT') return null;
                return (
                  <div className={dpStyles.entryActions}>
                    <button
                      type="button"
                      className={dpStyles.editEntryBtn}
                      onClick={() => openEditModal(item)}
                      title="Исправить выплату"
                      aria-label="Исправить выплату"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={15}
                        height={15}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      data-admin-mutation
                      className={dpStyles.deleteEntryBtn}
                      onClick={() => setDeleteTarget(item)}
                      title="Удалить выплату"
                      aria-label="Удалить выплату"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={15}
                        height={15}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" x2="10" y1="11" y2="17" />
                        <line x1="14" x2="14" y1="11" y2="17" />
                      </svg>
                    </button>
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [canManage, openEditModal, setDeleteTarget]
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Выплаты з/п</h1>
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
                title="Обновить журнал выплат"
                aria-label="Обновление журнала выплат"
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
            title={canEdit ? 'Записать выплату зар/платы' : 'Нет прав на записи выплат'}
          >
            + Выплата
          </button>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить журнал выплат"
              aria-label="Обновление журнала выплат"
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

      {/* Блок итогов: сумма выплат за период, разбивка нал/банк и по получателям. */}
      <div
        className={`${dpStyles.totalsRow}${loading ? ` ${dpStyles.totalsRowLoading}` : ''}`}
        aria-label="Итоги выплат з/п за выбранный период"
      >
        <div className={`${dpStyles.totalsTile} ${dpStyles.totalsTileTotal}`}>
          <span className={dpStyles.totalsTileLabel}>Выплачено за период</span>
          <strong className={dpStyles.totalsTileValue}>{formatDpMoney(totalSum)}</strong>
          <span className={dpStyles.totalsTileCash}>
            Наличные: {formatDpMoney(cashSum)} · Банк: {formatDpMoney(bankSum)}
          </span>
        </div>
        {byRecipient.map((recipient) => (
          <RecipientTotalsTile key={recipient.name} recipient={recipient} grandTotal={totalSum} />
        ))}
      </div>

      <section className={cdHub.contractsListFiltersPanel} aria-label="Фильтры выплат">
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
              {filtersCollapsed ? 'Фильтры выплат' : 'Свернуть фильтры'}
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
            aria-label="Развернуть фильтры выплат"
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
                  placeholder="Поиск: получатель, примечание…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={filterFieldClass(
                    cdHub.contractsListSearchInput,
                    Boolean(search.trim())
                  )}
                  aria-label="Поиск по выплатам"
                />
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  disabled={loading}
                  className={filterFieldClass(cdHub.contractsListSelect, Boolean(method))}
                  aria-label="Способ выплаты"
                >
                  <option value="">Все способы</option>
                  <option value="CASH">Наличные</option>
                  <option value="BANK">Банк</option>
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
                  onChange={(e) => setLimit(Number(e.target.value) as PayoutsPageLimit)}
                  disabled={loading}
                  className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
                  aria-label="Количество строк на странице"
                >
                  {PAYOUTS_PAGE_LIMIT_OPTIONS.map((n) => (
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
        keyExtractor={(item) => `${item.source}:${item.id}`}
        loading={loading}
        emptyMessage="Выплат з/п за выбранный период нет"
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

      <PayoutModal
        open={createModalOpen}
        onClose={closeModal}
        managers={managers}
        defaultManager={defaultManager}
        submitting={saving}
        onSubmit={handleSubmit}
        editing={editing}
      />

      <ConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Удалить выплату"
        message={
          deleteTarget
            ? `Выплата ${formatDpMoney(deleteTarget.amount)} — ${deleteTarget.recipientName} будет удалена из журнала, кассы и банка. Продолжить?`
            : ''
        }
        confirmText="Удалить"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={deleting}
      />
    </div>
  );
}
