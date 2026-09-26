'use client';

import { useId, useMemo, useState } from 'react';

import type { MoneyMovement } from '@/shared/api/crm/admin-money-movements';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import {
  AdminListRefreshButton,
  AdminToolbarIconButton,
  AdminToolbarTrashButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import { DataTable } from '@/shared/ui/admin/DataTable';
import { TrainingStatisticsIcon } from '@/shared/ui/icons/TrainingStatisticsIcon';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { DpRulesInfoTip } from './DpRulesInfoTip';
import styles from './MoneyMovements.module.css';
import type { MoneyMovementsPageModel } from './hooks/useMoneyMovementsPage';
import { DpStatsModal } from './modals/DpStatsModal';
import { DpTrashModal } from './modals/DpTrashModal';
import { IncassationHistoryModal } from './modals/IncassationHistoryModal';
import { IncassationModal } from './modals/IncassationModal';
import { ManualEntryModal } from './modals/ManualEntryModal';
import { buildDpFiltersSummary } from './money-movements-filters';
import {
  DP_MANUAL_DIRECTION_OPTIONS,
  DP_PAGE_LIMIT_OPTIONS,
  DP_PAYMENT_FORM_LABELS,
  DP_PAYMENT_FORM_OPTIONS,
  DP_PAYMENT_TYPE_LABELS,
  DP_SALES_DIRECTION_OPTIONS,
  type DpPageLimit,
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

/** Доля направления в итоге за период, например «97,9%». */
function formatDpPercent(value: number): string {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`;
}

/** Кнопка-иконка «Детальная статистика» — справа от «+ Запись» (иконка как в Территории знаний). */
function DpStatsButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <AdminToolbarIconButton
      disabled={disabled}
      onClick={onClick}
      title="Детальная статистика за период"
      aria-label="Детальная статистика за период"
    >
      <TrainingStatisticsIcon size={20} />
    </AdminToolbarIconButton>
  );
}

/** Кнопка-иконка «История инкассаций» — справа от «+ Инкассация». */
function IncassationHistoryButton({
  disabled,
  onClick,
}: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <AdminToolbarIconButton
      disabled={disabled}
      onClick={onClick}
      title="История инкассаций"
      aria-label="История инкассаций"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    </AdminToolbarIconButton>
  );
}

/** Подпись первоначального значения правленного поля («Было: …») или null, если поле не правилось. */
function editedOriginal(
  item: MoneyMovement,
  field: string,
  format: (value: string | null) => string = (value) => value ?? '—'
): string | null {
  const original = item.originalValues;
  if (!original || !(field in original)) return null;
  return format(original[field]);
}

/** Значок «поле правлено супер-админом»: при наведении — первоначальное значение поля. */
function EditedFieldMark({ original }: { original: string | null }) {
  if (original === null) return null;
  return (
    <span
      className={styles.editedMark}
      title={`Было: ${original}`}
      aria-label={`Было: ${original}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={11}
        height={11}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      </svg>
    </span>
  );
}

export function MoneyMovementsPageView({ model }: { model: MoneyMovementsPageModel }) {
  const {
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    managerId,
    setManagerId,
    scope,
    setScope,
    direction,
    setDirection,
    paymentForm,
    setPaymentForm,
    entryKind,
    setEntryKind,
    totalsMode,
    setTotalsMode,
    searchInput,
    setSearchInput,
    page,
    setPage,
    limit,
    setLimit,
    items,
    managers,
    total,
    totalSum,
    directionSums,
    managerSums,
    directionManagerSums,
    managerCashBalances,
    loading,
    message,
    setMessage,
    refresh,
    resetFilters,
    setPeriod,
    incassations,
    incassationModalOpen,
    openIncassationModal,
    closeIncassationModal,
    incassationHistoryOpen,
    openIncassationHistory,
    closeIncassationHistory,
    cashBalance,
    cashBalanceLoading,
    loadCashBalance,
    incassationSubmitting,
    submitIncassation,
    manualEntryModalOpen,
    openManualEntryModal,
    closeManualEntryModal,
    manualEntrySubmitting,
    submitManualEntry,
    canEditManualEntries,
    editingEntry,
    openManualEntryEditModal,
    executors,
    canDeleteManualEntry,
    deletingEntry,
    openDeleteConfirm,
    closeDeleteConfirm,
    deleteSubmitting,
    submitDeleteEntry,
    trashOpen,
    setTrashOpen,
    trashCount,
    refreshTrashCount,
  } = model;

  const filtersContentId = useId();
  /** Всегда свёрнуто при открытии страницы — как в списке договоров. */
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const toggleFiltersCollapsed = () => setFiltersCollapsed((value) => !value);

  /** Детальная статистика — в модалке по кнопке-иконке рядом с «+ Инкассация». */
  const [statsOpen, setStatsOpen] = useState(false);
  const openStats = () => setStatsOpen(true);
  const closeStats = () => setStatsOpen(false);

  const filtersSummary = useMemo(
    () =>
      buildDpFiltersSummary({
        scope,
        direction,
        search: searchInput,
        managerId,
        managers,
        paymentForm,
        paymentFormLabels: DP_PAYMENT_FORM_LABELS,
        entryKind,
        totalsMode,
        dateFrom,
        dateTo,
      }),
    [
      scope,
      direction,
      searchInput,
      managerId,
      managers,
      paymentForm,
      entryKind,
      totalsMode,
      dateFrom,
      dateTo,
    ]
  );

  const countTitle = `${total} ${total === 1 ? 'запись' : 'записей'}`;

  /** Плитки итогов: направления из справочника + «Материалы» в фиксированном порядке и
   *  «Прочее» для движений вне продаж (записи «Прочее» и без направления) — без процента,
   *  так как «Итого за период» — итоговые продажи и «Прочее» в него не входит.
   *  cashBalance (наличные к инкассации) есть только на плитках менеджеров. */
  const directionTotals = useMemo(() => {
    const sumsByDirection = new Map(directionSums.map((item) => [item.direction ?? '', item.sum]));
    const tiles = DP_SALES_DIRECTION_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
      sum: sumsByDirection.get(option.value) ?? 0,
      cashBalance: 0,
    }));
    const known = new Set(DP_SALES_DIRECTION_OPTIONS.map((option) => option.value));
    const otherSum = directionSums
      .filter((item) => !item.direction || !known.has(item.direction))
      .reduce((acc, item) => acc + item.sum, 0);
    return otherSum !== 0
      ? [...tiles, { key: '__other', label: 'Прочее', sum: otherSum, cashBalance: 0 }]
      : tiles;
  }, [directionSums]);

  /** Плитки итогов по менеджерам: ненулевые продажи или ненулевой остаток кассы (лидер первым).
   *  На плитке — наличные менеджера к инкассации на текущий момент (снапшот, не за период). */
  const managerTotals = useMemo(() => {
    const balanceById = new Map(
      managerCashBalances.map((item) => [item.managerId, Number(item.balance)])
    );
    return managerSums
      .map((item) => ({
        key: item.managerId ?? '__none',
        label: item.name,
        sum: item.sum,
        cashBalance: item.managerId ? (balanceById.get(item.managerId) ?? 0) : 0,
      }))
      .filter((item) => item.sum !== 0 || item.cashBalance !== 0);
  }, [managerSums, managerCashBalances]);

  const totalsTiles = totalsMode === 'manager' ? managerTotals : directionTotals;

  const columns = [
    {
      key: 'isManual',
      title: 'Тип записи',
      render: (item: MoneyMovement) => (
        <span
          className={`${styles.entryKindBadge} ${
            item.isManual ? styles.entryKindManual : styles.entryKindAuto
          }`}
          title={
            item.isManual
              ? 'Ручная проводка — внесена через «Ручную запись в журнале ДП»'
              : 'Автоматическая запись по оплате договора'
          }
        >
          {item.isManual ? 'Ручн.' : 'Авто'}
        </span>
      ),
    },
    {
      key: 'paymentDate',
      title: 'Дата',
      render: (item: MoneyMovement) => (
        <>
          {formatDpDate(item.paymentDate)}
          <EditedFieldMark original={editedOriginal(item, 'paymentDate', formatDpDate)} />
        </>
      ),
    },
    {
      key: 'performedAt',
      title: 'Время оплаты',
      render: (item: MoneyMovement) => formatDpTime(item.performedAt),
    },
    {
      key: 'manager',
      title: 'Менеджер',
      render: (item: MoneyMovement) => (
        <>
          {item.manager?.name || '—'}
          <EditedFieldMark original={editedOriginal(item, 'managerName')} />
        </>
      ),
    },
    {
      key: 'office',
      title: 'Офис',
      render: (item: MoneyMovement) => item.office || '—',
    },
    {
      key: 'contractNumber',
      title: '№ договора',
      render: (item: MoneyMovement) => (
        <span className={styles.contractCell}>
          {item.contractNumber || '—'}
          <EditedFieldMark original={editedOriginal(item, 'contractNumber')} />
        </span>
      ),
    },
    {
      key: 'customerName',
      title: 'Заказчик',
      render: (item: MoneyMovement) => (
        <div className={styles.customerCell}>
          {item.customerName || '—'}
          <EditedFieldMark original={editedOriginal(item, 'customerName')} />
          {item.addendumNumber != null ? (
            <span className={styles.customerSubline}>Д/с №{item.addendumNumber}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'direction',
      title: 'Направление',
      render: (item: MoneyMovement) => (
        <>
          {item.direction || '—'}
          <EditedFieldMark original={editedOriginal(item, 'direction')} />
        </>
      ),
    },
    {
      key: 'basis',
      title: 'Основание',
      render: (item: MoneyMovement) => {
        // Основание и примечание живут в одной колонке — объединяем их «было …».
        const parts: string[] = [];
        const basisOriginal = editedOriginal(item, 'basis');
        if (basisOriginal !== null) parts.push(`основание — ${basisOriginal}`);
        const notesOriginal = editedOriginal(item, 'notes');
        if (notesOriginal !== null) parts.push(`примечание — ${notesOriginal}`);
        return (
          <div className={styles.basisCell}>
            {item.basis || DP_PAYMENT_TYPE_LABELS[item.paymentType] || item.paymentType}
            <EditedFieldMark original={parts.length > 0 ? parts.join(', ') : null} />
            {item.notes ? <span className={styles.basisSubline}>{item.notes}</span> : null}
          </div>
        );
      },
    },
    {
      key: 'amount',
      title: 'Сумма',
      render: (item: MoneyMovement) => (
        <span
          className={`${styles.amountCell}${
            item.paymentType === 'REFUND' || Number(item.amount) < 0
              ? ` ${styles.amountCellRefund}`
              : ''
          }`}
        >
          {formatDpMoney(item.amount)}
          <EditedFieldMark original={editedOriginal(item, 'amount', formatDpMoney)} />
        </span>
      ),
    },
    {
      key: 'paymentForm',
      title: 'Способ оплаты',
      render: (item: MoneyMovement) => {
        // Способ и исполнитель («Мебель») живут в одной колонке — объединяем их «было …».
        const parts: string[] = [];
        const formOriginal = editedOriginal(item, 'paymentForm', (value) =>
          value ? (DP_PAYMENT_FORM_LABELS[value] ?? value) : '—'
        );
        if (formOriginal !== null) parts.push(`способ — ${formOriginal}`);
        const executorOriginal = editedOriginal(item, 'executorName');
        if (executorOriginal !== null) parts.push(`исполнитель — ${executorOriginal}`);
        return (
          <div className={styles.paymentFormCell}>
            {DP_PAYMENT_FORM_LABELS[item.paymentForm] || item.paymentForm}
            <EditedFieldMark original={parts.length > 0 ? parts.join(', ') : null} />
            {item.executorName ? (
              <span className={styles.paymentFormSubline}>{item.executorName}</span>
            ) : null}
          </div>
        );
      },
    },
    // Правка ручных записей — только супер-админ; удаление в корзину — свои записи
    // текущего месяца (супер-админ — любые). Авто-записи по оплатам не трогаются.
    ...(canEditManualEntries || items.some((item) => canDeleteManualEntry(item))
      ? [
          {
            key: 'entryActions',
            title: '',
            render: (item: MoneyMovement) => {
              const showEdit = canEditManualEntries && item.isManual;
              const showDelete = canDeleteManualEntry(item);
              if (!showEdit && !showDelete) return null;
              return (
                <div className={styles.entryActions}>
                  {showEdit ? (
                    <button
                      type="button"
                      className={styles.editEntryBtn}
                      onClick={() => void openManualEntryEditModal(item)}
                      title="Редактировать ручную запись"
                      aria-label="Редактировать ручную запись"
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
                  {showDelete ? (
                    <button
                      type="button"
                      className={styles.deleteEntryBtn}
                      onClick={() => openDeleteConfirm(item)}
                      title="Удалить запись в корзину"
                      aria-label="Удалить запись в корзину"
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
  ];

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>ДП — оплаты</h1>
                <DpRulesInfoTip />
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{total}</span>
              </span>
            </div>
            {/* Мобильная шапка: в строке с названием — только иконки; кнопки «+» — в ряду ниже. */}
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <DpStatsButton disabled={loading} onClick={openStats} />
              <IncassationHistoryButton disabled={loading} onClick={openIncassationHistory} />
              <AdminListRefreshButton
                disabled={loading}
                busy={loading}
                title="Обновить журнал"
                aria-label={loading ? 'Обновление журнала ДП' : 'Обновление журнала ДП'}
                onClick={() => void refresh()}
              />
              <AdminToolbarTrashButton
                trashCount={trashCount}
                onClick={() => setTrashOpen(true)}
                title="Корзина журнала ДП"
                aria-label="Корзина журнала ДП"
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={loading}
            onClick={() => void openIncassationModal()}
          >
            + Инкассация
          </button>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={loading}
            onClick={() => void openManualEntryModal()}
          >
            + Запись
          </button>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <DpStatsButton disabled={loading} onClick={openStats} />
            <IncassationHistoryButton disabled={loading} onClick={openIncassationHistory} />
            <AdminListRefreshButton
              disabled={loading}
              busy={loading}
              title="Обновить журнал"
              aria-label={loading ? 'Обновление журнала ДП' : 'Обновление журнала ДП'}
              onClick={() => void refresh()}
            />
            <AdminToolbarTrashButton
              trashCount={trashCount}
              onClick={() => setTrashOpen(true)}
              title="Корзина журнала ДП"
              aria-label="Корзина журнала ДП"
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
        aria-label="Итоги по направлениям за выбранный период"
      >
        <div className={`${styles.totalsTile} ${styles.totalsTileTotal}`}>
          <span className={styles.totalsTileLabel}>Итого за период</span>
          <strong className={styles.totalsTileValue}>{formatDpMoney(totalSum)}</strong>
        </div>
        {totalsTiles.map((tile) => {
          // «Прочее» не входит в итоговые продажи — процент к ним не считаем.
          const percent =
            totalSum !== 0 && tile.key !== '__other' ? (tile.sum / totalSum) * 100 : null;
          return (
            <div
              key={tile.key}
              className={styles.totalsTile}
              title={
                tile.key === '__other'
                  ? 'Движения ДС вне продаж — в «Итого за период» не входят'
                  : tile.cashBalance !== 0
                    ? 'Продажи за период; «Касса» — наличные с момента последней инкассации, подлежат сдаче'
                    : undefined
              }
            >
              <span className={styles.totalsTileLabel}>{tile.label}</span>
              <span className={styles.totalsTileValueRow}>
                <strong className={styles.totalsTileValue}>{formatDpMoney(tile.sum)}</strong>
                {percent !== null ? (
                  <span className={styles.totalsTilePercent}>{formatDpPercent(percent)}</span>
                ) : null}
              </span>
              {tile.cashBalance !== 0 ? (
                <span className={styles.totalsTileCash}>
                  Касса: {formatDpMoney(tile.cashBalance)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <section className={cdHub.contractsListFiltersPanel} aria-label="Фильтры журнала ДП">
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
            aria-label="Развернуть фильтры журнала ДП"
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
              <div className={cdHub.contractsListChipRow} role="group" aria-label="Менеджер">
                <span className={cdHub.contractsListChipRowLabel}>Менеджер</span>
                <button
                  type="button"
                  disabled={loading}
                  className={chipClass(scope === 'mine')}
                  onClick={() => setScope('mine')}
                >
                  Мои
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className={chipClass(scope !== 'mine')}
                  onClick={() => setScope('all')}
                >
                  Все
                </button>
              </div>

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
                {DP_MANUAL_DIRECTION_OPTIONS.map((option) => (
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

              <div className={cdHub.contractsListChipRow} role="group" aria-label="Тип записи">
                <span className={cdHub.contractsListChipRowLabel}>Тип записи</span>
                <button
                  type="button"
                  disabled={loading}
                  className={chipClass(!entryKind)}
                  onClick={() => setEntryKind('')}
                >
                  Все
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className={chipClass(entryKind === 'auto')}
                  onClick={() => setEntryKind('auto')}
                >
                  Авто
                </button>
                <button
                  type="button"
                  disabled={loading}
                  className={chipClass(entryKind === 'manual')}
                  onClick={() => setEntryKind('manual')}
                >
                  Ручные
                </button>
              </div>

              <div
                className={cdHub.contractsListChipRow}
                role="radiogroup"
                aria-label="Панель итогов"
              >
                <span className={cdHub.contractsListChipRowLabel}>Панель итогов</span>
                <button
                  type="button"
                  disabled={loading}
                  role="radio"
                  aria-checked={totalsMode === 'direction'}
                  className={chipClass(totalsMode === 'direction')}
                  onClick={() => setTotalsMode('direction')}
                >
                  По направлениям
                </button>
                <button
                  type="button"
                  disabled={loading}
                  role="radio"
                  aria-checked={totalsMode === 'manager'}
                  className={chipClass(totalsMode === 'manager')}
                  onClick={() => setTotalsMode('manager')}
                >
                  По менеджерам
                </button>
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
                {scope !== 'mine' ? (
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
                ) : null}
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
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value) as DpPageLimit)}
                  disabled={loading}
                  className={`${cdHub.contractsListSelect} ${cdHub.contractsListPageLimitSelect}`}
                  aria-label="Количество строк на странице"
                >
                  {DP_PAGE_LIMIT_OPTIONS.map((n) => (
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

      <DataTable
        data={items}
        columns={columns}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="Денежных движений за выбранный период нет"
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

      <DpStatsModal
        open={statsOpen}
        onClose={closeStats}
        managerSums={managerSums}
        directionSums={directionSums}
        directionManagerSums={directionManagerSums}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      <IncassationModal
        open={incassationModalOpen}
        onClose={closeIncassationModal}
        managers={managers}
        balance={cashBalance}
        balanceLoading={cashBalanceLoading}
        onManagerChange={(managerId) => void loadCashBalance(managerId)}
        submitting={incassationSubmitting}
        onSubmit={submitIncassation}
      />

      <IncassationHistoryModal
        open={incassationHistoryOpen}
        onClose={closeIncassationHistory}
        incassations={incassations}
      />

      <ManualEntryModal
        open={manualEntryModalOpen}
        onClose={closeManualEntryModal}
        managers={managers}
        defaultManager={cashBalance}
        executors={executors}
        submitting={manualEntrySubmitting}
        onSubmit={submitManualEntry}
        editing={editingEntry}
      />

      <ConfirmModal
        isOpen={Boolean(deletingEntry)}
        onClose={closeDeleteConfirm}
        title="Удалить запись в корзину"
        message={
          deletingEntry
            ? `Запись от ${formatDpDate(deletingEntry.paymentDate)} на сумму ${formatDpMoney(deletingEntry.amount)} будет перемещена в корзину ДП и исчезнет из журнала, итогов и остатка кассы. Восстановление из корзины невозможно.`
            : ''
        }
        confirmText={deleteSubmitting ? 'Удаление…' : 'В корзину'}
        cancelText="Отмена"
        variant="danger"
        closeOnConfirm={false}
        confirmLoading={deleteSubmitting}
        onConfirm={() => void submitDeleteEntry()}
      />

      <DpTrashModal
        isOpen={trashOpen}
        onClose={() => {
          setTrashOpen(false);
          void refreshTrashCount();
        }}
      />
    </div>
  );
}
