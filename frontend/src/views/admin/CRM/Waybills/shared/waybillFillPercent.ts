import { getCrmCustomerFillBannerToneClass } from '@/views/admin/CRM/Customers/shared/crmCustomerFillPercent';

import type { WaybillFormValues } from './waybills-page.types';

export { getCrmCustomerFillBannerToneClass as getWaybillFillBannerToneClass };

function hasTrimmedText(value: string): boolean {
  return value.trim().length > 0;
}

function hasAnyTrimmed(values: readonly string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

/**
 * Доля заполненных обязательных полей задания (100% — форма готова к сохранению).
 * Необязательные «Время с/по» и «Файлы для водителя» не учитываются.
 */
export function computeWaybillFormFillPercent(values: WaybillFormValues): number {
  const parts =
    (hasTrimmedText(values.driverUserId) ? 1 : 0) +
    (hasTrimmedText(values.direction) ? 1 : 0) +
    (hasTrimmedText(values.date) ? 1 : 0) +
    (hasTrimmedText(values.taskText) ? 1 : 0) +
    (hasTrimmedText(values.customerName) ? 1 : 0) +
    (hasTrimmedText(values.customerAddress) ? 1 : 0) +
    (hasAnyTrimmed(values.customerPhones) ? 1 : 0) +
    (hasTrimmedText(values.deliveryCost) ? 1 : 0) +
    (hasTrimmedText(values.deliveryPayer) ? 1 : 0) +
    (hasTrimmedText(values.moversCost) ? 1 : 0) +
    (hasTrimmedText(values.moversPayer) ? 1 : 0) +
    (hasTrimmedText(values.responsibleUserId) ? 1 : 0);
  return Math.round((parts / 12) * 100);
}

export function waybillFillPercentHint(): string {
  return 'В расчёт входят все обязательные поля: водитель, направление, дата, задание, ФИО, адрес, телефоны, стоимость доставки и кто платит, стоимость грузчиков и кто платит, ответственный. Необязательные «Время с/по» и файлы не учитываются — при 100% форма готова к сохранению.';
}
