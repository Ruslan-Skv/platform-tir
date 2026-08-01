'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type DriverDeliveryAvailabilityListItem,
  listDriverDeliveryAvailability,
} from '@/shared/api/admin-waybills';

import {
  formatDayChipDate,
  isSundayIsoDate,
  previewDriverSchemeWeek,
} from '../shared/driver-availability.utils';
import { formatUserLabel, todayIsoDate } from '../shared/waybills-page.utils';
import styles from './WaybillsWeekAvailabilityPanel.module.css';

const WEEK_DAYS = 7;

type WaybillsWeekAvailabilityPanelProps = {
  /** Меняется при общем «Обновить» на странице — перезагружает превью. */
  refreshToken?: number;
};

export function WaybillsWeekAvailabilityPanel({
  refreshToken = 0,
}: WaybillsWeekAvailabilityPanelProps) {
  const [items, setItems] = useState<DriverDeliveryAvailabilityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fromDate = todayIsoDate();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listDriverDeliveryAvailability());
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Не удалось загрузить доступность');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  const rows = useMemo(() => {
    return items
      .filter((item) => item.scheme?.isActive)
      .map((item) => ({
        userId: item.user.id,
        name: formatUserLabel(item.user),
        days: previewDriverSchemeWeek({
          scheme: item.scheme,
          fromDate,
          days: WEEK_DAYS,
        }),
      }));
  }, [items, fromDate]);

  const headerDays = useMemo(
    () =>
      previewDriverSchemeWeek({
        scheme: null,
        fromDate,
        days: WEEK_DAYS,
      }).map((d) => d.date),
    [fromDate]
  );

  const cellClass = (day: { date: string; kind: string; blocked: boolean }) => {
    const parts = [styles.cell];
    if (day.kind === 'VACATION' || day.kind === 'SICK') parts.push(styles.cellAbsence);
    else if (day.blocked) parts.push(styles.cellOff);
    else parts.push(styles.cellOn);
    if (isSundayIsoDate(day.date)) parts.push(styles.cellSunday);
    return parts.join(' ');
  };

  if (loading) {
    return (
      <section className={styles.panel} aria-label="Доступность водителей на неделю">
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Когда можно планировать доставки</h2>
        </div>
        <p className={styles.hint}>Загрузка схемы на ближайшую неделю…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.panel} aria-label="Доступность водителей на неделю">
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Когда можно планировать доставки</h2>
        </div>
        <p className={styles.error}>{error}</p>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <section className={styles.panel} aria-label="Доступность водителей на неделю">
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Когда можно планировать доставки</h2>
        </div>
        <p className={styles.hint}>
          Активных схем пока нет — в настройках путевого листа задайте цикл и отпуска водителей.
        </p>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-label="Доступность водителей на неделю">
      <div className={styles.titleRow}>
        <div>
          <h2 className={styles.title}>Когда можно планировать доставки</h2>
          <p className={styles.hint}>Ближайшие 7 дней по активным схемам водителей</p>
        </div>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Водитель</th>
              {headerDays.map((date) => (
                <th
                  key={date}
                  scope="col"
                  className={isSundayIsoDate(date) ? styles.headerSunday : undefined}
                >
                  {formatDayChipDate(date)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId}>
                <th scope="row">{row.name}</th>
                {row.days.map((day) => (
                  <td key={day.date}>
                    <span className={cellClass(day)} title={`${day.date}: ${day.label}`}>
                      {day.label}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
