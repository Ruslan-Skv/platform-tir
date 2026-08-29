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

function hasTime(values: InstallationScheduleFormValues): boolean {
  return (
    hasTrimmedText(values.timeFrom) ||
    hasTrimmedText(values.timeTo) ||
    hasTrimmedText(values.timeText)
  );
}

function hasContactPerson(values: InstallationScheduleFormValues): boolean {
  return values.contactPersons.some(
    (person) => hasTrimmedText(person.name) || hasAnyTrimmed(person.phones)
  );
}

/**
 * Доля заполненных полей монтажа.
 * Не учитываются: направление (всегда задано), заметка, доп. сведения, «дата по».
 */
export function computeInstallationScheduleFormFillPercent(
  values: InstallationScheduleFormValues
): number {
  const parts =
    (hasTrimmedText(values.packageId) || hasTrimmedText(values.contractNumber) ? 1 : 0) +
    (hasTrimmedText(values.date) ? 1 : 0) +
    (hasTime(values) ? 1 : 0) +
    (hasInstaller(values) ? 1 : 0) +
    (hasTrimmedText(values.customerName) ? 1 : 0) +
    (hasTrimmedText(values.customerAddress) ? 1 : 0) +
    (hasAnyTrimmed(values.customerPhones) ? 1 : 0) +
    (hasContactPerson(values) ? 1 : 0);
  return Math.round((parts / 8) * 100);
}

export function installationScheduleFillPercentHint(): string {
  return 'В расчёт входят: заказ (или № договора), дата, время, монтажник, заказчик, адрес, телефоны, контактное лицо. Направление, «дата по», сведения о заказе и заметка не учитываются.';
}
