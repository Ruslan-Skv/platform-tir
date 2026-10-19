'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  OdpzhDeadlineWarningLevel,
  OdpzhScheduleRow,
  OdpzhScheduleStatus,
} from '@/shared/api/crm/admin-odpzh-schedules';
import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import { CollapsibleFiltersPanel } from '@/views/admin/CRM/shared/CollapsibleFiltersPanel';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { OdpzhSchedulesGanttTimeline } from './OdpzhSchedulesGanttTimeline';
import { OdpzhSchedulesRulesInfoTip } from './OdpzhSchedulesRulesInfoTip';
import type { OdpzhSchedulesPageModel } from './hooks/useOdpzhSchedulesPage';
import styles from './odpzh-schedules.module.css';

const STATUS_TABS: Array<{ key: OdpzhSchedulesPageModel['statusFilter']; label: string }> = [
  { key: 'ALL', label: 'Все' },
  { key: 'NEW', label: 'Новые договора' },
  { key: 'IN_PROGRESS', label: 'В работе' },
  { key: 'INSTALLATIONS_DONE', label: 'Выполненные монтажи' },
  { key: 'CLOSED', label: 'Закрытые' },
];

const STATUS_BADGES: Record<OdpzhScheduleStatus, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  INSTALLATIONS_DONE: 'Выполнен',
  CLOSED: 'Закрыт',
};

/** Порядок секций списка при фильтре «Все». */
const STATUS_SECTIONS: Array<{ status: OdpzhScheduleStatus; label: string }> = [
  { status: 'NEW', label: 'Новые договора' },
  { status: 'IN_PROGRESS', label: 'В работе' },
  { status: 'INSTALLATIONS_DONE', label: 'Выполненные монтажи' },
  { status: 'CLOSED', label: 'Закрытые' },
];

export const ODPZH_DIRECTION_LABELS: Record<string, string> = {
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Потолки',
  BLINDS: 'Жалюзи',
};

const DIRECTION_FILTERS: Array<{ key: OdpzhSchedulesPageModel['directionFilter']; label: string }> =
  [
    { key: 'ALL', label: 'Все' },
    { key: 'WINDOWS', label: 'Окна' },
    { key: 'DOORS', label: 'Двери' },
    { key: 'CEILINGS', label: 'Потолки' },
    { key: 'BLINDS', label: 'Жалюзи' },
  ];

