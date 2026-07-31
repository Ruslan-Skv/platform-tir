import type { DriverDeliveryCycleDay } from '@/shared/api/admin-waybills';

import { todayIsoDate } from './waybills-page.utils';

export function defaultCycleDays(): DriverDeliveryCycleDay[] {
  return [
    { kind: 'ON', availableFrom: '00:00', availableTo: '23:59' },
    { kind: 'ON', availableFrom: '00:00', availableTo: '23:59' },
    { kind: 'OFF', availableFrom: null, availableTo: null },
    { kind: 'ON', availableFrom: '15:00', availableTo: '23:59' },
  ];
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

export type LocalAvailabilityPreviewDay = {
  date: string;
  kind: 'ON' | 'OFF';
  availableFrom: string | null;
  availableTo: string | null;
  label: string;
};

export function previewDriverCycle(params: {
  cycleAnchorDate: string;
  cycleDays: DriverDeliveryCycleDay[];
  fromDate?: string;
  days?: number;
}): LocalAvailabilityPreviewDay[] {
  const cycleDays = params.cycleDays;
  if (cycleDays.length === 0) return [];
  const anchor = parseIsoDateUtc(params.cycleAnchorDate || todayIsoDate());
  const from = parseIsoDateUtc(params.fromDate || todayIsoDate());
  const count = params.days ?? 14;
  const out: LocalAvailabilityPreviewDay[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    const diff = daysBetweenUtc(anchor, d);
    const index = ((diff % cycleDays.length) + cycleDays.length) % cycleDays.length;
    const day = cycleDays[index]!;
    if (day.kind === 'OFF') {
      out.push({
        date: toIsoDateUtc(d),
        kind: 'OFF',
        availableFrom: null,
        availableTo: null,
        label: 'Выходной',
      });
      continue;
    }
    const fromT = day.availableFrom || '00:00';
    const toT = day.availableTo || '23:59';
    const fullDay = fromT === '00:00' && toT === '23:59';
    out.push({
      date: toIsoDateUtc(d),
      kind: 'ON',
      availableFrom: fromT,
      availableTo: toT,
      label: fullDay ? 'Доступен' : `с ${fromT}${toT !== '23:59' ? ` до ${toT}` : ''}`,
    });
  }
  return out;
}
