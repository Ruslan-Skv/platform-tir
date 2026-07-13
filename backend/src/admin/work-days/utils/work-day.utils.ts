import { WorkDaySettings } from '@prisma/client';
import {
  type DayScheduleEntry,
  type WeeklySchedule,
  buildWeeklyScheduleFromLegacy,
  getEnabledWeekdays,
  normalizeWeeklySchedule,
} from './weekly-schedule.types';

export const WORK_DAY_TIMEZONE = 'Europe/Moscow';

export interface ResolvedDaySchedule extends DayScheduleEntry {
  isWorkDay: boolean;
}

export function getTodayDateInTimezone(timezone = WORK_DAY_TIMEZONE): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

export function getDayOfWeekInTimezone(timezone = WORK_DAY_TIMEZONE, date?: Date): number {
  const target = date ?? new Date();
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(target);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekday] ?? 1;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

export function combineDateAndTime(
  workDate: Date,
  time: string,
  timezone = WORK_DAY_TIMEZONE,
): Date {
  const dateStr = workDate.toISOString().slice(0, 10);
  const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
  const minutes = parseTimeToMinutes(time);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, mins, 0, 0));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(utcGuess);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  const localAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  const offset = localAsUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offset);
}

type ScheduleSource = {
  useCustomWorkSchedule?: boolean;
  workDayStartTime?: string | null;
  workDayEndTime?: string | null;
  workDaysOfWeek?: number[];
  gracePeriodMinutes?: number | null;
  workDayWeeklySchedule?: unknown;
};

function getLegacyFields(
  source: ScheduleSource,
  defaultGrace: number,
): {
  workDayStartTime: string;
  workDayEndTime: string;
  workDaysOfWeek: number[];
  gracePeriodMinutes: number;
} {
  return {
    workDayStartTime: source.workDayStartTime ?? '09:00',
    workDayEndTime: source.workDayEndTime ?? '18:00',
    workDaysOfWeek:
      source.workDaysOfWeek && source.workDaysOfWeek.length > 0
        ? source.workDaysOfWeek
        : [1, 2, 3, 4, 5],
    gracePeriodMinutes: source.gracePeriodMinutes ?? defaultGrace,
  };
}

export function resolveWeeklySchedule(
  user: ScheduleSource,
  office: ScheduleSource | null,
  settings: Pick<WorkDaySettings, 'defaultGracePeriodMinutes'>,
): WeeklySchedule {
  const defaultGrace = settings.defaultGracePeriodMinutes;
  if (user.useCustomWorkSchedule) {
    return normalizeWeeklySchedule(user.workDayWeeklySchedule, getLegacyFields(user, defaultGrace));
  }
  if (office) {
    return normalizeWeeklySchedule(
      office.workDayWeeklySchedule,
      getLegacyFields(office, defaultGrace),
    );
  }
  return buildWeeklyScheduleFromLegacy({
    workDayStartTime: '09:00',
    workDayEndTime: '18:00',
    workDaysOfWeek: [1, 2, 3, 4, 5],
    gracePeriodMinutes: defaultGrace,
  });
}

export function resolveDaySchedule(
  user: ScheduleSource,
  office: ScheduleSource | null,
  settings: Pick<WorkDaySettings, 'defaultGracePeriodMinutes'>,
  dayOfWeek: number,
): ResolvedDaySchedule {
  const weekly = resolveWeeklySchedule(user, office, settings);
  const entry = weekly[String(dayOfWeek)] ?? {
    enabled: false,
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: settings.defaultGracePeriodMinutes,
  };
  return {
    ...entry,
    isWorkDay: entry.enabled,
  };
}

/** @deprecated Используйте resolveDaySchedule — оставлено для обратной совместимости ответа API */
export function resolveWorkSchedule(
  user: ScheduleSource,
  office: ScheduleSource | null,
  settings: Pick<WorkDaySettings, 'defaultGracePeriodMinutes'>,
  dayOfWeek = getDayOfWeekInTimezone(),
) {
  const weekly = resolveWeeklySchedule(user, office, settings);
  const day = resolveDaySchedule(user, office, settings, dayOfWeek);
  return {
    startTime: day.startTime,
    endTime: day.endTime,
    workDaysOfWeek: getEnabledWeekdays(weekly),
    gracePeriodMinutes: day.gracePeriodMinutes,
    weeklySchedule: weekly,
    today: day,
  };
}

export function isMobileUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
}

export function extractClientIp(
  forwardedFor: string | string[] | undefined,
  realIp: string | undefined,
  remoteAddress: string | undefined,
): string | null {
  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }
  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]?.split(',')[0]?.trim() ?? null;
  }
  if (realIp) return realIp;
  if (remoteAddress) return remoteAddress.replace('::ffff:', '');
  return null;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (Number.isNaN(n) || n < 0 || n > 255) return null;
    value = (value << 8) + n;
  }
  return value >>> 0;
}

export function isIpAllowed(clientIp: string | null, allowedIps: string[]): boolean {
  if (!clientIp) return false;
  if (allowedIps.length === 0) return false;
  const normalizedClient = clientIp.replace('::ffff:', '');

  for (const allowed of allowedIps) {
    const trimmed = allowed.trim();
    if (!trimmed) continue;
    if (trimmed === normalizedClient) return true;

    if (trimmed.includes('/')) {
      const [network, prefixStr] = trimmed.split('/');
      const prefix = parseInt(prefixStr ?? '', 10);
      const networkInt = ipv4ToInt(network);
      const clientInt = ipv4ToInt(normalizedClient);
      if (networkInt !== null && clientInt !== null && !Number.isNaN(prefix) && prefix >= 0) {
        const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
        if ((networkInt & mask) === (clientInt & mask)) return true;
      }
    }
  }
  return false;
}

export function calculateLateMinutes(
  startedAt: Date,
  workDate: Date,
  schedule: Pick<ResolvedDaySchedule, 'startTime' | 'gracePeriodMinutes'>,
  timezone = WORK_DAY_TIMEZONE,
): number {
  const scheduledStart = combineDateAndTime(workDate, schedule.startTime, timezone);
  const graceMs = schedule.gracePeriodMinutes * 60_000;
  const diff = startedAt.getTime() - scheduledStart.getTime() - graceMs;
  if (diff <= 0) return 0;
  return Math.ceil(diff / 60_000);
}

export function calculateEarlyLeaveMinutes(
  endedAt: Date,
  workDate: Date,
  schedule: Pick<ResolvedDaySchedule, 'endTime'>,
  timezone = WORK_DAY_TIMEZONE,
): number {
  const scheduledEnd = combineDateAndTime(workDate, schedule.endTime, timezone);
  const diff = scheduledEnd.getTime() - endedAt.getTime();
  if (diff <= 0) return 0;
  return Math.ceil(diff / 60_000);
}

export function pickRandomGreeting(
  messages: string[],
  firstName?: string | null,
  lastName?: string | null,
): string {
  const template =
    messages.length > 0
      ? (messages[Math.floor(Math.random() * messages.length)] ?? messages[0]!)
      : 'Доброго дня, {имя}! Желаем продуктивной работы.';
  return formatGreetingWithName(template, firstName, lastName);
}

export function formatGreetingWithName(
  template: string,
  firstName?: string | null,
  lastName?: string | null,
): string {
  const name = firstName?.trim() || lastName?.trim() || 'коллега';
  if (template.includes('{имя}')) {
    return template.replace(/\{имя\}/g, name);
  }
  if (firstName?.trim()) {
    return `${firstName.trim()}, ${template}`;
  }
  return template;
}
