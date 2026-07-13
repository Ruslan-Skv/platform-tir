import { getEnabledWeekdays, type WeeklySchedule } from './utils/weekly-schedule.types';

export function legacyFieldsFromWeeklySchedule(weekly: WeeklySchedule) {
  const enabledDays = getEnabledWeekdays(weekly);
  const refKey = enabledDays[0]?.toString() ?? '1';
  const ref = weekly[refKey] ?? weekly['1']!;
  return {
    workDayStartTime: ref.startTime,
    workDayEndTime: ref.endTime,
    workDaysOfWeek: enabledDays,
    gracePeriodMinutes: ref.gracePeriodMinutes,
  };
}

export const USER_WORK_SCHEDULE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  officeId: true,
  workDayTrackingEnabled: true,
  useCustomWorkSchedule: true,
  workDayStartTime: true,
  workDayEndTime: true,
  workDaysOfWeek: true,
  gracePeriodMinutes: true,
  workDayWeeklySchedule: true,
  office: { select: { id: true, name: true } },
} as const;

export const OFFICE_WORK_SCHEDULE_SELECT = {
  id: true,
  name: true,
  isActive: true,
  allowedIps: true,
  skipWorkDayIpCheck: true,
  workDayStartTime: true,
  workDayEndTime: true,
  workDaysOfWeek: true,
  gracePeriodMinutes: true,
  workDayWeeklySchedule: true,
} as const;
