'use client';

import { useId, useMemo } from 'react';

import type {
  ReconciliationEntry,
  ReconciliationHistoryItem,
} from '@/shared/api/accounting/admin-bank-reconciliation';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import dpStyles from '@/views/admin/CRM/MoneyMovements/MoneyMovements.module.css';
import { DP_PAYMENT_FORM_LABELS } from '@/views/admin/CRM/MoneyMovements/money-movements-page.constants';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { formatDateRu, formatMoneyRub } from '../../accounting-invoices-page.utils';
import bankStyles from '../BankPage.module.css';
import { BANK_ENTRY_TYPE_LABELS, BANK_LABELS, pluralEntries } from '../bank-page.constants';
import { ChooseEntryModal } from './ChooseEntryModal';
import { MatchEntryModal } from './MatchEntryModal';
import styles from './Reconciliation.module.css';
import { ReconciliationRulesInfoTip } from './ReconciliationRulesInfoTip';
import {
  type BankReconciliationPageModel,
  RECONCILIATION_LAG_OPTIONS,
  paymentFormToEntryType,
} from './hooks/useBankReconciliationPage';

type BankReconciliationPageViewProps = {
  model: BankReconciliationPageModel;
};

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

/** Суммы из итогов приходят строками; до загрузки — undefined. */
function fmt(value: string | undefined): string {
  return value != null ? formatMoneyRub(value) : '—';
}

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

/** Статус сопоставления поступления — цветной бейдж. */
function EntryStatusBadge({ entry }: { entry: ReconciliationEntry }) {
  // Расхождение (округления и т.п.) не блокирует сверку — показываем его рядом
  // с «Сверено», чтобы расхождение было видно в самой строке сверки.
  const mismatch = Number(entry.mismatchAmount);
  if (entry.status === 'covered') {
    return (
      <span
        className={`${styles.statusBadge} ${styles.statusCovered}`}
        title={
          mismatch > 0
            ? 'Сверка зафиксирована с расхождением сумм (см. пометки в связях)'
            : undefined
        }
      >
        Сверено
        {mismatch > 0 ? ` · расхождение ${formatMoneyRub(entry.mismatchAmount)}` : ''}
      </span>
    );
  }
  if (entry.suggestion) {
    const mismatch = entry.suggestion.mismatchAmount ? Number(entry.suggestion.mismatchAmount) : 0;
    return (
      <span
        className={`${styles.statusBadge} ${styles.statusSuggested}`}
        title="Автоматика нашла подходящие оплаты ДП — проверьте и зафиксируйте"
      >
        Предложение {formatMoneyRub(entry.suggestion.amount)}
        {mismatch > 0 ? ` · расхождение ${formatMoneyRub(entry.suggestion.mismatchAmount!)}` : ''}
      </span>
    );
  }
  if (entry.status === 'partial') {
    return (
      <span className={`${styles.statusBadge} ${styles.statusPartial}`}>
        Частично · остаток {formatMoneyRub(entry.remainingAmount)}
      </span>
    );
  }
  return (
    <span className={`${styles.statusBadge} ${styles.statusUnmatched}`}>
      Без оплат · {formatMoneyRub(entry.remainingAmount)}
    </span>
  );
}

