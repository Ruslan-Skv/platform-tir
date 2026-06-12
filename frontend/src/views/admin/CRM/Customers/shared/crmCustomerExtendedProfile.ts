import type { CrmCustomerDetail } from '@/shared/api/admin-crm';

/** Ключи блока реквизитов в `Customer.extendedProfile` (как в пакете «Ремонт»). */
export const CRM_PROFILE_ADDRESS_KEY = 'address';
export const CRM_PROFILE_OBJECT_ADDRESSES_KEY = 'objectAddresses';

export function parseObjectAddresses(ext: Record<string, unknown> | null | undefined): string[] {
  const raw = ext?.[CRM_PROFILE_OBJECT_ADDRESSES_KEY];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
}

export function normalizeObjectAddresses(values: readonly string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

/** Ставит выбранный адрес объекта первым в extendedProfile (для подстановки в формы). */
export function crmDetailWithPreferredObjectAddress(
  detail: CrmCustomerDetail,
  objectAddress: string | null | undefined
): CrmCustomerDetail {
  const preferred = objectAddress?.trim();
  if (!preferred) return detail;

  const ext =
    detail.extendedProfile &&
    typeof detail.extendedProfile === 'object' &&
    !Array.isArray(detail.extendedProfile)
      ? { ...(detail.extendedProfile as Record<string, unknown>) }
      : {};

  const addresses = parseObjectAddresses(ext);
  if (addresses.length === 1 && addresses[0] === preferred) return detail;

  const reordered = normalizeObjectAddresses([
    preferred,
    ...addresses.filter((a) => a !== preferred),
  ]);

  return {
    ...detail,
    extendedProfile: {
      ...ext,
      [CRM_PROFILE_OBJECT_ADDRESSES_KEY]: reordered,
    },
  };
}
