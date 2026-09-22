import type { CalendarEventType } from '@/shared/api/calendar/admin-calendar';

export const CALENDAR_TYPE_LABELS: Record<CalendarEventType, string> = {
  installation: 'Монтаж',
  waybill: 'Доставка',
  measurement: 'Замер',
  contract: 'Договор',
  work_day: 'Рабочий день',
  custom: 'Событие',
};

/** Короткие подписи для фильтров на узком экране (дашборд, мобильный календарь). */
export const CALENDAR_TYPE_SHORT_LABELS: Record<CalendarEventType, string> = {
  installation: 'Монтаж',
  waybill: 'Доставка',
  measurement: 'Замер',
  contract: 'Договор',
  work_day: 'Раб. день',
  custom: 'Событие',
};

export const ALL_CALENDAR_TYPES = Object.keys(CALENDAR_TYPE_LABELS) as CalendarEventType[];

const TYPE_DOT: Record<CalendarEventType, string> = {
  installation: 'filterDotInstallation',
  waybill: 'filterDotWaybill',
  measurement: 'filterDotMeasurement',
  contract: 'filterDotContract',
  work_day: 'filterDotWorkDay',
  custom: 'filterDotCustom',
};

const TYPE_PILL: Record<CalendarEventType, string> = {
  installation: 'pillInstallation',
  waybill: 'pillWaybill',
  measurement: 'pillMeasurement',
  contract: 'pillContract',
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

/** Начало недели (понедельник) для даты. */
function startOfLocalWeek(d: Date): Date {
  const day = startOfLocalDay(d);
  const weekday = (day.getDay() + 6) % 7;
  const monday = new Date(day);
  monday.setDate(monday.getDate() - weekday);
  return monday;
}

/**
 * Окно дашборда: три полные недели (пн–вс) — прошлая, текущая и следующая,
 * чтобы соседние недели не обрезались в зависимости от дня недели «сегодня».
 */
export function dashboardCalendarRangeIso(anchor: Date = new Date()): {
  from: string;
  to: string;
} {
  const monday = startOfLocalWeek(anchor);
  const from = new Date(monday);
  from.setDate(from.getDate() - 7);
  const to = new Date(monday);
  to.setDate(to.getDate() + 13); // пн текущей + 6 (вс текущей) + 7 (вс следующей)
  return { from: dateToIsoDate(from), to: dateToIsoDate(to) };
}

export function formatDashboardCalendarRangeRu(anchor: Date = new Date()): string {
  const { from, to } = dashboardCalendarRangeIso(anchor);
  return `${formatEventDateRu(from)} — ${formatEventDateRu(to)}`;
}

/** Сетка дашборда на 3 полные недели пн–вс вокруг якорной (без паддингов). */
export function buildDashboardCalendarCells(anchor: Date = new Date()): CalendarCell[] {
  const today = todayIsoDate();
  const { from, to } = dashboardCalendarRangeIso(anchor);
  const cells: CalendarCell[] = [];
  const cur = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
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

/** Коды направлений CRM → русские подписи (для тултипа / деталей). */
const CALENDAR_DIRECTION_LABELS: Record<string, string> = {
  REPAIR: 'Ремонт',
  WINDOWS: 'Окна',
  DOORS: 'Двери',
  CEILINGS: 'Натяжные потолки',
  FURNITURE: 'Мебель',
  BLINDS: 'Жалюзи',
  DELIVERY: 'Доставка',
};

/** Статусы событий календаря → русские подписи. */
const CALENDAR_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'В плане',
  DONE: 'Выполнено',
  FAILED: 'Не выполнено',
  NEW: 'Новый',
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отказ',
  CONVERTED: 'Договор',
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  EXPIRED: 'Истёк',
  OPEN: 'Открыт',
  CLOSED: 'Закрыт',
  AUTO_CLOSED: 'Авто-закрыт',
};

export function formatCalendarStatusLabel(status: string | null | undefined): string {
  if (!status) return '—';
  return CALENDAR_STATUS_LABELS[status] ?? status;
}

/** Подменяет коды направлений (DOORS и т.п.) в строке деталей на русские названия. */
export function formatCalendarSubtitle(subtitle: string | null | undefined): string {
  if (!subtitle) return '—';
  return subtitle
    .split(' · ')
    .map((part) => CALENDAR_DIRECTION_LABELS[part.trim()] ?? part)
    .join(' · ');
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
