'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import { DIRECTION_LABELS } from '@/views/admin/CRM/Installers/installers-page.constants';

import {
  STATUS_LABELS,
  eachScheduleDay,
  formatDateRange,
  formatMonth,
  formatTime,
  todayIsoDate,
} from '../shared/installation-schedules';
import styles from './InstallationSchedulesMonthCalendar.module.css';

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MAX_VISIBLE_PILLS = 3;
const TOOLTIP_VIEWPORT_PAD = 8;
const TOOLTIP_GAP = 4;

type Props = {
  year: number;
  month: number;
  items: InstallationSchedule[];
  loading: boolean;
  onMonthChange: (year: number, month: number) => void;
  onOpen: (item: InstallationSchedule) => void;
  onCreate: (date: string) => void;
};

function pillLabel(item: InstallationSchedule): string {
  const parts = [
    formatTime(item) !== '—' ? formatTime(item) : null,
    item.customerName?.trim() || null,
    item.installerName?.split(' ')[0] || null,
    item.contractNumber || null,
  ].filter(Boolean);
  return parts.join(' · ') || 'Монтаж';
}

function ItemTooltipBody({ item }: { item: InstallationSchedule }) {
  return (
    <>
      <div className={styles.tooltipTitle}>
        {formatDateRange(item)} · {DIRECTION_LABELS[item.direction]}
      </div>
      <div className={styles.tooltipGrid}>
        <div className={styles.tooltipField}>
          <span>Время</span>
          <strong>{formatTime(item)}</strong>
        </div>
        <div className={styles.tooltipField}>
          <span>Статус</span>
          <strong>{STATUS_LABELS[item.status]}</strong>
        </div>
        <div className={styles.tooltipField}>
          <span>Монтажник</span>
          <strong>{item.installerName || '—'}</strong>
        </div>
        <div className={styles.tooltipField}>
          <span>Договор</span>
          <strong>{item.contractNumber || '—'}</strong>
        </div>
        <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
          <span>Заказ-наряд</span>
          <strong>{item.workOrderLabel || '—'}</strong>
        </div>
        <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
          <span>Заказчик</span>
          <strong className={styles.tooltipMultiline}>
            {[item.customerName, item.customerAddress, ...(item.customerPhones ?? [])]
              .filter(Boolean)
              .join('\n') || '—'}
          </strong>
        </div>
        {item.contactPersons?.length ? (
          <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
            <span>Контактные лица</span>
            <strong className={styles.tooltipMultiline}>
              {item.contactPersons
                .map((person) =>
                  [person.name, ...(person.phones ?? [])].filter(Boolean).join(' · ')
                )
                .join('\n')}
            </strong>
          </div>
        ) : null}
        {item.orderInfo ? (
          <div className={`${styles.tooltipField} ${styles.tooltipFieldWide}`}>
            <span>Информация</span>
            <strong className={styles.tooltipMultiline}>{item.orderInfo}</strong>
          </div>
        ) : null}
      </div>
    </>
  );
}

