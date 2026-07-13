'use client';

import styles from './WeeklyScheduleEditor.module.css';
import { type DayScheduleEntry, WEEKDAY_ROWS, type WeeklySchedule } from './weekly-schedule.utils';

type WeeklyScheduleEditorProps = {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  disabled?: boolean;
};

export function WeeklyScheduleEditor({
  schedule,
  onChange,
  disabled = false,
}: WeeklyScheduleEditorProps) {
  const updateDay = (key: string, patch: Partial<DayScheduleEntry>) => {
    onChange({
      ...schedule,
      [key]: { ...schedule[key]!, ...patch },
    });
  };

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>День</th>
            <th>Рабочий</th>
            <th>Начало</th>
            <th>Конец</th>
            <th>Допуск (мин)</th>
          </tr>
        </thead>
        <tbody>
          {WEEKDAY_ROWS.map(({ key, label }) => {
            const day = schedule[key]!;
            return (
              <tr key={key} className={!day.enabled ? styles.rowOff : undefined}>
                <td>{label}</td>
                <td>
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    disabled={disabled}
                    onChange={(e) => updateDay(key, { enabled: e.target.checked })}
                    aria-label={`${label} — рабочий день`}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={day.startTime}
                    disabled={disabled || !day.enabled}
                    onChange={(e) => updateDay(key, { startTime: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={day.endTime}
                    disabled={disabled || !day.enabled}
                    onChange={(e) => updateDay(key, { endTime: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className={styles.numInput}
                    min={0}
                    max={120}
                    value={day.gracePeriodMinutes}
                    disabled={disabled || !day.enabled}
                    onChange={(e) =>
                      updateDay(key, { gracePeriodMinutes: parseInt(e.target.value, 10) || 0 })
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
