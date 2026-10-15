'use client';

import { useId, useMemo, useState } from 'react';

import { formatInstallerAdvancePaymentMethod } from '@/shared/constants/installerAdvancePaymentMethod';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from './InstallerSettlements.module.css';
import type { InstallerSettlementsPageModel } from './hooks/useInstallerSettlementsPage';
import { buildIsFiltersSummary } from './installer-settlements-filters';
import {
  IS_DIRECTION_OPTIONS,
  IS_PACKAGE_STATUS_LABELS,
  IS_PAGE_LIMIT_OPTIONS,
  type IsPageLimit,
  formatIsDate,
  formatIsGradeShort,
  formatIsMoney,
} from './installer-settlements-page.constants';
import { CreateAdvanceModal } from './modals/CreateAdvanceModal';

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function filterFieldClass(base: string, active: boolean): string {
  return active ? `${base} ${cdHub.contractsListFilterActive}` : base;
}

/** «5 выплат / 1 выплата / 22 выплаты». */
function formatCountLabel(total: number): string {
  const mod10 = total % 10;
  const mod100 = total % 100;
  let word = 'выплат';
  if (mod10 === 1 && mod100 !== 11) word = 'выплата';
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'выплаты';
  return `${total} ${word}`;
}

/** Остаток к выплате: недоплата, переплата (красным) или «—» без заказ-наряда. */
function MasterBalanceCell({ balance }: { balance: number | null }) {
  if (balance == null) {
    return (
      <span
        className={styles.balanceUnknown}
        title="Нет назначений мастера в заказ-нарядах — остаток неизвестен"
      >
        —
      </span>
    );
  }
  if (balance < 0) {
    return (
      <span
        className={styles.balanceOverpaid}
        title="Выдано больше, чем начислено по заказ-нарядам"
      >
        Переплата {formatIsMoney(Math.abs(balance))}
      </span>
    );
  }
  return <span className={styles.balanceDue}>{formatIsMoney(balance)}</span>;
}

