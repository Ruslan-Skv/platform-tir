import type { CrmCustomerDetail } from '@/shared/api/admin-crm';
import { parseObjectAddresses } from '@/views/admin/CRM/Customers/crmCustomerExtendedProfile';
import { personDisplayNameFromCrmDetail } from '@/views/admin/CRM/Customers/crmCustomerName';
import { formatCrmPhoneDisplay } from '@/views/admin/CRM/Customers/crmCustomerPhone';

/** Первый адрес объекта из карточки (не адрес проживания). */
export function resolveMeasurementObjectAddress(
  ext: Record<string, unknown> | null | undefined
): string {
  const objects = parseObjectAddresses(ext ?? null);
  return objects[0] ?? '';
}

export function measurementFieldsFromCrmCustomerDetail(detail: CrmCustomerDetail): {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
} {
  const ext =
    detail.extendedProfile &&
    typeof detail.extendedProfile === 'object' &&
    !Array.isArray(detail.extendedProfile)
      ? (detail.extendedProfile as Record<string, unknown>)
      : null;

  const fullName = personDisplayNameFromCrmDetail({
    firstName: detail.firstName,
    lastName: detail.lastName,
    company: detail.company,
    email: detail.email,
    entityType: detail.entityType,
    extendedProfile: ext,
  });
  const rawPhone =
    (typeof detail.phone === 'string' && detail.phone.trim()) ||
    (Array.isArray(detail.phones) ? detail.phones.find((p) => p?.trim()) : undefined) ||
    '';

  const fallbackName =
    detail.company?.trim() ||
    (typeof ext?.organizationName === 'string' ? ext.organizationName.trim() : '') ||
    detail.email?.trim() ||
    '';

  return {
    customerId: detail.id,
    customerName: fullName || fallbackName,
    customerPhone: rawPhone ? formatCrmPhoneDisplay(rawPhone) || rawPhone : '',
    customerAddress: resolveMeasurementObjectAddress(ext),
  };
}
