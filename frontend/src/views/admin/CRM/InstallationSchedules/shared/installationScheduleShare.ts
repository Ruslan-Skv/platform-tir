import type { InstallationSchedule } from '@/shared/api/crm/admin-installation-schedules';
import { normalizeCrmPhoneDigits } from '@/views/admin/CRM/Customers/shared/crmCustomerPhone';

import { DIRECTION_LABELS, formatDateRange, formatTime } from './installation-schedules';

/** Текст сообщения монтажнику для мессенджеров / буфера. */
export function buildInstallationScheduleShareMessage(item: InstallationSchedule): string {
  const lines: string[] = ['Монтаж'];

  lines.push(`Дата: ${formatDateRange(item)}`);
  lines.push(`Время: ${formatTime(item)}`);
  lines.push(`Направление: ${DIRECTION_LABELS[item.direction] ?? item.direction}`);

  if (item.installerName?.trim()) {
    lines.push(`Монтажник: ${item.installerName.trim()}`);
  }
  if (item.contractNumber?.trim()) {
    lines.push(`Договор: № ${item.contractNumber.trim()}`);
  }
  if (item.workOrderLabel?.trim()) {
    lines.push(`Заказ-наряд: ${item.workOrderLabel.trim()}`);
  }
  if (item.customerAddress?.trim()) {
    lines.push(`Адрес: ${item.customerAddress.trim()}`);
  }
  if (item.customerName?.trim()) {
    lines.push(`Заказчик: ${item.customerName.trim()}`);
  }

  const customerPhones = [
    ...(item.customerPhones ?? []),
    ...(item.customerPhone ? [item.customerPhone] : []),
  ]
    .map((phone) => phone.trim())
    .filter(Boolean);
  const uniqueCustomerPhones = [...new Set(customerPhones)];
  if (uniqueCustomerPhones.length) {
    lines.push(`Телефон заказчика: ${uniqueCustomerPhones.join(', ')}`);
  }

  for (const person of item.contactPersons ?? []) {
    const name = person.name?.trim() || 'Контактное лицо';
    const phones = (person.phones ?? []).map((phone) => phone.trim()).filter(Boolean);
    lines.push(phones.length ? `Контакт: ${name} · ${phones.join(', ')}` : `Контакт: ${name}`);
  }

  if (item.orderInfo?.trim()) {
    lines.push(`Сведения: ${item.orderInfo.trim()}`);
  }
  if (item.note?.trim()) {
    lines.push(`Примечание: ${item.note.trim()}`);
  }

  return lines.join('\n');
}

export type MessengerShareChannel = 'whatsapp' | 'telegram' | 'max';

/** Ссылки для отправки текста через установленные приложения. */
export function buildMessengerShareUrl(
  channel: MessengerShareChannel,
  text: string,
  phone?: string
): string {
  const encoded = encodeURIComponent(text);
  const digits = phone?.trim() ? normalizeCrmPhoneDigits(phone) : null;

  if (channel === 'whatsapp') {
    if (digits) return `https://wa.me/${digits}?text=${encoded}`;
    return `https://wa.me/?text=${encoded}`;
  }
  if (channel === 'telegram') {
    return `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encoded}`;
  }
  return `https://max.ru/:share?text=${encoded}`;
}
