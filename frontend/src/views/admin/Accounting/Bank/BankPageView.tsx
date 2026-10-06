'use client';

import { useId, useMemo } from 'react';

import type { BankEntriesTotals, BankEntry } from '@/shared/api/accounting/admin-bank-entries';
import { ConfirmModal } from '@/shared/ui/ConfirmModal/ConfirmModal';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { formatDateRu, formatMoneyRub } from '../accounting-invoices-page.utils';
import { BankEntryModal } from './BankEntryModal';
import styles from './BankPage.module.css';
import {
  BANK_ENTRY_TYPE_LABELS,
  BANK_ENTRY_TYPE_OPTIONS,
  BANK_LABELS,
  BANK_OPTIONS,
  pluralEntries,
} from './bank-page.constants';
import {
  BANK_PAGE_LIMIT_OPTIONS,
  type BankPageLimit,
  type BankPageModel,
} from './hooks/useBankPage';

type BankPageViewProps = {
  model: BankPageModel;
};

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

function formatDpPercent(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
}

function formatMoney(value: string | undefined): string {
  return value != null ? formatMoneyRub(value) : '—';
}

/** Плитка банка в блоке итогов: сумма за период, доля от итога и зачисление нетто. */
function BankTotalsTile({
  bankKey,
  totals,
  grandTotal,
}: {
  bankKey: string;
  totals: BankEntriesTotals;
  grandTotal: number;
}) {
  const tileTotal = Number(totals.total);
  const percent = grandTotal !== 0 ? (tileTotal / grandTotal) * 100 : null;
  return (
    <div
      className={dpStyles.totalsTile}
      title="Сумма операций банка за период (итого); «Зачислено» — поступление на счёт за вычетом комиссии и возвратов"
    >
      <span className={dpStyles.totalsTileLabel}>
        {BANK_LABELS[bankKey as keyof typeof BANK_LABELS] ?? bankKey}
      </span>
      <span className={dpStyles.totalsTileValueRow}>
        <strong className={dpStyles.totalsTileValue}>{formatMoney(totals.total)}</strong>
        {percent !== null ? (
          <span className={dpStyles.totalsTilePercent}>{formatDpPercent(percent)}</span>
        ) : null}
      </span>
      {Number(totals.fee) > 0 || Number(totals.refund) > 0 ? (
        <span className={dpStyles.totalsTileCash}>Зачислено: {formatMoney(totals.amount)}</span>
      ) : null}
    </div>
  );
}