export function InstallerSettlementsPageView({ model }: { model: InstallerSettlementsPageModel }) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    installerId,
    setInstallerId,
    direction,
    setDirection,
    searchInput,
    setSearchInput,
    page,
    setPage,
    limit,
    setLimit,
    items,
    installers,
    masters,
    total,
    totalPaidInPeriod,
    directionSums,
    loading,
    message,
    setMessage,
    refresh,
    resetFilters,
    setPeriod,
    canManageAdvances,
    advanceModalOpen,
    openAdvanceModal,
    closeAdvanceModal,
    advanceSubmitting,
    submitAdvance,
    installersRegistry,
  } = model;

  const filtersContentId = useId();
  /** Всегда свёрнуто при открытии страницы — как в журнале ДП. */
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const toggleFiltersCollapsed = () => setFiltersCollapsed((value) => !value);

  const filtersSummary = useMemo(
    () =>
      buildIsFiltersSummary({
        direction,
        search: searchInput,
        installerId,
        installers,
        dateFrom,
        dateTo,
      }),
    [direction, searchInput, installerId, installers, dateFrom, dateTo]
  );

  /** Плитки выплат по направлениям за период (как в журнале ДП). */
  const directionTotals = useMemo(() => {
    const sumsByDirection = new Map(directionSums.map((item) => [item.direction, item.sum]));
    return IS_DIRECTION_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
      sum: sumsByDirection.get(option.value) ?? 0,
    })).filter((tile) => tile.sum !== 0);
  }, [directionSums]);

  /** Итоги сводки мастеров: начисления и остатки известны не для всех мастеров. */
  const mastersTotals = useMemo(() => {
    let paidTotal = 0;
    let paidInPeriod = 0;
    let accrued = 0;
    let balance = 0;
    let allAccrualsKnown = masters.length > 0;
    for (const row of masters) {
      paidTotal += row.paidTotal;
      paidInPeriod += row.paidInPeriod;
      if (row.hasAccruals) {
        accrued += row.accrued;
        balance += row.balance ?? 0;
      } else {
        allAccrualsKnown = false;
      }
    }
    return {
      paidTotal,
      paidInPeriod,
      accrued,
      balance: allAccrualsKnown ? balance : null,
      allAccrualsKnown,
    };
  }, [masters]);

  const columns = [
    {
      key: 'paidAt',
      title: 'Дата',
      render: (item: (typeof items)[number]) => formatIsDate(item.paidAt),
    },
    {
      key: 'installerName',
      title: 'Мастер',
      render: (item: (typeof items)[number]) => {
        const grade = formatIsGradeShort(item.installerGrade);
        return (
          <div>
            {item.installerName || '—'}
            {grade ? <span className={styles.cellSubline}>{grade}</span> : null}
            {!item.installerId ? (
              <span className={styles.cellSubline}>удалён из справочника</span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'direction',
      title: 'Направление',
      render: (item: (typeof items)[number]) => item.direction || '—',
    },
    {
      key: 'contractNumber',
      title: '№ договора',
      render: (item: (typeof items)[number]) => {
        const statusLabel = IS_PACKAGE_STATUS_LABELS[item.packageStatus];
        return (
          <span className={styles.contractCell}>
            {item.contractNumber || '—'}
            {statusLabel ? <span className={styles.cellSubline}>{statusLabel}</span> : null}
          </span>
        );
      },
    },
    {
      key: 'customerName',
      title: 'Заказчик',
      render: (item: (typeof items)[number]) => (
        <div className={styles.customerCell}>
          {item.customerName || '—'}
          {item.objectAddress ? (
            <span className={styles.cellSubline}>{item.objectAddress}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'note',
      title: 'Комментарий',
      render: (item: (typeof items)[number]) => (
        <span className={styles.noteCell}>
          {item.note?.trim() || <span className={styles.muted}>—</span>}
        </span>
      ),
    },
    {
      key: 'createdBy',
      title: 'Кто выдал',
      render: (item: (typeof items)[number]) => item.createdBy?.name || '—',
    },
    {
      key: 'amount',
      title: 'Сумма',
      render: (item: (typeof items)[number]) => (
        <span className={styles.amountCell}>{formatIsMoney(item.amount)}</span>
      ),
    },
    {
      key: 'paymentMethod',
      title: 'Способ оплаты',
      render: (item: (typeof items)[number]) =>
        formatInstallerAdvancePaymentMethod(item.paymentMethod),
    },
  ];

  return (
    <div
      className={`${cdBase.page} ${cdWorkspace.pageWide} ${styles.pageFull} ${cdHub.contractsListPage}`}
    >
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Расчёт мастеров</h1>
              </div>
              <span
                className={cdHub.contractsListCount}
                title={`${formatCountLabel(total)} в журнале`}
              >
                <span className={cdHub.contractsListCountDesktop}>{formatCountLabel(total)}</span>
                <span className={cdHub.contractsListCountMobile}>{total}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Обновить расчёт мастеров"
                aria-label="Обновить расчёт мастеров"
                onClick={() => void refresh()}
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          {canManageAdvances ? (
            <button
              data-admin-mutation
              type="button"
              className={cdChrome.contractsListHeaderAddBtn}
              disabled={loading}
              onClick={openAdvanceModal}
            >
              + Выплата
            </button>
          ) : null}
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить расчёт мастеров"
              aria-label="Обновить расчёт мастеров"
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

      <div
        className={`${styles.totalsRow}${loading ? ` ${styles.totalsRowLoading}` : ''}`}
        aria-label="Выплачено авансов за выбранный период"
      >
        <div className={`${styles.totalsTile} ${styles.totalsTileTotal}`}>
          <span className={styles.totalsTileLabel}>Выдано за период</span>
          <strong className={styles.totalsTileValue}>{formatIsMoney(totalPaidInPeriod)}</strong>
        </div>
        {directionTotals.map((tile) => (
          <div key={tile.key} className={styles.totalsTile} title="Выплаты мастерам за период">
            <span className={styles.totalsTileLabel}>{tile.label}</span>
            <strong className={styles.totalsTileValue}>{formatIsMoney(tile.sum)}</strong>
          </div>
        ))}
      </div>

      <section className={cdHub.contractsListFiltersPanel} aria-label="Фильтры расчёта мастеров">
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
            aria-label="Развернуть фильтры расчёта мастеров"
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
                {IS_DIRECTION_OPTIONS.map((option) => (
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
                  placeholder="Поиск: № договора, заказчик, мастер, комментарий…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={filterFieldClass(
                    cdHub.contractsListSearchInput,
                    Boolean(searchInput.trim())
                  )}
                  aria-label="Поиск по расчёту мастеров"
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
                      {installer.name}
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
                  onChange={(e) => setLimit(Number(e.target.value) as IsPageLimit)}
                  disabled={loading}
                  className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
                  aria-label="Количество строк на странице"
                >
                  {IS_PAGE_LIMIT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} на странице
                    </option>
                  ))}
                </select>
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
        )}
      </section>

      <section className={styles.mastersCard} aria-label="Сводка по мастерам">
        <h2 className={styles.mastersTitle}>Сводка по мастерам</h2>
        <p className={styles.mastersHint}>
          Начислено — итог заказ-нарядов мастера по договорам выбранных направлений. Выдачи авансов
          фиксирует супер-админ в модалке «Заказ-наряды» договора — проводки попадают сюда
          автоматически. Остаток не зависит от периода; «за период» показывает выдачи выбранных дат.
        </p>
        {loading ? (
          <p className={styles.mastersHint}>Загрузка…</p>
        ) : masters.length === 0 ? (
          <p className={styles.mastersHint}>
            Мастеров с начислениями или выплатами по выбранным фильтрам нет.
          </p>
        ) : (
          <div className={styles.mastersTableWrap}>
            <table className={styles.mastersTable}>
              <thead>
                <tr>
                  <th>Мастер</th>
                  <th>Разряд</th>
                  <th className="num">Договоров</th>
                  <th className="num">Начислено</th>
                  <th className="num">Выплачено всего</th>
                  <th className="num">Выдано за период</th>
                  <th className="num">Остаток к выплате</th>
                </tr>
              </thead>
              <tbody>
                {masters.map((row) => (
                  <tr key={row.key}>
                    <td>
                      {row.name}
                      {!row.installerId ? (
                        <span className={styles.mastersTableSubline}>удалён из справочника</span>
                      ) : null}
                    </td>
                    <td>{formatIsGradeShort(row.grade) || '—'}</td>
                    <td className="num">{row.packagesCount}</td>
                    <td className="num">
                      {row.hasAccruals ? (
                        <>
                          {formatIsMoney(row.accrued)}
                          <span className={styles.mastersTableSubline}>
                            позиций: {row.lineCount}
                          </span>
                        </>
                      ) : (
                        <span
                          className={styles.balanceUnknown}
                          title="Нет назначений мастера в заказ-нарядах"
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td className="num">
                      {row.paidTotal === 0 ? (
                        '—'
                      ) : (
                        <>
                          {formatIsMoney(row.paidTotal)}
                          <span className={styles.mastersTableSubline}>
                            выплат: {row.advancesCount}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="num">
                      {row.paidInPeriod === 0 ? '—' : formatIsMoney(row.paidInPeriod)}
                    </td>
                    <td className="num">
                      <MasterBalanceCell balance={row.balance} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Итого</td>
                  <td>—</td>
                  <td className="num">—</td>
                  <td className="num">
                    {formatIsMoney(mastersTotals.accrued)}
                    {!mastersTotals.allAccrualsKnown ? (
                      <span
                        className={styles.mastersTableSubline}
                        title="Есть мастера без назначений в заказ-нарядах — их начисления неизвестны"
                      >
                        не по всем
                      </span>
                    ) : null}
                  </td>
                  <td className="num">{formatIsMoney(mastersTotals.paidTotal)}</td>
                  <td className="num">{formatIsMoney(mastersTotals.paidInPeriod)}</td>
                  <td className="num">
                    {mastersTotals.balance == null ? (
                      <span className={styles.balanceUnknown}>—</span>
                    ) : (
                      <MasterBalanceCell balance={mastersTotals.balance} />
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Выплат мастерам за выбранный период нет"
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

      {canManageAdvances ? (
        <CreateAdvanceModal
          open={advanceModalOpen}
          onClose={closeAdvanceModal}
          installers={installersRegistry}
          submitting={advanceSubmitting}
          onSubmit={submitAdvance}
        />
      ) : null}
    </div>
  );
}
