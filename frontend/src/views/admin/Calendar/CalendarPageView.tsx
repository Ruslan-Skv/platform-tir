'use client';

import type { CalendarEvent } from '@/shared/api/calendar/admin-calendar';
import { useAdminNarrowViewport } from '@/shared/lib/hooks/useAdminNarrowViewport';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import {
  AdminListRefreshButton,
  AdminToolbarIconButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import styles from './CalendarPage.module.css';
import { CalendarRulesInfoTip } from './CalendarRulesInfoTip';
import {
  ALL_CALENDAR_TYPES,
  CALENDAR_TYPE_LABELS,
  CALENDAR_TYPE_SHORT_LABELS,
  buildMonthCalendarCells,
  formatEventDateRu,
  formatMonthYearRu,
  formatTimeRange,
  pillLabel,
  shiftMonth,
  typeDotClass,
  typePillClass,
} from './calendar.utils';
import type { CalendarPageModel } from './hooks/useCalendarPage';
import { CalendarCreateEventModal } from './modals/CalendarCreateEventModal';

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MAX_PILLS_DESKTOP = 4;
const MAX_PILLS_MOBILE = 2;

type Props = { model: CalendarPageModel };

function EventTooltip({ ev }: { ev: CalendarEvent }) {
  return (
    <div className={styles.tooltip} role="tooltip">
      <div className={styles.tooltipTitle}>
        {formatEventDateRu(ev.date)} · {CALENDAR_TYPE_LABELS[ev.type]}
      </div>
      <div className={styles.tooltipGrid}>
        <div className={styles.tooltipField}>
          <span>Время</span>
          <strong>{formatTimeRange(ev.timeFrom, ev.timeTo)}</strong>
        </div>
        {ev.status ? (
          <div className={styles.tooltipField}>
            <span>Статус</span>
            <strong>{ev.status}</strong>
          </div>
        ) : null}
        <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
          <span>Событие</span>
          <strong className={styles.tooltipMultiline}>{ev.title}</strong>
        </div>
        {ev.subtitle ? (
          <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
            <span>Детали</span>
            <strong className={styles.tooltipMultiline}>{ev.subtitle}</strong>
          </div>
        ) : null}
        {ev.body ? (
          <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
            <span>Описание</span>
            <strong className={styles.tooltipMultiline}>{ev.body}</strong>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CalendarPageView({ model }: Props) {
  const {
    year,
    monthIndex0,
    setMonth,
    eventsByDate,
    enabledTypes,
    toggleType,
    loading,
    busy,
    errorMessage,
    reload,
    users,
    openCreate,
    createOpen,
    setCreateOpen,
    createDate,
    setCreateDate,
    createTitle,
    setCreateTitle,
    createBody,
    setCreateBody,
    createTimeFrom,
    setCreateTimeFrom,
    createTimeTo,
    setCreateTimeTo,
    createNotifyIds,
    setCreateNotifyIds,
    submitCreate,
  } = model;

  const isNarrow = useAdminNarrowViewport();
  const maxPills = isNarrow ? MAX_PILLS_MOBILE : MAX_PILLS_DESKTOP;
  const cells = buildMonthCalendarCells(year, monthIndex0);

  const openCreateToday = () => {
    const n = new Date();
    const iso = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    openCreate(iso);
  };

  return (
    <div
      className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage} ${styles.calendarPage}`}
    >
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <h1 className={styles.title}>Календарь</h1>
            <CalendarRulesInfoTip />
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminToolbarIconButton
                type="button"
                disabled={busy}
                title="Добавить событие"
                aria-label="Добавить событие"
                onClick={openCreateToday}
              >
                +
              </AdminToolbarIconButton>
              <AdminListRefreshButton
                onClick={() => void reload()}
                disabled={loading || busy}
                busy={loading}
                title="Обновить"
                aria-label="Обновить календарь"
              />
            </div>
          </div>
        </div>
        <div
          className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions} ${styles.headerActions}`}
        >
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={loading || busy}
            onClick={() => {
              const n = new Date();
              setMonth(n.getFullYear(), n.getMonth());
            }}
          >
            Сегодня
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={busy}
            onClick={openCreateToday}
          >
            + Событие
          </button>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              onClick={() => void reload()}
              disabled={loading || busy}
              busy={loading}
              title="Обновить"
              aria-label="Обновить календарь"
            />
          </div>
        </div>
      </div>

      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <div className={styles.filtersWrap}>
        <div className={styles.filters} role="group" aria-label="Типы событий">
          {ALL_CALENDAR_TYPES.map((type) => {
            const active = enabledTypes.includes(type);
            const label = isNarrow ? CALENDAR_TYPE_SHORT_LABELS[type] : CALENDAR_TYPE_LABELS[type];
            return (
              <button
                key={type}
                type="button"
                className={`${styles.filterChip} ${active ? styles.filterChipActive : ''}`}
                onClick={() => toggleType(type)}
                aria-pressed={active}
                title={CALENDAR_TYPE_LABELS[type]}
              >
                <span className={`${styles.filterDot} ${styles[typeDotClass(type)]}`} aria-hidden />
                <span className={styles.filterLabel}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className={styles.root} aria-busy={loading}>
        <div className={styles.toolbar}>
          <div className={styles.monthNav}>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Предыдущий месяц"
              onClick={() => {
                const next = shiftMonth(year, monthIndex0, -1);
                setMonth(next.year, next.monthIndex0);
              }}
            >
              ‹
            </button>
            <h2 className={styles.monthTitle}>{formatMonthYearRu(year, monthIndex0)}</h2>
            <button
              type="button"
              className={styles.navBtn}
              aria-label="Следующий месяц"
              onClick={() => {
                const next = shiftMonth(year, monthIndex0, 1);
                setMonth(next.year, next.monthIndex0);
              }}
            >
              ›
            </button>
          </div>
          {loading ? <p className={styles.loadingHint}>Загрузка календаря…</p> : null}
        </div>

        <div className={styles.grid}>
          {WEEKDAYS.map((d) => (
            <div key={d} className={styles.weekday}>
              {d}
            </div>
          ))}
          {cells.map((cell) => {
            const dayItems = eventsByDate.get(cell.isoDate) ?? [];
            const visible = dayItems.slice(0, maxPills);
            const rest = dayItems.length - visible.length;
            return (
              <div
                key={cell.isoDate}
                className={`${styles.day}${cell.inMonth ? '' : ` ${styles.dayOutside}`}${
                  cell.isToday ? ` ${styles.dayToday}` : ''
                }${isNarrow ? ` ${styles.dayNarrow}` : ''}`}
              >
                <div className={styles.dayHeader}>
                  <span className={styles.dayNum}>{cell.day}</span>
                  {isNarrow && dayItems.length > 0 ? (
                    <span className={styles.eventCount} aria-label={`${dayItems.length} событий`}>
                      {dayItems.length}
                    </span>
                  ) : null}
                  {cell.inMonth ? (
                    <button
                      type="button"
                      className={styles.addDayBtn}
                      title="Добавить событие"
                      aria-label={`Добавить событие на ${cell.isoDate}`}
                      onClick={() => openCreate(cell.isoDate)}
                    >
                      +
                    </button>
                  ) : null}
                </div>
                <div className={styles.pills}>
                  {visible.map((ev) =>
                    isNarrow ? (
                      <a
                        key={ev.id}
                        href={ev.href}
                        className={`${styles.mobileEventMark} ${styles[typePillClass(ev.type)]}`}
                        title={pillLabel(ev)}
                        aria-label={pillLabel(ev)}
                      />
                    ) : (
                      <a
                        key={ev.id}
                        href={ev.href}
                        className={`${styles.pill} ${styles[typePillClass(ev.type)]}`}
                      >
                        <span className={styles.pillText}>{pillLabel(ev)}</span>
                        <EventTooltip ev={ev} />
                      </a>
                    )
                  )}
                  {rest > 0 ? (
                    <div className={styles.more}>{isNarrow ? `+${rest}` : `ещё ${rest}`}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CalendarCreateEventModal
        open={createOpen}
        busy={busy}
        date={createDate}
        title={createTitle}
        body={createBody}
        timeFrom={createTimeFrom}
        timeTo={createTimeTo}
        notifyIds={createNotifyIds}
        users={users}
        onDateChange={setCreateDate}
        onTitleChange={setCreateTitle}
        onBodyChange={setCreateBody}
        onTimeFromChange={setCreateTimeFrom}
        onTimeToChange={setCreateTimeTo}
        onNotifyIdsChange={setCreateNotifyIds}
        onClose={() => setCreateOpen(false)}
        onSubmit={() => void submitCreate()}
      />
    </div>
  );
}