export function BankPageView({ model }: BankPageViewProps) {
  const {
    rows,
    totals,
    byBank,
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
    bank,
    setBank,
    entryType,
    setEntryType,
    search,
    setSearch,
    resetFilters,
    setPeriod,
    filtersCollapsed,
    toggleFiltersCollapsed,
    modalOpen,
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
    canDelete,
  } = model;

  const filtersContentId = useId();

  const countTitle = `${total} ${pluralEntries(total)}`;

  const grandTotal = Number(totals?.total ?? 0);

  /** Чипы сводки фильтров в свёрнутом состоянии — как в журнале ДП. */
  const filtersSummary = useMemo(() => {
    const chips: { key: string; label: string }[] = [
      {
        key: 'bank',
        label: bank ? `Банк: ${BANK_LABELS[bank as keyof typeof BANK_LABELS]}` : 'Все банки',
      },
      {
        key: 'entryType',
        label: entryType
          ? `Способ: ${BANK_ENTRY_TYPE_LABELS[entryType as keyof typeof BANK_ENTRY_TYPE_LABELS]}`
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
  }, [bank, entryType, dateFrom, dateTo, search]);

  const columns = useMemo(
    () => [
      {
        key: 'entryDate',
        title: 'Дата',
        render: (item: BankEntry) => formatDateRu(item.entryDate),
      },
      {
        key: 'bank',
        title: 'Банк',
        render: (item: BankEntry) => (
          <span className={`${styles.bankBadge} ${styles[`bank_${item.bank}`] ?? ''}`}>
            {BANK_LABELS[item.bank] ?? item.bank}
          </span>
        ),
      },
      {
        key: 'entryType',
        title: 'Способ оплаты',
        render: (item: BankEntry) => BANK_ENTRY_TYPE_LABELS[item.entryType] ?? item.entryType,
      },
      {
        key: 'counterparty',
        title: 'Контрагент',
        render: (item: BankEntry) => (
          <div className={styles.counterpartyCell}>
            {item.counterparty || '—'}
            {item.notes ? <span className={styles.counterpartySubline}>{item.notes}</span> : null}
          </div>
        ),
      },
      {
        key: 'amount',
        title: 'Зачислено',
        render: (item: BankEntry) => (
          <span className={dpStyles.amountCell}>{formatMoneyRub(item.amount)}</span>
        ),
      },
      {
        key: 'fee',
        title: 'Комиссия',
        render: (item: BankEntry) =>
          Number(item.fee) > 0 ? (
            <span className={`${dpStyles.amountCell} ${styles.mutedCell}`}>
              {formatMoneyRub(item.fee)}
            </span>
          ) : (
            <span className={dpStyles.muted}>—</span>
          ),
      },
      {
        key: 'refund',
        title: 'Возврат',
        render: (item: BankEntry) =>
          Number(item.refund) > 0 ? (
            <span className={`${dpStyles.amountCell} ${dpStyles.amountCellRefund}`}>
              {formatMoneyRub(item.refund)}
            </span>
          ) : (
            <span className={dpStyles.muted}>—</span>
          ),
      },
      {
        key: 'total',
        title: 'Итого',
        render: (item: BankEntry) => (
          <span className={`${dpStyles.amountCell} ${styles.totalCell}`}>
            {formatMoneyRub(item.total)}
          </span>
        ),
      },
      {
        key: 'createdBy',
        title: 'Автор',
        render: (item: BankEntry) => item.createdBy?.name || '—',
      },
      ...(canEdit || canDelete
        ? [
            {
              key: 'entryActions',
              title: '',
              render: (item: BankEntry) => {
                if (!canEdit && !canDelete) return null;
                return (
                  <div className={dpStyles.entryActions}>
                    {canEdit ? (
                      <button
                        type="button"
                        className={dpStyles.editEntryBtn}
                        onClick={() => openEditModal(item)}
                        title="Исправить запись банка"
                        aria-label="Исправить запись банка"
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
                    ) : null}
                    {canDelete ? (
                      <button
                        type="button"
                        className={dpStyles.deleteEntryBtn}
                        onClick={() => setDeleteTarget(item)}
                        title="Удалить запись банка"
                        aria-label="Удалить запись банка"
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
                    ) : null}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [canEdit, canDelete, openEditModal, setDeleteTarget]
  );

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Банк — поступления</h1>
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
                title="Обновить список"
                aria-label="Обновление списка поступлений"
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
            title={canEdit ? 'Внести поступление по выписке' : 'Нет прав на внесение записей'}
          >
            + Поступление
          </button>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить список"
              aria-label="Обновление списка поступлений"
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

      {/* Блок итогов: валовая сумма за период, банки, комиссия и возвраты. */}
      <div
        className={`${dpStyles.totalsRow}${loading ? ` ${dpStyles.totalsRowLoading}` : ''}`}
        aria-label="Итоги по банкам за выбранный период"
      >
        <div className={`${dpStyles.totalsTile} ${dpStyles.totalsTileTotal}`}>
          <span className={dpStyles.totalsTileLabel}>Итого за период</span>
          <strong className={dpStyles.totalsTileValue}>{formatMoney(totals?.total)}</strong>
        </div>
        {Object.entries(byBank).map(([bankKey, bankTotals]) => (
          <BankTotalsTile
            key={bankKey}
            bankKey={bankKey}
            totals={bankTotals}
            grandTotal={grandTotal}
          />
        ))}
        {Number(totals?.fee ?? 0) > 0 ? (
          <div
            className={dpStyles.totalsTile}
            title="Комиссии банков за период — в «Итого за период» входят"
          >
            <span className={dpStyles.totalsTileLabel}>Комиссия банков</span>
            <span className={dpStyles.totalsTileValueRow}>
              <strong className={dpStyles.totalsTileValue}>{formatMoney(totals?.fee)}</strong>
            </span>
          </div>
        ) : null}
        {Number(totals?.refund ?? 0) > 0 ? (
          <div
            className={dpStyles.totalsTile}
            title="Возвраты в составе операций за период — в «Итого за период» входят"
          >
            <span className={dpStyles.totalsTileLabel}>Возвраты</span>
            <span className={dpStyles.totalsTileValueRow}>
              <strong className={dpStyles.totalsTileValue}>{formatMoney(totals?.refund)}</strong>
            </span>
          </div>
        ) : null}
      </div>

      <section className={cdHub.contractsListFiltersPanel} aria-label="Фильтры поступлений банка">
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
              {filtersCollapsed ? 'Фильтры журнала' : 'Свернуть фильтры'}
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
            aria-label="Развернуть фильтры поступлений банка"
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
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Банк">
                <span className={cdHub.contractsListChipRowLabel}>Банк</span>
                <button
                  type="button"
                  disabled={loading}
                  className={chipClass(!bank)}
                  onClick={() => setBank('')}
                >
                  Все
                </button>
                {BANK_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={loading}
                    className={chipClass(bank === option.value)}
                    onClick={() => setBank(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className={cdHub.contractsListChipRow} role="group" aria-label="Способ оплаты">
                <span className={cdHub.contractsListChipRowLabel}>Способ оплаты</span>
                <button
                  type="button"
                  disabled={loading}
                  className={chipClass(!entryType)}
                  onClick={() => setEntryType('')}
                >
                  Все
                </button>
                {BANK_ENTRY_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={loading}
                    className={chipClass(entryType === option.value)}
                    onClick={() => setEntryType(option.value)}
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
                  placeholder="Поиск: контрагент, примечание…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={filterFieldClass(
                    cdHub.contractsListSearchInput,
                    Boolean(search.trim())
                  )}
                  aria-label="Поиск по поступлениям банка"
                />
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
                  onChange={(e) => setLimit(Number(e.target.value) as BankPageLimit)}
                  disabled={loading}
                  className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
                  aria-label="Количество строк на странице"
                >
                  {BANK_PAGE_LIMIT_OPTIONS.map((n) => (
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
        emptyMessage="Поступлений за выбранный период нет"
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

      <BankEntryModal
        isOpen={modalOpen}
        onClose={closeModal}
        entry={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Удалить запись банка"
        message={
          deleteTarget
            ? `Запись от ${formatDateRu(deleteTarget.entryDate)} на сумму ${formatMoneyRub(deleteTarget.total)} будет удалена безвозвратно. Продолжить?`
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
