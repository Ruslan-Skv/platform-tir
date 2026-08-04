'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  type DriverDeliveryAvailabilityListItem,
  type WaybillTask,
  listDriverDeliveryAvailability,
} from '@/shared/api/admin-waybills';

import {
  type LocalAvailabilityPreviewDay,
  previewDriverSchemeWeek,
} from '../shared/driver-availability.utils';
import {
  STATUS_LABELS,
  buildMonthCalendarCells,
  formatMoney,
  formatMonthYearRu,
  formatTimeRange,
  formatUserLabel,
  formatWaybillDateDisplay,
  resolveWaybillCustomerFields,
  shiftMonth,
  todayIsoDate,
} from '../shared/waybills-page.utils';
import styles from './WaybillsMonthCalendar.module.css';

const WEEKDAY_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MAX_VISIBLE_PILLS = 3;

type WaybillsMonthCalendarProps = {
  year: number;
  monthIndex0: number;
  onMonthChange: (year: number, monthIndex0: number) => void;
  tasks: WaybillTask[];
  loading: boolean;
  onOpenTask: (task: WaybillTask) => void;
  onCreateForDate: (isoDate: string) => void;
  refreshToken?: number;
};

function driverInitials(user: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string;
}): string {
  const first = user.firstName?.trim()?.[0];
  const last = user.lastName?.trim()?.[0];
  if (first && last) return `${first}${last}`.toUpperCase();
  if (first) return first.toUpperCase();
  return (user.email?.[0] ?? '?').toUpperCase();
}

function pillLabel(task: WaybillTask): string {
  const time = formatTimeRange(task.timeFrom, task.timeTo);
  const driver = formatUserLabel(task.driver);
  const direction = task.direction?.trim();
  const parts = [
    time !== '—' ? time : null,
    direction || null,
    driver !== '—' ? driver.split(' ')[0] : null,
  ].filter(Boolean);
  return parts.join(' · ') || 'Задание';
}

function TaskTooltip({ task }: { task: WaybillTask }) {
  const customer = resolveWaybillCustomerFields(task);
  return (
    <div className={styles.tooltip} role="tooltip">
      <div className={styles.tooltipTitle}>
        {formatWaybillDateDisplay(task.date)}
        {task.direction ? ` · ${task.direction}` : ''}
      </div>
      <div className={styles.tooltipGrid}>
        <div className={styles.tooltipField}>
          <span>Время</span>
          <strong>{formatTimeRange(task.timeFrom, task.timeTo)}</strong>
        </div>
        <div className={styles.tooltipField}>
          <span>Статус</span>
          <strong>{STATUS_LABELS[task.status] ?? task.status}</strong>
        </div>
        <div className={styles.tooltipField}>
          <span>Водитель</span>
          <strong>{formatUserLabel(task.driver)}</strong>
        </div>
        <div className={styles.tooltipField}>
          <span>Ответственный</span>
          <strong>{formatUserLabel(task.responsible)}</strong>
        </div>
        {task.contract?.contractNumber ? (
          <div className={styles.tooltipField}>
            <span>Договор</span>
            <strong>{task.contract.contractNumber}</strong>
          </div>
        ) : null}
        <div className={styles.tooltipField}>
          <span>Доставка</span>
          <strong>{formatMoney(task.deliveryCost, task.deliveryPayer)}</strong>
        </div>
        <div className={styles.tooltipField}>
          <span>Грузчики</span>
          <strong>{formatMoney(task.moversCost, task.moversPayer)}</strong>
        </div>
        <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
          <span>Задание</span>
          <strong className={styles.tooltipMultiline}>{task.taskText}</strong>
        </div>
        <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
          <span>Заказчик</span>
          <strong className={styles.tooltipMultiline}>
            {[customer.customerName, customer.customerAddress, customer.customerPhones.join(', ')]
              .filter(Boolean)
              .join('\n') || '—'}
          </strong>
        </div>
        {task.completionNote ? (
          <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
            <span>Примечание</span>
            <strong className={styles.tooltipMultiline}>{task.completionNote}</strong>
          </div>
        ) : null}
      </div>
      <div className={styles.tooltipHint}>Клик — открыть карточку</div>
    </div>
  );
}

