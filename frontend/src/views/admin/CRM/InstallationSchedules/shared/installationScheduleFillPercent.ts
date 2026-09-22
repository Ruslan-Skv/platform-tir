import { getCrmCustomerFillBannerToneClass } from '@/views/admin/CRM/Customers/shared/crmCustomerFillPercent';

import type { InstallationScheduleFormValues } from './installation-schedules';

export { getCrmCustomerFillBannerToneClass as getInstallationScheduleFillBannerToneClass };

function hasTrimmedText(value: string): boolean {
  return value.trim().length > 0;
}

function hasAnyTrimmed(values: readonly string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

function hasInstaller(values: InstallationScheduleFormValues): boolean {
  if (values.manualInstaller) {
    return hasAnyTrimmed(values.manualInstallerNames);
  }
  return values.installerIds.length > 0;
}

/** Обязательные поля монтажа заполнены (кроме «Дата по», «Время по», контактных лиц и примечания). */
export function isInstallationScheduleFormFilled(values: InstallationScheduleFormValues): boolean {
  return Boolean(
    hasTrimmedText(values.date) &&
    hasTrimmedText(values.timeFrom) &&
    hasInstaller(values) &&
    hasTrimmedText(values.contractNumber) &&
    hasTrimmedText(values.customerName) &&
    hasTrimmedText(values.customerAddress) &&
    hasAnyTrimmed(values.customerPhones) &&
    hasTrimmedText(values.orderInfo)
  );
}

/**
 * Доля заполненных обязательных полей монтажа (100% — форма готова к сохранению).
 * Необязательные «Дата по», «Время по», текст времени, контактные лица и примечание
 * не учитываются; направление всегда задано.
 */
export function computeInstallationScheduleFormFillPercent(
  values: InstallationScheduleFormValues
): number {
  const parts =
    (hasTrimmedText(values.date) ? 1 : 0) +
    (hasTrimmedText(values.timeFrom) ? 1 : 0) +
    (hasInstaller(values) ? 1 : 0) +
    (hasTrimmedText(values.contractNumber) ? 1 : 0) +
    (hasTrimmedText(values.customerName) ? 1 : 0) +
    (hasTrimmedText(values.customerAddress) ? 1 : 0) +
    (hasAnyTrimmed(values.customerPhones) ? 1 : 0) +
    (hasTrimmedText(values.orderInfo) ? 1 : 0);
  return Math.round((parts / 8) * 100);
}

export function installationScheduleFillPercentHint(): string {
  return 'В расчёт входят все обязательные поля: дата, время с, монтажники, номер договора, заказчик, адрес, телефоны, информация по заказу. Необязательные «Дата по», «Время по», текст времени, контактные лица и примечание не учитываются — при 100% форма готова к сохранению.';
}
