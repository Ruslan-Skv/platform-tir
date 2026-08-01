import type {
  DriverDeliveryAbsenceBlock,
  DriverDeliveryAvailabilityScheme,
  DriverDeliveryCycleDay,
} from '@/shared/api/admin-waybills';

import { todayIsoDate } from './waybills-page.utils';

export function defaultCycleDays(): DriverDeliveryCycleDay[] {
  return [
    { kind: 'ON', availableFrom: '00:00', availableTo: '23:59' },
    { kind: 'ON', availableFrom: '00:00', availableTo: '23:59' },
    { kind: 'OFF', availableFrom: null, availableTo: null },
    { kind: 'ON', availableFrom: '15:00', availableTo: '23:59' },
  ];
}

export function emptyAbsenceBlock(): DriverDeliveryAbsenceBlock {
  const today = todayIsoDate();
  return {
    kind: 'VACATION',
    dateFrom: today,
    dateTo: today,
    note: null,
  };
}

function parseIsoDateUtc(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return new Date();
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function toIsoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysBetweenUtc(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.floor((b - a) / 86_400_000);
}

function findAbsence(
  blocks: DriverDeliveryAbsenceBlock[],
  iso: string
): DriverDeliveryAbsenceBlock | null {
  for (const block of blocks) {
    if (iso >= block.dateFrom && iso <= block.dateTo) return block;
  }
  return null;
}

function absenceLabel(block: DriverDeliveryAbsenceBlock): string {
  return block.kind === 'VACATION' ? 'Отпуск' : 'Больничный';
}

export type LocalAvailabilityPreviewDay = {
  date: string;
  kind: 'ON' | 'OFF' | 'VACATION' | 'SICK' | 'NONE';
  availableFrom: string | null;
  availableTo: string | null;
  label: string;
  /** Выходной / отпуск / больничный — день нельзя выбирать для задания. */
  blocked: boolean;
};

export function isDeliveryDayBlocked(kind: LocalAvailabilityPreviewDay['kind']): boolean {
  return kind === 'OFF' || kind === 'VACATION' || kind === 'SICK';
}

export function weekdayShortRu(iso: string): string {
  const names = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  return names[parseIsoDateUtc(iso).getUTCDay()] ?? '';
}

export function isSundayIsoDate(iso: string): boolean {
  return parseIsoDateUtc(iso).getUTCDay() === 0;
}

export function formatDayChipDate(iso: string): string {
  return `${weekdayShortRu(iso)} ${iso.slice(5)}`;
}

export function previewDriverCycle(params: {
  cycleAnchorDate: string;
  cycleDays: DriverDeliveryCycleDay[];
  absenceBlocks?: DriverDeliveryAbsenceBlock[];
  fromDate?: string;
  days?: number;
}): LocalAvailabilityPreviewDay[] {
  const cycleDays = params.cycleDays;
  if (cycleDays.length === 0) return [];
  const absences = params.absenceBlocks ?? [];
  const anchor = parseIsoDateUtc(params.cycleAnchorDate || todayIsoDate());
  const from = parseIsoDateUtc(params.fromDate || todayIsoDate());
  const count = params.days ?? 14;
  const out: LocalAvailabilityPreviewDay[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    const iso = toIsoDateUtc(d);
    const absence = findAbsence(absences, iso);
    if (absence) {
      out.push({
        date: iso,
        kind: absence.kind,
        availableFrom: null,
        availableTo: null,
        label: absenceLabel(absence),
        blocked: true,
      });
      continue;
    }
    const diff = daysBetweenUtc(anchor, d);
    const index = ((diff % cycleDays.length) + cycleDays.length) % cycleDays.length;
    const day = cycleDays[index]!;
    if (day.kind === 'OFF') {
      out.push({
        date: iso,
        kind: 'OFF',
        availableFrom: null,
        availableTo: null,
        label: 'Выходной',
        blocked: true,
      });
      continue;
    }
    const fromT = day.availableFrom || '00:00';
    const toT = day.availableTo || '23:59';
    const fullDay = fromT === '00:00' && toT === '23:59';
    out.push({
      date: iso,
      kind: 'ON',
      availableFrom: fromT,
      availableTo: toT,
      label: fullDay ? 'Доступен' : `с ${fromT}${toT !== '23:59' ? ` до ${toT}` : ''}`,
      blocked: false,
    });
  }
  return out;
}

/** Превью с учётом отсутствия/выключения схемы: без схемы все дни доступны. */
export function previewDriverSchemeWeek(params: {
  scheme: Pick<
    DriverDeliveryAvailabilityScheme,
    'isActive' | 'cycleAnchorDate' | 'cycleDays' | 'absenceBlocks'
  > | null;
  fromDate?: string;
  days?: number;
}): LocalAvailabilityPreviewDay[] {
  const from = params.fromDate || todayIsoDate();
  const count = params.days ?? 7;
  const scheme = params.scheme;
  if (!scheme || !scheme.isActive || scheme.cycleDays.length === 0) {
    const out: LocalAvailabilityPreviewDay[] = [];
    const start = parseIsoDateUtc(from);
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      out.push({
        date: toIsoDateUtc(d),
        kind: 'NONE',
        availableFrom: null,
        availableTo: null,
        label: !scheme ? 'Без схемы' : !scheme.isActive ? 'Схема выкл.' : 'Без схемы',
        blocked: false,
      });
    }
    return out;
  }
  return previewDriverCycle({
    cycleAnchorDate: scheme.cycleAnchorDate.slice(0, 10),
    cycleDays: scheme.cycleDays,
    absenceBlocks: scheme.absenceBlocks ?? [],
    fromDate: from,
    days: count,
  });
}

export function firstAvailableDate(
  days: LocalAvailabilityPreviewDay[],
  preferred?: string
): string | null {
  if (preferred) {
    const hit = days.find((d) => d.date === preferred && !d.blocked);
    if (hit) return hit.date;
  }
  return days.find((d) => !d.blocked)?.date ?? null;
}

export function getBlockedDeliveryDayMessage(params: {
  scheme: Pick<
    DriverDeliveryAvailabilityScheme,
    'isActive' | 'cycleAnchorDate' | 'cycleDays' | 'absenceBlocks'
  > | null;
  date: string;
}): string | null {
  if (!params.scheme?.isActive || !params.date) return null;
  const day = previewDriverSchemeWeek({
    scheme: params.scheme,
    fromDate: params.date,
    days: 1,
  })[0];
  if (!day?.blocked) return null;
  return `Нельзя создать задание на ${day.date}: у водителя «${day.label}». Выберите доступный день.`;
}
