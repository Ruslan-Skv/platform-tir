import type { CalendarEventType } from '@/shared/api/calendar/admin-calendar';

export const CALENDAR_TYPE_LABELS: Record<CalendarEventType, string> = {
  installation: 'Монтаж',
  waybill: 'Доставка (накладная)',
  measurement: 'Замер',
  contract: 'Договор',
  delivery: 'Доставка (договор)',
  contract_install: 'Монтаж (договор)',
  work_day: 'Рабочий день',
  custom: 'Событие',
};

export const ALL_CALENDAR_TYPES = Object.keys(CALENDAR_TYPE_LABELS) as CalendarEventType[];

const TYPE_DOT: Record<CalendarEventType, string> = {
  installation: 'filterDotInstallation',
  waybill: 'filterDotWaybill',
  measurement: 'filterDotMeasurement',
  contract: 'filterDotContract',
  delivery: 'filterDotDelivery',
  contract_install: 'filterDotContractInstall',
  work_day: 'filterDotWorkDay',
  custom: 'filterDotCustom',
};

const TYPE_PILL: Record<CalendarEventType, string> = {
  installation: 'pillInstallation',
  waybill: 'pillWaybill',
  measurement: 'pillMeasurement',
  contract: 'pillContract',
  delivery: 'pillDelivery',
  contract_install: 'pillContractInstall',
  work_day: 'pillWorkDay',
  custom: 'pillCustom',
};

export function typeDotClass(type: CalendarEventType): string {
  return TYPE_DOT[type];
}

export function typePillClass(type: CalendarEventType): string {
  return TYPE_PILL[type];
}

export type CalendarCell = {
  isoDate: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isPadding?: boolean;
};

export function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatMonthYearRu(year: number, monthIndex0: number): string {
  const d = new Date(year, monthIndex0, 1);
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function shiftMonth(
  year: number,
  monthIndex0: number,
  delta: number
): { year: number; monthIndex0: number } {
  const d = new Date(year, monthIndex0 + delta, 1);
  return { year: d.getFullYear(), monthIndex0: d.getMonth() };
}

export function monthRangeIso(year: number, monthIndex0: number): { from: string; to: string } {
  const from = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  const to = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

function dateToIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Окно «−7 / +7» дней от якорной даты (по умолчанию — сегодня). */
export function dashboardFortnightRangeIso(anchor: Date = new Date()): {
  from: string;
  to: string;
} {
  const base = startOfLocalDay(anchor);
  const from = new Date(base);
  from.setDate(from.getDate() - 7);
  const to = new Date(base);
  to.setDate(to.getDate() + 7);
  return { from: dateToIsoDate(from), to: dateToIsoDate(to) };
}

export function formatDashboardFortnightRangeRu(anchor: Date = new Date()): string {
  const { from, to } = dashboardFortnightRangeIso(anchor);
  return `${formatEventDateRu(from)} — ${formatEventDateRu(to)}`;
}

/** Сетка календаря на ~2 недели вокруг якорной даты (выравнивание по пн–вс). */
export function buildFortnightCalendarCells(anchor: Date = new Date()): CalendarCell[] {
  const today = todayIsoDate();
  const base = startOfLocalDay(anchor);
  const start = new Date(base);
  start.setDate(start.getDate() - 7);
  const end = new Date(base);
  end.setDate(end.getDate() + 7);
  const startWeekday = (start.getDay() + 6) % 7;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({
      isoDate: `pad-start-${i}`,
      day: 0,
      inMonth: false,
      isToday: false,
      isPadding: true,
    });
  }

  const cur = new Date(start);
  while (cur <= end) {
    const iso = dateToIsoDate(cur);
    cells.push({
      isoDate: iso,
      day: cur.getDate(),
      inMonth: true,
      isToday: iso === today,
    });
    cur.setDate(cur.getDate() + 1);
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      isoDate: `pad-end-${cells.length}`,
      day: 0,
      inMonth: false,
      isToday: false,
      isPadding: true,
    });
  }

  return cells;
}

export function buildMonthCalendarCells(year: number, monthIndex0: number): CalendarCell[] {
  const first = new Date(year, monthIndex0, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const prevDays = new Date(year, monthIndex0, 0).getDate();
  const today = todayIsoDate();
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    const day = prevDays - startWeekday + i + 1;
    const prev = shiftMonth(year, monthIndex0, -1);
    const iso = `${prev.year}-${String(prev.monthIndex0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ isoDate: iso, day, inMonth: false, isToday: iso === today });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ isoDate: iso, day, inMonth: true, isToday: iso === today });
  }

  while (cells.length % 7 !== 0 || cells.length < 42) {
    const nextIndex = cells.length - (startWeekday + daysInMonth);
    const day = nextIndex + 1;
    const next = shiftMonth(year, monthIndex0, 1);
    const iso = `${next.year}-${String(next.monthIndex0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({ isoDate: iso, day, inMonth: false, isToday: iso === today });
    if (cells.length >= 42) break;
  }

  return cells;
}

export function formatTimeRange(from: string | null, to: string | null): string {
  if (from && to) return `${from}–${to}`;
  if (from) return from;
  if (to) return `до ${to}`;
  return '—';
}

export function formatEventDateRu(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function pillLabel(ev: {
  timeFrom: string | null;
  timeTo: string | null;
  title: string;
}): string {
  const time = formatTimeRange(ev.timeFrom, ev.timeTo);
  const parts = [time !== '—' ? time : null, ev.title].filter(Boolean);
  return parts.join(' · ') || ev.title;
}