function chipClass(active: boolean): string {
  return `${cdHub.contractsListChip}${active ? ` ${cdHub.contractsListChipActive}` : ''}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

function formatSum(sum: number | null): string {
  if (sum == null) return '—';
  return `${sum.toLocaleString('ru-RU')} ₽`;
}

function nearestDateClass(iso: string | null): string {
  if (!iso) return styles.nearestDate;
  const today = new Date().toISOString().slice(0, 10);
  if (iso <= today) return `${styles.nearestDate} ${styles.nearestDateToday}`;
  if (iso <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)) {
    return `${styles.nearestDate} ${styles.nearestDateSoon}`;
  }
  return styles.nearestDate;
}

/** Ячейка «Срок договора»: цвет — по уровню предупреждения. */
function deadlineCellClass(warning: OdpzhDeadlineWarningLevel | null): string {
  if (warning === 'OVERDUE' || warning === 'D3') {
    return `${styles.deadline} ${styles.deadlineUrgent}`;
  }
  if (warning === 'D10' || warning === 'D20') return `${styles.deadline} ${styles.deadlineWarn}`;
  return styles.deadline;
}

/** «до 21.10.2026 · осталось 3 дн.» / «просрочен 5 дн.» — двумя строками. */
function DeadlineCell({ item }: { item: OdpzhScheduleRow }) {
  if (!item.contractEndDate) return <>—</>;
  const days = item.deadlineDaysLeft;
  let second: string | null = null;
  if (days != null && days < 0) second = `просрочен ${Math.abs(days)} дн.`;
  else if (days === 0) second = 'сегодня';
  else if (days != null) second = `осталось ${days} дн.`;
  return (
    <div className={styles.deadlineCol}>
      <div>до {formatDate(item.contractEndDate)}</div>
      {second ? <div>{second}</div> : null}
    </div>
  );
}

export function OdpzhSchedulesPageView({ model }: { model: OdpzhSchedulesPageModel }) {
  const {
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    directionFilter,
    setDirectionFilter,
    search,
    setSearch,
    items,
    loading,
    message,
    setMessage,
    statusCounts,
    refresh,
  } = model;

  const countTitle = `${items.length} в выборке`;

  /** При фильтре «Все» — секции по статусам; иначе один плоский список. */
  const sections = useMemo(() => {
    if (statusFilter !== 'ALL') {
      return [{ id: statusFilter, label: null as string | null, items }];
    }
    return STATUS_SECTIONS.map(({ status, label }) => ({
      id: status,
      label,
      items: items.filter((item) => item.status === status),
    })).filter((section) => section.items.length > 0);
  }, [items, statusFilter]);

  /*
   * Горизонтальный скролл со стрелками — как у таблицы «Договоры в расчёте»
   * (общий DataTable): наведение на стрелку плавно прокручивает таблицу.
   */
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const stopScrolling = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const startScrolling = useCallback(
    (direction: 'left' | 'right') => {
      stopScrolling();
      scrollIntervalRef.current = setInterval(() => {
        const container = scrollContainerRef.current;
        if (!container) {
          stopScrolling();
          return;
        }
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (direction === 'left') {
          container.scrollLeft = Math.max(0, container.scrollLeft - 10);
          if (container.scrollLeft === 0) stopScrolling();
        } else {
          container.scrollLeft = Math.min(maxScroll, container.scrollLeft + 10);
          if (container.scrollLeft >= maxScroll - 1) stopScrolling();
        }
      }, 16);
    },
    [stopScrolling]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScrollability = () => {
      const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      setShowLeftArrow(hasHorizontalScroll && container.scrollLeft > 5);
      setShowRightArrow(hasHorizontalScroll && container.scrollLeft < maxScrollLeft - 5);
    };

    checkScrollability();
    container.addEventListener('scroll', checkScrollability, { passive: true });
    window.addEventListener('resize', checkScrollability);
    const timeouts = [0, 100].map((delay) => setTimeout(checkScrollability, delay));

    return () => {
      container.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
      timeouts.forEach(clearTimeout);
    };
  }, [items, viewMode]);

  useEffect(() => stopScrolling, [stopScrolling]);

  /** Чипы активных фильтров для свёрнутого состояния (как в журнале ДП). */
  const filtersSummary = useMemo(() => {
    const labels: string[] = [];
    const statusLabel = STATUS_TABS.find((tab) => tab.key === statusFilter)?.label;
    if (statusFilter !== 'ALL' && statusLabel) labels.push(`Статус: ${statusLabel}`);
    if (directionFilter !== 'ALL') {
      const directionLabel = DIRECTION_FILTERS.find((tab) => tab.key === directionFilter)?.label;
      if (directionLabel) labels.push(`Направление: ${directionLabel}`);
    }
    if (search.trim()) labels.push(`Поиск: ${search.trim()}`);
    return labels;
  }, [statusFilter, directionFilter, search]);

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsListHeaderTitleGroup}>
              <h1 className={cdHub.title}>План-график ОДПЖ</h1>
              <OdpzhSchedulesRulesInfoTip />
            </div>
            <span className={cdHub.contractsListCount} title={countTitle}>
              <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
              <span className={cdHub.contractsListCountMobile}>{items.length}</span>
            </span>
          </div>
        </div>
        <div className={cdHub.contractsHeaderIconActionsDesktop}>
          <AdminListRefreshButton
            disabled={loading}
            busy={loading}
            title="Обновить"
            aria-label="Обновить"
            onClick={() => void refresh()}
          />
        </div>
      </div>

      <div className={styles.viewModeRow} role="group" aria-label="Режим отображения">
        <button
          type="button"
          className={`${styles.viewModeBtn}${viewMode === 'list' ? ` ${styles.viewModeBtnActive}` : ''}`}
          onClick={() => setViewMode('list')}
        >
          Список
        </button>
        <button
          type="button"
          className={`${styles.viewModeBtn}${viewMode === 'timeline' ? ` ${styles.viewModeBtnActive}` : ''}`}
          onClick={() => setViewMode('timeline')}
        >
          Таймлайн
        </button>
      </div>

      {message ? (
        <div className={`${styles.message} ${styles.messageerror}`}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <CollapsibleFiltersPanel
        storageKey="admin_odpzh_schedules_filters_collapsed"
        title="Фильтры план-графика"
        summaryLabels={filtersSummary}
      >
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Статус">
            <span className={cdHub.contractsListChipRowLabel}>Статус</span>
            {STATUS_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                disabled={loading || (viewMode === 'timeline' && key === 'CLOSED')}
                className={chipClass(statusFilter === key)}
                onClick={() => setStatusFilter(key)}
              >
                {label} ({statusCounts[key]})
              </button>
            ))}
          </div>
          <div className={cdHub.contractsListChipRow} role="group" aria-label="Направление">
            <span className={cdHub.contractsListChipRowLabel}>Направление</span>
            {DIRECTION_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                disabled={loading}
                className={chipClass(directionFilter === key)}
                onClick={() => setDirectionFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={cdHub.contractsListFilters}>
            <input
              type="search"
              className={
                search.trim()
                  ? `${cdHub.contractsListSearchInput} ${cdHub.contractsListFilterActive}`
                  : cdHub.contractsListSearchInput
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
              placeholder="Поиск по номеру договора, ФИО заказчика, адресу..."
              aria-label="Поиск по номеру договора, ФИО заказчика, адресу"
            />
          </div>
        </div>
      </CollapsibleFiltersPanel>

      {viewMode === 'timeline' ? (
        <OdpzhSchedulesGanttTimeline items={items} loading={loading} />
      ) : (
        <div className={styles.tableWrap}>
          <div className={dataTableStyles.tableWrapper}>
            {showLeftArrow ? (
              <div
                className={`${dataTableStyles.scrollArrow} ${dataTableStyles.scrollArrowLeft}`}
                onMouseEnter={() => startScrolling('left')}
                onMouseLeave={stopScrolling}
              >
                ←
              </div>
            ) : null}
            <div className={dataTableStyles.scrollContainer} ref={scrollContainerRef}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Дата</th>
                    <th>Направление</th>
                    <th>Клиент</th>
                    <th>Адрес</th>
                    <th>Сумма</th>
                    <th>Срок договора</th>
                    <th>Монтажники</th>
                    <th>Монтаж</th>
                    <th>Примечание</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((section) => (
                    <Fragment key={section.id}>
                      {section.label ? (
                        <tr
                          className={`${styles.statusSectionRow} ${styles[`statusSectionRow${section.id}`]}`}
                        >
                          <td colSpan={11}>
                            {section.label} ({section.items.length})
                          </td>
                        </tr>
                      ) : null}
                      {section.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className={styles.contractCol}>
                              <div className={styles.contractNumber}>
                                {item.contractNumber ?? '—'}
                              </div>
                              {item.objectDescription ? (
                                <div className={styles.subline} title={item.objectDescription}>
                                  {item.objectDescription}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className={styles.nowrap}>{formatDate(item.contractDate)}</td>
                          <td className={styles.nowrap}>
                            {ODPZH_DIRECTION_LABELS[item.kind] ?? item.kind}
                          </td>
                          <td>{item.customerName ?? '—'}</td>
                          <td>{item.customerAddress ?? '—'}</td>
                          <td className={styles.sum}>{formatSum(item.contractSum)}</td>
                          <td
                            className={deadlineCellClass(item.deadlineWarning)}
                            title={
                              item.contractDate
                                ? `Договор от ${formatDate(item.contractDate)}${
                                    item.workPeriodDays != null
                                      ? ` · срок ${item.workPeriodDays} раб. дн.`
                                      : ''
                                  }`
                                : undefined
                            }
                          >
                            <DeadlineCell item={item} />
                          </td>
                          <td className={styles.installerCell}>
                            {item.installerNames.length
                              ? item.installerNames.map((name) => (
                                  <span key={name} className={styles.installerName} title={name}>
                                    {name}
                                  </span>
                                ))
                              : '—'}
                          </td>
                          <td className={styles.installCell}>
                            {item.allInstallationsDone ? (
                              <span
                                className={styles.doneBadge}
                                title={`Все монтажи выполнены (${item.installationsDoneCount} из ${item.installationsTotalCount})`}
                              >
                                <span>Монтаж выполнен</span>
                                <span>{formatDate(item.lastCompletedInstallationDate)}</span>
                              </span>
                            ) : (
                              <span
                                className={nearestDateClass(item.nearestInstallationDate)}
                                title={
                                  item.installationsDoneCount > 0
                                    ? `Выполнено монтажей: ${item.installationsDoneCount} из ${item.installationsTotalCount}`
                                    : undefined
                                }
                              >
                                {formatDate(item.nearestInstallationDate)}
                              </span>
                            )}
                          </td>
                          <td className={styles.noteCell} title={item.managerNote ?? undefined}>
                            {item.managerNote ?? '—'}
                          </td>
                          <td className={styles.statusCell}>{STATUS_BADGES[item.status]}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {!loading && items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className={styles.empty}>
                        Нет договоров в этом разделе
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {showRightArrow ? (
              <div
                className={`${dataTableStyles.scrollArrow} ${dataTableStyles.scrollArrowRight}`}
                onMouseEnter={() => startScrolling('right')}
                onMouseLeave={stopScrolling}
              >
                →
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