export function WaybillsMonthCalendar({
  year,
  monthIndex0,
  onMonthChange,
  tasks,
  loading,
  onOpenTask,
  onCreateForDate,
  refreshToken = 0,
}: WaybillsMonthCalendarProps) {
  const [schemes, setSchemes] = useState<DriverDeliveryAvailabilityListItem[]>([]);
  const today = todayIsoDate();

  useEffect(() => {
    let cancelled = false;
    void listDriverDeliveryAvailability()
      .then((rows) => {
        if (!cancelled) setSchemes(rows.filter((r) => r.scheme?.isActive));
      })
      .catch(() => {
        if (!cancelled) setSchemes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const cells = useMemo(() => buildMonthCalendarCells(year, monthIndex0), [year, monthIndex0]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, WaybillTask[]>();
    for (const task of tasks) {
      const key = task.date.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(task);
      else map.set(key, [task]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const af = a.timeFrom || '99:99';
        const bf = b.timeFrom || '99:99';
        return af.localeCompare(bf);
      });
    }
    return map;
  }, [tasks]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<
      string,
      Array<{ userId: string; label: string; initials: string; day: LocalAvailabilityPreviewDay }>
    >();
    const monthStart = cells.find((c) => c.inMonth)?.iso;
    if (!monthStart || schemes.length === 0) return map;

    for (const item of schemes) {
      const days = previewDriverSchemeWeek({
        scheme: item.scheme,
        fromDate: cells[0]!.iso,
        days: cells.length,
      });
      for (const day of days) {
        const entry = {
          userId: item.user.id,
          label: formatUserLabel(item.user),
          initials: driverInitials(item.user),
          day,
        };
        const list = map.get(day.date);
        if (list) list.push(entry);
        else map.set(day.date, [entry]);
      }
    }
    return map;
  }, [cells, schemes]);

  const goMonth = (delta: number) => {
    const next = shiftMonth(year, monthIndex0, delta);
    onMonthChange(next.year, next.monthIndex0);
  };

  return (
    <section className={styles.root} aria-label="Календарь путевого листа">
      <div className={styles.toolbar}>
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => goMonth(-1)}
            aria-label="Предыдущий месяц"
          >
            ‹
          </button>
          <h2 className={styles.monthTitle}>{formatMonthYearRu(year, monthIndex0)}</h2>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => goMonth(1)}
            aria-label="Следующий месяц"
          >
            ›
          </button>
        </div>
        <div className={styles.legend} aria-hidden>
          <span className={`${styles.legendItem} ${styles.legendPlanned}`}>В плане</span>
          <span className={`${styles.legendItem} ${styles.legendDone}`}>Выполнено</span>
          <span className={`${styles.legendItem} ${styles.legendFailed}`}>Не выполнено</span>
          <span className={`${styles.legendItem} ${styles.legendShiftOn}`}>Смена</span>
          <span className={`${styles.legendItem} ${styles.legendShiftOff}`}>Выходной</span>
        </div>
      </div>

      <div className={styles.grid} role="grid" aria-busy={loading}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className={styles.weekday} role="columnheader">
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          const dayTasks = tasksByDate.get(cell.iso) ?? [];
          const visible = dayTasks.slice(0, MAX_VISIBLE_PILLS);
          const more = dayTasks.length - visible.length;
          const shifts = shiftsByDate.get(cell.iso) ?? [];
          const isToday = cell.iso === today;

          return (
            <div
              key={cell.iso}
              className={[
                styles.day,
                cell.inMonth ? '' : styles.dayOutside,
                isToday ? styles.dayToday : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="gridcell"
            >
              <div className={styles.dayHeader}>
                <span className={styles.dayNum}>{cell.day}</span>
                {cell.inMonth ? (
                  <button
                    type="button"
                    data-admin-mutation
                    className={styles.addDayBtn}
                    title={`Новое задание на ${formatWaybillDateDisplay(cell.iso)}`}
                    aria-label={`Новое задание на ${formatWaybillDateDisplay(cell.iso)}`}
                    onClick={() => onCreateForDate(cell.iso)}
                  >
                    +
                  </button>
                ) : null}
              </div>

              <div className={styles.pills}>
                {visible.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className={`${styles.pill} ${styles[`pill${task.status}`]}`}
                    onClick={() => onOpenTask(task)}
                  >
                    <span className={styles.pillText}>{pillLabel(task)}</span>
                    <TaskTooltip task={task} />
                  </button>
                ))}
                {more > 0 ? (
                  <div
                    className={styles.more}
                    title={dayTasks.slice(MAX_VISIBLE_PILLS).map(pillLabel).join('\n')}
                  >
                    ещё {more}
                  </div>
                ) : null}
                {!loading && cell.inMonth && dayTasks.length === 0 ? (
                  <div className={styles.emptyDay}>нет заданий</div>
                ) : null}
              </div>

              {shifts.length > 0 ? (
                <div className={styles.shifts} aria-label="Смены водителей">
                  {shifts.map((s) => (
                    <span
                      key={s.userId}
                      className={`${styles.shiftDot} ${
                        s.day.kind === 'VACATION' || s.day.kind === 'SICK'
                          ? styles.shiftAbsence
                          : s.day.blocked
                            ? styles.shiftOff
                            : styles.shiftOn
                      }`}
                      title={`${s.label}: ${s.day.label}`}
                    >
                      {s.initials}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {loading ? <p className={styles.loadingHint}>Загрузка заданий месяца…</p> : null}
    </section>
  );
}