export function BankReconciliationPageView({ model }: BankReconciliationPageViewProps) {
  const {
    preview,
    history,
    loading,
    error,
    setError,
    warning,
    setWarning,
    load,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    lagDays,
    setLagDays,
    resetFilters,
    filtersCollapsed,
    toggleFiltersCollapsed,
    matchEntry,
    setMatchEntry,
    choosePayment,
    setChoosePayment,
    acting,
    applyLink,
    linkPaymentToEntry,
    unlink,
    unlinkAll,
    candidatesByType,
    canEdit,
    canDelete,
  } = model;

  const filtersContentId = useId();

  const totals = preview?.totals;
  const entries = useMemo(() => preview?.entries ?? [], [preview]);
  const unmatchedPayments = useMemo(() => preview?.unmatchedPayments ?? [], [preview]);

  const countTitle = `${totals?.entriesCount ?? 0} ${pluralEntries(totals?.entriesCount ?? 0)}`;

  const filtersSummary = useMemo(() => {
    const chips: { key: string; label: string }[] = [
      {
        key: 'lag',
        label: `Лаг зачисления: ${lagDays} ${lagDays === 1 ? 'день' : lagDays >= 2 && lagDays <= 4 ? 'дня' : 'дней'}`,
      },
      {
        key: 'period',
        label: `Период: ${dateFrom ? formatDateRu(dateFrom) : '…'} — ${dateTo ? formatDateRu(dateTo) : '…'}`,
      },
    ];
    return chips;
  }, [lagDays, dateFrom, dateTo]);

  /** Актуальное состояние записи для модалки (после операций список обновляется). */
  const currentMatchEntry = useMemo(
    () => (matchEntry ? (entries.find((e) => e.id === matchEntry.id) ?? matchEntry) : null),
    [matchEntry, entries]
  );

  const entryColumns = useMemo(
    () => [
      {
        key: 'entryDate',
        title: 'Дата',
        render: (item: ReconciliationEntry) => formatDateRu(item.entryDate),
      },
      {
        key: 'bank',
        title: 'Банк',
        render: (item: ReconciliationEntry) => (
          <span className={`${bankStyles.bankBadge} ${bankStyles[`bank_${item.bank}`] ?? ''}`}>
            {BANK_LABELS[item.bank] ?? item.bank}
          </span>
        ),
      },
      {
        key: 'entryType',
        title: 'Способ оплаты',
        render: (item: ReconciliationEntry) =>
          BANK_ENTRY_TYPE_LABELS[item.entryType] ?? item.entryType,
      },
      {
        key: 'total',
        title: 'Поступление',
        render: (item: ReconciliationEntry) => (
          <span className={dpStyles.amountCell}>{formatMoneyRub(item.total)}</span>
        ),
      },
      {
        key: 'covered',
        title: 'Сверено оплат',
        render: (item: ReconciliationEntry) =>
          item.links.length > 0 ? (
            <span className={styles.coveredCell}>
              {formatMoneyRub(item.coveredAmount)}
              <span className={styles.coveredCount}> · {item.links.length} опл.</span>
            </span>
          ) : (
            <span className={dpStyles.muted}>—</span>
          ),
      },
      {
        key: 'remaining',
        title: 'Остаток',
        render: (item: ReconciliationEntry) =>
          Number(item.remainingAmount) > 0.005 ? (
            <span className={`${dpStyles.amountCell} ${dpStyles.amountCellRefund}`}>
              {formatMoneyRub(item.remainingAmount)}
            </span>
          ) : (
            <span className={dpStyles.muted}>—</span>
          ),
      },
      {
        key: 'status',
        title: 'Статус',
        render: (item: ReconciliationEntry) => <EntryStatusBadge entry={item} />,
      },
      {
        key: 'actions',
        title: '',
        render: (item: ReconciliationEntry) =>
          canEdit && (Number(item.remainingAmount) > 0.005 || item.links.length > 0) ? (
            <button
              type="button"
              className={styles.matchBtn}
              disabled={loading || acting}
              onClick={() => setMatchEntry(item)}
            >
              {item.links.length > 0 ? 'Открыть' : 'Сопоставить'}
            </button>
          ) : null,
      },
    ],
    [canEdit, loading, acting, setMatchEntry]
  );

  const paymentColumns = useMemo(
    () => [
      {
        key: 'paymentDate',
        title: 'Дата',
        render: (item: (typeof unmatchedPayments)[number]) => formatDateRu(item.paymentDate),
      },
      {
        key: 'paymentForm',
        title: 'Способ оплаты',
        render: (item: (typeof unmatchedPayments)[number]) =>
          DP_PAYMENT_FORM_LABELS[item.paymentForm as keyof typeof DP_PAYMENT_FORM_LABELS] ??
          item.paymentForm,
      },
      {
        key: 'manager',
        title: 'Менеджер',
        render: (item: (typeof unmatchedPayments)[number]) => item.managerName || '—',
      },
      {
        key: 'contractNumber',
        title: '№ договора',
        render: (item: (typeof unmatchedPayments)[number]) => item.contractNumber || '—',
      },
      {
        key: 'customerName',
        title: 'Заказчик',
        render: (item: (typeof unmatchedPayments)[number]) => item.customerName || '—',
      },
      {
        key: 'executorName',
        title: 'Исполнитель',
        render: (item: (typeof unmatchedPayments)[number]) => item.executorName || '—',
      },
      {
        key: 'amount',
        title: 'Сумма',
        render: (item: (typeof unmatchedPayments)[number]) => (
          <span className={dpStyles.amountCell}>{formatMoneyRub(item.remainder)}</span>
        ),
      },
      {
        key: 'status',
        title: 'Статус',
        render: (item: (typeof unmatchedPayments)[number]) =>
          item.inTransit ? (
            <span
              className={`${styles.statusBadge} ${styles.statusInTransit}`}
              title="Лаг зачисления ещё не истёк — деньги могут прийти после конца периода"
            >
              В пути
            </span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.statusUnmatched}`}>Не поступила</span>
          ),
      },
      {
        key: 'actions',
        title: '',
        render: (item: (typeof unmatchedPayments)[number]) =>
          canEdit ? (
            <button
              type="button"
              className={styles.matchBtn}
              disabled={loading || acting}
              onClick={() => setChoosePayment(item)}
            >
              К поступлению
            </button>
          ) : null,
      },
    ],
    [canEdit, loading, acting, setChoosePayment]
  );

  const historyColumns = useMemo(
    () => [
      {
        key: 'createdAt',
        title: 'Зафиксировано',
        render: (item: ReconciliationHistoryItem) => formatDateRu(item.createdAt.slice(0, 10)),
      },
      {
        key: 'createdBy',
        title: 'Кем',
        render: (item: ReconciliationHistoryItem) => item.createdBy || '—',
      },
      {
        key: 'bankEntry',
        title: 'Поступление',
        render: (item: ReconciliationHistoryItem) =>
          `${formatDateRu(item.bankEntry.entryDate)} · ${BANK_LABELS[item.bankEntry.bank]}`,
      },
      {
        key: 'payment',
        title: 'Оплата ДП',
        render: (item: ReconciliationHistoryItem) =>
          `${formatDateRu(item.moneyMovement.paymentDate)} · ${
            item.moneyMovement.managerName || '—'
          }${item.moneyMovement.contractNumber ? ` · №${item.moneyMovement.contractNumber}` : ''}`,
      },
      {
        key: 'amount',
        title: 'Сумма связи',
        render: (item: ReconciliationHistoryItem) => (
          <span className={dpStyles.amountCell}>
            {formatMoneyRub(item.amount)}
            {item.note ? <span className={styles.linkNote}> · {item.note}</span> : null}
          </span>
        ),
      },
    ],
    []
  );

  const matchCandidates = currentMatchEntry
    ? (candidatesByType.get(currentMatchEntry.entryType) ?? [])
    : [];
  const chooseEntryCandidates = useMemo(() => {
    if (!choosePayment) return [];
    const entryType = paymentFormToEntryType(choosePayment.paymentForm);
    if (!entryType) return [];
    return entries.filter((entry) => entry.entryType === entryType);
  }, [choosePayment, entries]);

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Сверка Банк ↔ ДП</h1>
                <ReconciliationRulesInfoTip />
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{totals?.entriesCount ?? 0}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Пересчитать сверку"
                aria-label="Пересчёт сверки"
                onClick={() => void load()}
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Пересчитать сверку"
              aria-label="Пересчёт сверки"
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

      {warning ? (
        <div className={dpStyles.pageMessage}>
          <span className={styles.overWarn}>{warning}</span>
          <button type="button" onClick={() => setWarning(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <div
        className={`${dpStyles.totalsRow}${loading ? ` ${dpStyles.totalsRowLoading}` : ''}`}
        aria-label="Итоги сверки за период"
      >
        <div className={`${dpStyles.totalsTile} ${dpStyles.totalsTileTotal}`}>
          <span className={dpStyles.totalsTileLabel}>Сверено (зафиксировано)</span>
          <strong className={dpStyles.totalsTileValue}>{fmt(totals?.coveredSum)}</strong>
        </div>
        <div className={dpStyles.totalsTile} title="Авто-предложения, ожидающие фиксации">
          <span className={dpStyles.totalsTileLabel}>Предложено автоматикой</span>
          <span className={dpStyles.totalsTileValueRow}>
            <strong className={dpStyles.totalsTileValue}>{fmt(totals?.suggestedSum)}</strong>
          </span>
        </div>
        <div
          className={dpStyles.totalsTile}
          title="Оплаты ДП за период, до которых не нашлось поступлений (лаг не истёк — в пути)"
        >
          <span className={dpStyles.totalsTileLabel}>Оплаты без поступления</span>
          <span className={dpStyles.totalsTileValueRow}>
            <strong className={dpStyles.totalsTileValue}>{fmt(totals?.unmatchedDpSum)}</strong>
          </span>
          {Number(totals?.inTransitSum ?? 0) > 0 ? (
            <span className={dpStyles.totalsTileCash}>в пути: {fmt(totals?.inTransitSum)}</span>
          ) : null}
        </div>
        <div className={dpStyles.totalsTile} title="Несвёренные остатки поступлений за период">
          <span className={dpStyles.totalsTileLabel}>Поступления без оплат</span>
          <span className={dpStyles.totalsTileValueRow}>
            <strong className={dpStyles.totalsTileValue}>{fmt(totals?.remainingBankSum)}</strong>
          </span>
        </div>
        <div
          className={dpStyles.totalsTile}
          title="Сверяемые оплаты ДП за период: безналичные (терминал, QR, счёт, ЛК), включая ручные проводки; наличные не сверяются"
        >
          <span className={dpStyles.totalsTileLabel}>Оплаты ДП за период</span>
          <span className={dpStyles.totalsTileValueRow}>
            <strong className={dpStyles.totalsTileValue}>{fmt(totals?.dpSum)}</strong>
            {totals ? (
              <span className={dpStyles.totalsTilePercent}>{totals.paymentsCount} шт.</span>
            ) : null}
          </span>
        </div>
      </div>

      <section className={cdHub.contractsListFiltersPanel} aria-label="Параметры сверки">
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
              {filtersCollapsed ? 'Параметры сверки' : 'Свернуть параметры'}
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
            aria-label="Развернуть параметры сверки"
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
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Лаг зачисления">
                <span className={cdHub.contractsListChipRowLabel}>Лаг зачисления</span>
                {RECONCILIATION_LAG_OPTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={loading}
                    className={chipClass(lagDays === value)}
                    onClick={() => setLagDays(value)}
                  >
                    {value} дн.
                  </button>
                ))}
              </div>
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Быстрый период">
                <span className={cdHub.contractsListChipRowLabel}>Период</span>
                <button
                  type="button"
                  disabled={loading}
                  className={cdHub.contractsListChip}
                  onClick={() => {
                    const now = new Date();
                    const mm = String(now.getMonth()).padStart(2, '0');
                    const dd = String(now.getDate()).padStart(2, '0');
                    setDateFrom(`${now.getFullYear()}-${mm}-01`);
                    setDateTo(`${now.getFullYear()}-${mm}-${dd}`);
                  }}
                >
                  С начала месяца
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className={cdHub.contractsListChip}
                  onClick={() => {
                    const now = new Date();
                    const mm = String(now.getMonth()).padStart(2, '0');
                    setDateFrom(`${now.getFullYear()}-${mm}-01`);
                    setDateTo('');
                  }}
                >
                  Весь текущий месяц
                </button>
              </div>
              <div className={cdHub.contractsListFilters}>
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

      <h2 className={styles.sectionHeading}>Поступления и сопоставление</h2>
      <DataTable
        data={entries}
        columns={entryColumns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Поступлений банка за период нет"
        paginationClassName={cdHub.contractsListPagination}
        paginationActiveClassName={cdHub.contractsListPaginationPageActive}
      />

      <h2 className={styles.sectionHeading}>
        Оплаты ДП без поступления
        {unmatchedPayments.length > 0 ? (
          <span className={styles.sectionCount}> · {unmatchedPayments.length}</span>
        ) : null}
      </h2>
      <DataTable
        data={unmatchedPayments}
        columns={paymentColumns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Все оплаты ДП за период покрыты поступлениями или предложениями"
        paginationClassName={cdHub.contractsListPagination}
        paginationActiveClassName={cdHub.contractsListPaginationPageActive}
      />

      <h2 className={styles.sectionHeading}>Последние зафиксированные сверки</h2>
      <DataTable
        data={history}
        columns={historyColumns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Зафиксированных связей пока нет"
        paginationClassName={cdHub.contractsListPagination}
        paginationActiveClassName={cdHub.contractsListPaginationPageActive}
      />

      <MatchEntryModal
        isOpen={currentMatchEntry != null}
        onClose={() => setMatchEntry(null)}
        entry={currentMatchEntry}
        candidates={matchCandidates}
        busy={acting}
        canEdit={canEdit}
        canDelete={canDelete}
        onLink={applyLink}
        onUnlink={unlink}
        onUnlinkAll={unlinkAll}
      />

      <ChooseEntryModal
        isOpen={choosePayment != null}
        onClose={() => setChoosePayment(null)}
        payment={choosePayment}
        entries={chooseEntryCandidates}
        busy={acting}
        canEdit={canEdit}
        onLink={linkPaymentToEntry}
      />
    </div>
  );
}
