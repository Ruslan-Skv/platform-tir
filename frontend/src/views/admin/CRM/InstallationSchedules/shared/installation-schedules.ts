import type { InstallerDirection } from '@/shared/api/admin-crm';
import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
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

export type InstallationScheduleFormValues = {
  date: string;
  timeFrom: string;
  timeTo: string;
  timeText: string;
  direction: InstallationScheduleDirection;
  installerId: string;
  installerName: string;
  manualInstaller: boolean;
  packageId: string;
  packageSearch: string;
  contractId: string;
  contractNumber: string;
  workOrderKey: string;
  workOrderLabel: string;
  customerName: string;
  customerAddress: string;
  customerPhones: string[];
  orderInfo: string;
  note: string;
};

export const STATUS_LABELS = {
  PLANNED: 'В плане',
  DONE: 'Выполнено',
  FAILED: 'Не выполнено',
} as const;

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
    timeFrom: '',
    timeTo: '',
    timeText: '',
    direction: 'DOORS',
    installerId: '',
    installerName: '',
    manualInstaller: false,
    packageId: '',
    packageSearch: '',
    contractId: '',
    contractNumber: '',
    workOrderKey: '',
    workOrderLabel: '',
    customerName: '',
    customerAddress: '',
    customerPhones: [''],
    orderInfo: '',
    note: '',
  };
}

export function formFromSchedule(item: InstallationSchedule): InstallationScheduleFormValues {
  const direction =
    item.direction === 'REPAIR' ? 'DOORS' : (item.direction as InstallationScheduleDirection);
  return {
    date: item.date.slice(0, 10),
    timeFrom: item.timeFrom ?? '',
    timeTo: item.timeTo ?? '',
    timeText: item.timeText ?? '',
    direction,
    installerId: item.installerId ?? '',
    installerName: item.installerName ?? '',
    manualInstaller: !item.installerId && Boolean(item.installerName),
    packageId: item.packageId ?? '',
    packageSearch: item.contractNumber ?? '',
    contractId: item.contractId ?? '',
    contractNumber: item.contractNumber ?? '',
    workOrderKey: item.workOrderKey ?? '',
    workOrderLabel: item.workOrderLabel ?? '',
    customerName: item.customerName ?? '',
    customerAddress: item.customerAddress ?? '',
    customerPhones: item.customerPhones?.length ? item.customerPhones : [item.customerPhone ?? ''],
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
