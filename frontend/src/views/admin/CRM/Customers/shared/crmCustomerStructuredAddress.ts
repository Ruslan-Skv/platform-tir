/** Структурированный адрес проживания: хранится в extendedProfile.addressStructured,
 *  а строка для договоров/расчётов собирается автоматически и пишется в extendedProfile.address. */

export type CrmStructuredAddress = {
  city: string;
  street: string;
  house: string;
  building: string;
  apartment: string;
};

export const emptyCrmStructuredAddress = (): CrmStructuredAddress => ({
  city: '',
  street: '',
  house: '',
  building: '',
  apartment: '',
});

export function cloneCrmStructuredAddress(a: CrmStructuredAddress): CrmStructuredAddress {
  return { ...a };
}

/** true, если заполнена хотя бы одна часть адреса. */
export function hasCrmStructuredAddressContent(a: CrmStructuredAddress): boolean {
  return Object.values(a).some((v) => v.trim());
}

/** Автосклейка в одну строку: «г. Москва, ул. Ленина, д. 10, корп. 2, кв. 15». */
export function composeCrmStructuredAddress(a: CrmStructuredAddress): string {
  const t = (v: string) => v.trim();
  const parts: string[] = [];
  if (t(a.city)) parts.push(`г. ${t(a.city)}`);
  if (t(a.street)) parts.push(t(a.street));
  if (t(a.house)) parts.push(`д. ${t(a.house)}`);
  if (t(a.building)) parts.push(`корп. ${t(a.building)}`);
  if (t(a.apartment)) parts.push(`кв. ${t(a.apartment)}`);
  return parts.join(', ');
}

export function parseCrmStructuredAddress(
  ext: Record<string, unknown> | undefined
): CrmStructuredAddress | null {
  const raw = ext?.addressStructured;
  if (raw == null || typeof raw !== 'object') return null;
  const rec = raw as Record<string, unknown>;
  const str = (key: string) => (typeof rec[key] === 'string' ? (rec[key] as string) : '');
  const parsed: CrmStructuredAddress = {
    city: str('city'),
    street: str('street'),
    house: str('house'),
    building: str('building'),
    apartment: str('apartment'),
  };
  return hasCrmStructuredAddressContent(parsed) ? parsed : null;
}
