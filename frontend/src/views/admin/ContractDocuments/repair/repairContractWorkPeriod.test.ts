import {
  addWorkingDaysExcludingWeekends,
  computeContractDeadlineFromWorkPeriodStart,
  formatContractCalendarDateIso,
} from './repairContractWorkPeriod';

describe('addWorkingDaysExcludingWeekends', () => {
  it('counts only Mon–Fri, start on working day is day 1', () => {
    const end = addWorkingDaysExcludingWeekends('2026-06-03', 5);
    expect(end).not.toBeNull();
    expect(formatContractCalendarDateIso(end!)).toBe('2026-06-09');
  });

  it('skips weekend when start falls on Saturday', () => {
    const end = addWorkingDaysExcludingWeekends('2026-06-06', 1);
    expect(formatContractCalendarDateIso(end!)).toBe('2026-06-08');
  });
});

describe('computeContractDeadlineFromWorkPeriodStart', () => {
  it('combines prepayment date and work period days', () => {
    const r = computeContractDeadlineFromWorkPeriodStart('2026-06-03', '50');
    expect(r?.workingDays).toBe(50);
    expect(r?.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r?.labelRu).toBeTruthy();
  });
});
