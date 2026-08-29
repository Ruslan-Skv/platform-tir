import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import {
  formatDateRange,
  formatTime,
} from '@/views/admin/CRM/InstallationSchedules/shared/installation-schedules';

/** Актуальный монтаж для шапки заказ-наряда: ближайший «В плане», иначе последний. */
export function pickLinkedInstallationSchedule(
  rows: InstallationSchedule[]
): InstallationSchedule | null {
  if (!rows.length) return null;
  const planned = rows
    .filter((row) => row.status === 'PLANNED')
    .sort(
      (a, b) => a.date.localeCompare(b.date) || (a.timeFrom ?? '').localeCompare(b.timeFrom ?? '')
    );
  if (planned.length) return planned[0];
  return [...rows].sort(
    (a, b) => b.date.localeCompare(a.date) || (b.timeFrom ?? '').localeCompare(a.timeFrom ?? '')
  )[0];
}

export type WorkOrderInstallationMetaLines = {
  dateTime: string;
  installer: string | null;
  contacts: string[];
};

export function buildWorkOrderInstallationMetaLines(
  item: InstallationSchedule
): WorkOrderInstallationMetaLines {
  const time = formatTime(item);
  const dateTime =
    time && time !== '—' ? `${formatDateRange(item)}, ${time}` : formatDateRange(item);

  const contacts: string[] = [];
  const customerPhones = [
    ...(item.customerPhones ?? []),
    ...(item.customerPhone ? [item.customerPhone] : []),
  ]
    .map((phone) => phone.trim())
    .filter(Boolean);
  const uniqueCustomerPhones = [...new Set(customerPhones)];
  if (uniqueCustomerPhones.length) {
    contacts.push(`Телефоны заказчика (монтаж): ${uniqueCustomerPhones.join(', ')}`);
  }
  for (const person of item.contactPersons ?? []) {
    const name = person.name?.trim() || 'Контактное лицо';
    const phones = (person.phones ?? []).map((phone) => phone.trim()).filter(Boolean);
    contacts.push(
      phones.length ? `Контактное лицо ${name}: ${phones.join(', ')}` : `Контактное лицо: ${name}`
    );
  }

  return {
    dateTime,
    installer: item.installerName?.trim() || null,
    contacts,
  };
}
