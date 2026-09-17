'use client';

import type { MoneyMovement } from '@/shared/api/crm/admin-money-movements';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from './MoneyMovements.module.css';
import type { MoneyMovementsPageModel } from './hooks/useMoneyMovementsPage';
import {
  DP_DIRECTION_OPTIONS,
  DP_PAYMENT_FORM_LABELS,
  DP_PAYMENT_FORM_OPTIONS,
  DP_PAYMENT_TYPE_LABELS,
  MONEY_MOVEMENTS_PAGE_SIZE,
  formatDpDate,
  formatDpMoney,
  formatDpTime,
} from './money-movements-page.constants';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

export function MoneyMovementsPageView({ model }: { model: MoneyMovementsPageModel }) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    managerId,
    setManagerId,
    direction,
    setDirection,
    paymentForm,
    setPaymentForm,
    searchInput,
    setSearchInput,
    page,
    setPage,
    items,
    managers,
    total,
    totalPages,
    totalSum,
    loading,
    message,
    setMessage,
    refresh,
    resetFilters,
    setPeriod,
  } = model;

  const countTitle = `${total} ${total === 1 ? 'запись' : 'записей'}`;

  const columns = [
    {
      key: 'paymentDate',
      title: 'Дата',
      render: (item: MoneyMovement) => formatDpDate(item.paymentDate),
    },
    {
      key: 'performedAt',
      title: 'Время оплаты',
      render: (item: MoneyMovement) => formatDpTime(item.performedAt),
    },
    {
      key: 'manager',
      title: 'Менеджер',
      render: (item: MoneyMovement) => item.manager?.name || '—',
    },
    {
      key: 'contractNumber',
      title: '№ договора',
      render: (item: MoneyMovement) => (
        <span className={styles.contractCell}>{item.contractNumber || '—'}</span>
      ),
    },
    {
      key: 'customerName',
      title: 'Заказчик',
      render: (item: MoneyMovement) => (
        <div className={styles.customerCell}>
          {item.customerName || '—'}
          {item.addendumNumber != null ? (
            <span className={styles.customerSubline}>Д/с №{item.addendumNumber}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'direction',
      title: 'Направление',
      render: (item: MoneyMovement) => item.direction || '—',
    },
    {
      key: 'basis',
      title: 'Основание',
      render: (item: MoneyMovement) => (
        <div className={styles.basisCell}>
          {item.basis || DP_PAYMENT_TYPE_LABELS[item.paymentType] || item.paymentType}
          {item.notes ? <span className={styles.basisSubline}>{item.notes}</span> : null}
        </div>
      ),
    },
    {
      key: 'amount',
      title: 'Сумма',
      render: (item: MoneyMovement) => (
        <span
          className={`${styles.amountCell}${
            item.paymentType === 'REFUND' ? ` ${styles.amountCellRefund}` : ''
          }`}
        >
          {formatDpMoney(item.amount)}
        </span>
      ),
    },
    {
      key: 'paymentForm',
      title: 'Способ оплаты',
      render: (item: MoneyMovement) => DP_PAYMENT_FORM_LABELS[item.paymentForm] || item.paymentForm,
    },
  ];

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>ДП — денежные движения по договорам</h1>
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
                title="Обновить журнал"
                aria-label={loading ? 'Обновление журнала ДП' : 'Обновить журнал ДП'}
                onClick={() => void refresh()}
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить журнал"
              aria-label={loading ? 'Обновление журнала ДП' : 'Обновить журнал ДП'}
              onClick={() => void refresh()}
            />
          </div>
        </div>
      </div>

      {message ? (
        <div className={styles.pageMessage}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <div className={cdHub.contractsListFiltersPanel}>
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Направление">
            <span className={cdHub.contractsListChipRowLabel}>Направление</span>
            <button
              type="button"
              disabled={loading}
              className={chipClass(!direction)}
              onClick={() => setDirection('')}
            >
              Все
            </button>
            {DP_DIRECTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={loading}
                className={chipClass(direction === option.value)}
                onClick={() => setDirection(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

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
              placeholder="Поиск: № договора, заказчик, основание, примечание…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading}
              className={filterFieldClass(
                cdHub.contractsListSearchInput,
                Boolean(searchInput.trim())
              )}
              aria-label="Поиск по журналу ДП"
            />
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={loading}
              className={filterFieldClass(cdHub.contractsListSelect, Boolean(managerId))}
              aria-label="Менеджер"
            >
              <option value="">Все менеджеры</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              value={paymentForm}
              onChange={(e) => setPaymentForm(e.target.value)}
              disabled={loading}
              className={filterFieldClass(cdHub.contractsListSelect, Boolean(paymentForm))}
              aria-label="Способ оплаты"
            >
              <option value="">Все способы</option>
              {DP_PAYMENT_FORM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
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
            <button
              type="button"
              className={styles.resetBtn}
              onClick={resetFilters}
              disabled={loading}
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      <div className={styles.summaryRow}>
        <span>
          Записей: <strong>{total}</strong>
        </span>
        <span className={styles.summarySum} title="Сумма по текущим фильтрам">
          Итого: {formatDpMoney(totalSum)}
        </span>
        {totalPages > 1 ? (
          <span className={styles.muted}>
            Страница {page} из {totalPages}
          </span>
        ) : null}
      </div>

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Денежных движений за выбранный период нет"
        serverSidePagination
        pagination={{
          page,
          limit: MONEY_MOVEMENTS_PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
