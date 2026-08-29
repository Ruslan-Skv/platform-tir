import type { CalendarEvent } from '@/shared/api/calendar/admin-calendar';

import styles from './CalendarPage.module.css';
import {
  CALENDAR_TYPE_LABELS,
  formatCalendarStatusLabel,
  formatCalendarSubtitle,
  formatEventDateRu,
  formatTimeRange,
} from './calendar.utils';

export function CalendarEventTooltip({ ev }: { ev: CalendarEvent }) {
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
            <strong>{formatCalendarStatusLabel(ev.status)}</strong>
          </div>
        ) : null}
        <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
          <span>Событие</span>
          <strong className={styles.tooltipMultiline}>{ev.title}</strong>
        </div>
        {ev.subtitle ? (
          <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
            <span>Детали</span>
            <strong className={styles.tooltipMultiline}>
              {formatCalendarSubtitle(ev.subtitle)}
            </strong>
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
