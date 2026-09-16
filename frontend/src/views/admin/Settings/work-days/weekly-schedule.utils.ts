export interface DayScheduleEntry {
  enabled: boolean;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
}

export type WeeklySchedule = Record<string, DayScheduleEntry>;

export const WEEKDAY_ROWS = [
  { key: '1', short: 'Пн', label: 'Понедельник' },
  { key: '2', short: 'Вт', label: 'Вторник' },
  { key: '3', short: 'Ср', label: 'Среда' },
  { key: '4', short: 'Чт', label: 'Четверг' },
  { key: '5', short: 'Пт', label: 'Пятница' },
  { key: '6', short: 'Сб', label: 'Суббота' },
  { key: '7', short: 'Вс', label: 'Воскресенье' },
] as const;

export function buildWeeklyScheduleFromLegacy(fields: {
  workDayStartTime: string;
  workDayEndTime: string;
  workDaysOfWeek: number[];
  gracePeriodMinutes: number;
}): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  for (const { key } of WEEKDAY_ROWS) {
    const day = parseInt(key, 10);
    schedule[key] = {
      enabled: fields.workDaysOfWeek.includes(day),
      startTime: fields.workDayStartTime,
      endTime: fields.workDayEndTime,
      gracePeriodMinutes: fields.gracePeriodMinutes,
    };
  }
  return schedule;
}

export function normalizeWeeklySchedule(
  weekly: unknown,
  legacy: {
    workDayStartTime: string;
    workDayEndTime: string;
    workDaysOfWeek: number[];
    gracePeriodMinutes: number;
  }
): WeeklySchedule {
  if (!weekly || typeof weekly !== 'object') {
    return buildWeeklyScheduleFromLegacy(legacy);
  }
  const base = buildWeeklyScheduleFromLegacy(legacy);
  const raw = weekly as Record<string, Partial<DayScheduleEntry>>;
  for (const { key } of WEEKDAY_ROWS) {
    const entry = raw[key];
    if (!entry) continue;
    base[key] = {
      enabled: entry.enabled ?? base[key]!.enabled,
      startTime: entry.startTime ?? base[key]!.startTime,
      endTime: entry.endTime ?? base[key]!.endTime,
      gracePeriodMinutes: entry.gracePeriodMinutes ?? base[key]!.gracePeriodMinutes,
    };
  }
  return base;
}

export function getWeeklyScheduleDurationMinutes(schedule: WeeklySchedule): number {
  let total = 0;
  for (const { key } of WEEKDAY_ROWS) {
    const day = schedule[key];
    if (!day?.enabled) continue;
    const start = parseTimeToMinutes(day.startTime);
    const end = parseTimeToMinutes(day.endTime);
    if (end <= start) continue;
    total += end - start;
  }
  return total;
}

export function formatWeeklyDuration(minutes: number): string {
  if (minutes <= 0) return '0 ч';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

export function patchWeeklyDay(
  schedule: WeeklySchedule,
  key: string,
  patch: Partial<DayScheduleEntry>
): WeeklySchedule {
  return {
    ...schedule,
    [key]: { ...schedule[key]!, ...patch },
  };
}
