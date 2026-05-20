import { resolveCustomerEntityTypeFromRow } from './customer-history.util';

const PERSON_NAME_PARTS_COUNT = 3;

function hasTrimmedText(value: string | null | undefined): boolean {
  return (value ?? '').trim().length > 0;
}

function str(ext: Record<string, unknown>, key: string): string {
  const v = ext[key];
  return typeof v === 'string' ? v.trim() : '';
}

function hasAnyTrimmedPhone(phones: readonly string[], phone: string | null | undefined): boolean {
  const list = phones.length > 0 ? phones : phone ? [phone] : [];
  return list.some((p) => p.trim().length > 0);
}

function countWhitespaceSeparatedWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function fioSlotWeight(value: string): number {
  const n = countWhitespaceSeparatedWords(value);
  if (n === 0) return 0;
  return Math.min(n, PERSON_NAME_PARTS_COUNT) / PERSON_NAME_PARTS_COUNT;
}

function parseFullNameString(full: string): {
  lastName: string;
  firstName: string;
  patronymic: string;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { lastName: '', firstName: '', patronymic: '' };
  if (parts.length === 1) return { lastName: '', firstName: parts[0], patronymic: '' };
  if (parts.length === 2) return { lastName: parts[0], firstName: parts[1], patronymic: '' };
  return {
    lastName: parts[0],
    firstName: parts[1],
    patronymic: parts.slice(2).join(' '),
  };
}

function resolvePersonNameParts(customer: {
  firstName: string;
  lastName: string | null;
  extendedProfile: unknown;
}): { lastName: string; firstName: string; patronymic: string } {
  const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
  const extLn = str(ext, 'lastName');
  const extFn = str(ext, 'firstName');
  const extPat = str(ext, 'patronymic');
  if (extLn || extFn || extPat) {
    return { lastName: extLn, firstName: extFn, patronymic: extPat };
  }
  const extFull = str(ext, 'fullName');
  if (extFull) return parseFullNameString(extFull);
  const rowLn = (customer.lastName ?? '').trim();
  const rowFn = (customer.firstName ?? '').trim();
  if (rowFn && /\s/.test(rowFn) && !rowLn) return parseFullNameString(rowFn);
  if (rowLn || rowFn) return { lastName: rowLn, firstName: rowFn, patronymic: '' };
  return { lastName: '', firstName: '', patronymic: '' };
}

function personNameSlotWeight(customer: {
  firstName: string;
  lastName: string | null;
  extendedProfile: unknown;
}): number {
  const parts = resolvePersonNameParts(customer);
  let n = 0;
  if (parts.lastName) n += 1;
  if (parts.firstName) n += 1;
  if (parts.patronymic) n += 1;
  return n / PERSON_NAME_PARTS_COUNT;
}

function hasAnyObjectAddress(ext: Record<string, unknown>): boolean {
  const raw = ext.objectAddresses;
  if (!Array.isArray(raw)) return false;
  return raw.some((item) => typeof item === 'string' && item.trim().length > 0);
}

/** Доля заполненных полей карточки; логика совпадает с CRM-формой на фронте. */
export function computeCrmCustomerProfileFillPercent(customer: {
  email: string | null;
  phone: string | null;
  phones: string[];
  firstName: string;
  lastName: string | null;
  company: string | null;
  entityType: string | null;
  extendedProfile: unknown;
}): number {
  const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
  const entityType = resolveCustomerEntityTypeFromRow(customer);
  const objectAddressPart = hasAnyObjectAddress(ext) ? 1 : 0;

  if (entityType === 'PERSON') {
    const parts =
      (hasTrimmedText(customer.email) ? 1 : 0) +
      personNameSlotWeight(customer) +
      (hasAnyTrimmedPhone(customer.phones, customer.phone) ? 1 : 0) +
      (hasTrimmedText(str(ext, 'address')) ? 1 : 0) +
      objectAddressPart;
    return Math.round((parts / 5) * 100);
  }

  const repNom =
    str(ext, 'representativeFullNameNominative') ||
    [customer.firstName, customer.lastName]
      .map((x) => (x ?? '').trim())
      .filter(Boolean)
      .join(' ');

  const parts =
    (hasTrimmedText(customer.email) ? 1 : 0) +
    fioSlotWeight(repNom) +
    (hasTrimmedText(str(ext, 'representativeFullNameGenitive')) ? 1 : 0) +
    (hasTrimmedText(str(ext, 'organizationName') || customer.company) ? 1 : 0) +
    (hasTrimmedText(str(ext, 'representativePositionNominative')) ? 1 : 0) +
    (hasTrimmedText(str(ext, 'representativePositionGenitive')) ? 1 : 0) +
    (hasTrimmedText(str(ext, 'inn')) ? 1 : 0) +
    (hasTrimmedText(str(ext, 'ogrn')) ? 1 : 0) +
    (hasTrimmedText(str(ext, 'address')) ? 1 : 0) +
    (hasTrimmedText(str(ext, 'bankDetails')) ? 1 : 0) +
    (hasAnyTrimmedPhone(customer.phones, customer.phone) ? 1 : 0) +
    objectAddressPart;
  return Math.round((parts / 12) * 100);
}