function CalendarPill({
  item,
  onOpen,
}: {
  item: InstallationSchedule;
  onOpen: (item: InstallationSchedule) => void;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const btn = btnRef.current;
      const tip = tipRef.current;
      if (!btn || !tip) return;

      const btnRect = btn.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      const tipH = tipRect.height || tip.offsetHeight;
      const tipW = tipRect.width || tip.offsetWidth;
      const spaceBelow = window.innerHeight - btnRect.bottom - TOOLTIP_GAP - TOOLTIP_VIEWPORT_PAD;
      const spaceAbove = btnRect.top - TOOLTIP_GAP - TOOLTIP_VIEWPORT_PAD;
      const placeAbove = tipH > spaceBelow && spaceAbove >= spaceBelow;

      let top = placeAbove ? btnRect.top - TOOLTIP_GAP - tipH : btnRect.bottom + TOOLTIP_GAP;
      let left = btnRect.left;

      if (left + tipW > window.innerWidth - TOOLTIP_VIEWPORT_PAD) {
        left = btnRect.right - tipW;
      }
      left = Math.max(
        TOOLTIP_VIEWPORT_PAD,
        Math.min(left, window.innerWidth - tipW - TOOLTIP_VIEWPORT_PAD)
      );
      top = Math.max(
        TOOLTIP_VIEWPORT_PAD,
        Math.min(top, window.innerHeight - tipH - TOOLTIP_VIEWPORT_PAD)
      );

      setCoords({ top, left });
    };

    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        className={`${styles.pill} ${styles[`pill${item.status}`]}`}
        onClick={() => onOpen(item)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          setOpen(false);
          setCoords(null);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setCoords(null);
        }}
      >
        <span className={styles.pillText}>{pillLabel(item)}</span>
      </button>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tipRef}
              className={styles.tooltip}
              role="tooltip"
              style={{
                top: coords?.top ?? 0,
                left: coords?.left ?? 0,
                visibility: coords ? 'visible' : 'hidden',
              }}
            >
              <ItemTooltipBody item={item} />
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export function InstallationSchedulesMonthCalendar({
  year,
  month,
  items,
  loading,
  onMonthChange,
  onOpen,
  onCreate,
}: Props) {
  const today = todayIsoDate();
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1));
    const offset = (first.getUTCDay() + 6) % 7;
    const start = new Date(Date.UTC(year, month, 1 - offset));
    const count = Math.ceil((offset + new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) / 7) * 7;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + index);
      return {
        iso: date.toISOString().slice(0, 10),
        day: date.getUTCDate(),
        inMonth: date.getUTCMonth() === month,
      };
    });
  }, [month, year]);

  const byDate = useMemo(() => {
    const map = new Map<string, InstallationSchedule[]>();
    for (const item of items) {
      for (const key of eachScheduleDay(item)) {
        map.set(key, [...(map.get(key) ?? []), item]);
      }
    }
    map.forEach((day) => day.sort((a, b) => formatTime(a).localeCompare(formatTime(b), 'ru')));
    return map;
  }, [items]);

  const move = (delta: number) => {
    const next = new Date(Date.UTC(year, month + delta, 1));
    onMonthChange(next.getUTCFullYear(), next.getUTCMonth());
  };

  return (
    <section className={styles.root} aria-busy={loading}>
      <div className={styles.toolbar}>
        <div className={styles.monthNav}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => move(-1)}
            aria-label="Предыдущий месяц"
          >
            ‹
          </button>
          <h2 className={styles.monthTitle}>{formatMonth(year, month)}</h2>
          <button
            type="button"
            className={styles.navBtn}
            onClick={() => move(1)}
            aria-label="Следующий месяц"
          >
            ›
          </button>
        </div>
        <div className={styles.legend}>
          <span className={`${styles.legendItem} ${styles.legendPlanned}`}>В плане</span>
          <span className={`${styles.legendItem} ${styles.legendDone}`}>Выполнено</span>
          <span className={`${styles.legendItem} ${styles.legendFailed}`}>Не выполнено</span>
        </div>
      </div>
      {loading ? <p className={styles.loadingHint}>Загрузка календаря…</p> : null}
      <div className={styles.grid}>
        {WEEKDAYS.map((day) => (
          <div className={styles.weekday} key={day}>
            {day}
          </div>
        ))}
        {cells.map((cell) => {
          const dayItems = byDate.get(cell.iso) ?? [];
          const visible = dayItems.slice(0, MAX_VISIBLE_PILLS);
          const rest = dayItems.length - visible.length;
          return (
            <div
              key={cell.iso}
              className={`${styles.day}${cell.inMonth ? '' : ` ${styles.dayOutside}`}${
                cell.iso === today ? ` ${styles.dayToday}` : ''
              }`}
            >
              <div className={styles.dayHeader}>
                <span className={styles.dayNum}>{cell.day}</span>
                {cell.inMonth ? (
                  <button
                    type="button"
                    className={styles.addDayBtn}
                    title="Добавить монтаж"
                    aria-label={`Добавить монтаж на ${cell.iso}`}
                    onClick={() => onCreate(cell.iso)}
                  >
                    +
                  </button>
                ) : null}
              </div>
              <div className={styles.pills}>
                {visible.map((item) => (
                  <CalendarPill key={item.id} item={item} onOpen={onOpen} />
                ))}
                {rest > 0 ? <div className={styles.more}>ещё {rest}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
