import type { InstallerDirection } from '@/shared/api/admin-crm';
import type {
  InstallationContactPerson,
  InstallationSchedule,
} from '@/shared/api/crm/admin-installation-schedules';
import {
  DIRECTION_OPTIONS as ALL_DIRECTION_OPTIONS,
  DIRECTION_LABELS,
} from '@/views/admin/CRM/Installers/installers-page.constants';

export type ViewMode = 'table' | 'calendar';

/** Направления разовых монтажей (без «Ремонт» — он ведётся в план-графике). */
export type InstallationScheduleDirection = Exclude<InstallerDirection, 'REPAIR'>;

export const INSTALLATION_SCHEDULE_DIRECTION_OPTIONS = ALL_DIRECTION_OPTIONS.filter(
  (opt): opt is { value: InstallationScheduleDirection; label: string } => opt.value !== 'REPAIR'
);

export { DIRECTION_LABELS };

export type InstallationContactPersonForm = {
  name: string;
  phones: string[];
};

export type InstallationScheduleFormValues = {
  date: string;
  dateEnd: string;
  timeFrom: string;
  timeTo: string;
  timeText: string;
  direction: InstallationScheduleDirection;
  installerIds: string[];
  manualInstaller: boolean;
  manualInstallerNames: string[];
  packageId: string;
  packageSearch: string;
  contractId: string;
  contractNumber: string;
  workOrderKey: string;
  workOrderLabel: string;
  customerName: string;
  customerAddress: string;
  customerPhones: string[];
  contactPersons: InstallationContactPersonForm[];
  orderInfo: string;
  note: string;
};

export const STATUS_LABELS = {
  PLANNED: 'В плане',
  DONE: 'Выполнено',
  FAILED: 'Не выполнено',
} as const;

export function emptyContactPerson(): InstallationContactPersonForm {
  return { name: '', phones: [''] };
}

export function todayIsoDate() {
  return new Date().toLocaleDateString('en-CA');
}

export function weekAheadIsoDate(from = todayIsoDate()) {
  const date = new Date(`${from}T00:00:00`);
  date.setDate(date.getDate() + 6);
  return date.toLocaleDateString('en-CA');
}

export function emptyForm(date = todayIsoDate()): InstallationScheduleFormValues {
  return {
    date,
    dateEnd: '',
    timeFrom: '',
    timeTo: '',
    timeText: '',
    direction: 'DOORS',
    installerIds: [],
    manualInstaller: false,
    manualInstallerNames: [''],
    packageId: '',
    packageSearch: '',
    contractId: '',
    contractNumber: '',
    workOrderKey: '',
    workOrderLabel: '',
    customerName: '',
    customerAddress: '',
    customerPhones: [''],
    contactPersons: [],
    orderInfo: '',
    note: '',
  };
}

export function normalizeContactPersonsForForm(
  raw?: InstallationContactPerson[] | null
): InstallationContactPersonForm[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw.map((person) => ({
    name: person?.name ?? '',
    phones: person?.phones?.length ? [...person.phones] : [''],
  }));
}

export function serializeContactPersons(
  persons: InstallationContactPersonForm[]
): InstallationContactPerson[] {
  return persons
    .map((person) => ({
      name: person.name.trim(),
      phones: person.phones.map((phone) => phone.trim()).filter(Boolean),
    }))
    .filter((person) => person.name || person.phones.length > 0)
    .map((person) => ({
      name: person.name || 'Контактное лицо',
      phones: person.phones,
    }));
}

export function formFromSchedule(item: InstallationSchedule): InstallationScheduleFormValues {
  const direction =
    item.direction === 'REPAIR' ? 'DOORS' : (item.direction as InstallationScheduleDirection);
  const start = item.date.slice(0, 10);
  const end = item.dateEnd?.slice(0, 10) || '';
  const installerIds =
    item.installerIds && item.installerIds.length > 0
      ? [...item.installerIds]
      : item.installerId
        ? [item.installerId]
        : [];
  const manual = installerIds.length === 0 && Boolean(item.installerName?.trim());
  return {
    date: start,
    dateEnd: end && end !== start ? end : '',
    timeFrom: item.timeFrom ?? '',
    timeTo: item.timeTo ?? '',
    timeText: item.timeText ?? '',
    direction,
    installerIds,
    manualInstaller: manual,
    manualInstallerNames: manual
      ? item
          .installerName!.split(',')
          .map((part) => part.trim())
          .filter(Boolean)
      : [''],
    packageId: item.packageId ?? '',
    packageSearch: [
      item.customerName?.trim(),
      item.contractNumber?.trim() ? `№${item.contractNumber.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    contractId: item.contractId ?? '',
    contractNumber: item.contractNumber ?? '',
    workOrderKey: item.workOrderKey ?? '',
    workOrderLabel: item.workOrderLabel ?? '',
    customerName: item.customerName ?? '',
    customerAddress: item.customerAddress ?? '',
    customerPhones: item.customerPhones?.length ? item.customerPhones : [item.customerPhone ?? ''],
    contactPersons: normalizeContactPersonsForForm(item.contactPersons),
    orderInfo: item.orderInfo ?? '',
    note: item.note ?? '',
  };
}

export function formatTime(item: Pick<InstallationSchedule, 'timeFrom' | 'timeTo' | 'timeText'>) {
  if (item.timeText?.trim()) return item.timeText.trim();
  if (item.timeFrom && item.timeTo) return `${item.timeFrom}–${item.timeTo}`;
  if (item.timeFrom) return `с ${item.timeFrom}`;
  if (item.timeTo) return `до ${item.timeTo}`;
  return '—';
}

export function formatDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${match[3]}.${match[2]}.${match[1].slice(2)}` : date;
}

export function scheduleDateEnd(item: Pick<InstallationSchedule, 'date' | 'dateEnd'>): string {
  const start = item.date.slice(0, 10);
  const end = item.dateEnd?.slice(0, 10);
  return end && end > start ? end : start;
}

export function formatDateRange(item: Pick<InstallationSchedule, 'date' | 'dateEnd'>) {
  const start = item.date.slice(0, 10);
  const end = scheduleDateEnd(item);
  if (end === start) return formatDate(start);
  return `${formatDate(start)}–${formatDate(end)}`;
}

/** Все YYYY-MM-DD от date до dateEnd включительно. */
export function eachScheduleDay(item: Pick<InstallationSchedule, 'date' | 'dateEnd'>): string[] {
  const start = item.date.slice(0, 10);
  const end = scheduleDateEnd(item);
  if (end <= start) return [start];
  const days: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export function formatMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function monthBounds(year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { from: `${prefix}-01`, to: `${prefix}-${String(days).padStart(2, '0')}` };
}
