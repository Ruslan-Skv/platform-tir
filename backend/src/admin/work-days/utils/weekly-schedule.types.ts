export interface DayScheduleEntry {
  enabled: boolean;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
}

/** Ключи «1»–«7» (пн–вс, ISO). */
export type WeeklySchedule = Record<string, DayScheduleEntry>;

export const WEEKDAY_KEYS = ['1', '2', '3', '4', '5', '6', '7'] as const;

export interface LegacyScheduleFields {
  workDayStartTime: string;
  workDayEndTime: string;
  workDaysOfWeek: number[];
  gracePeriodMinutes: number;
}

export function buildWeeklyScheduleFromLegacy(fields: LegacyScheduleFields): WeeklySchedule {
  const schedule: WeeklySchedule = {};
  for (const key of WEEKDAY_KEYS) {
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
  legacy: LegacyScheduleFields,
): WeeklySchedule {
  if (!weekly || typeof weekly !== 'object') {
    return buildWeeklyScheduleFromLegacy(legacy);
  }
  const raw = weekly as Record<string, Partial<DayScheduleEntry>>;
  const base = buildWeeklyScheduleFromLegacy(legacy);
  for (const key of WEEKDAY_KEYS) {
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

export function getEnabledWeekdays(schedule: WeeklySchedule): number[] {
  return WEEKDAY_KEYS.filter((key) => schedule[key]?.enabled).map((key) => parseInt(key, 10));
}
