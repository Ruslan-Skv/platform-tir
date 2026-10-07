/**
 * Порт фронтендового маппинга карточки CRM → блок «Заказчик» пакета документов
 * (`formFromCrmCustomerDetail` + `packageCustomerBlockFromCrmDetail` + `normalizePackageCustomerBlock`).
 * Источник истины — фронтенд; при изменении там синхронизировать и этот файл.
 */

import { resolveCustomerEntityType } from '../../customers/customer-display.util';

export type PackageCustomerBlockJson = {
  type: 'PERSON' | 'COMPANY' | 'ENTREPRENEUR';
  fullName: string;
  representativeFullNameNominative: string;
  representativeFullNameGenitive: string;
  organizationName: string;
  representativePositionNominative: string;
  representativePositionGenitive: string;
  inn: string;
  ogrn: string;
  address: string;
  phone: string;
  phones: string[];
  email: string;
  bankDetails: string;
  passportSeriesNumber: string;
  passportIssuedBy: string;
  passportIssueDate: string;
};

export type CustomerRowForPackageSync = {
  id: string;
  email: string | null;
  phone: string | null;
  phones: string[];
  firstName: string;
  lastName: string | null;
  company: string | null;
  entityType: string | null;
  extendedProfile: unknown;
};

type PersonNameParts = { lastName: string; firstName: string; patronymic: string };

function parseFullNameString(full: string): PersonNameParts {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { lastName: '', firstName: '', patronymic: '' };
  if (parts.length === 1) return { lastName: '', firstName: parts[0], patronymic: '' };
  if (parts.length === 2) return { lastName: parts[0], firstName: parts[1], patronymic: '' };
  return { lastName: parts[0], firstName: parts[1], patronymic: parts.slice(2).join(' ') };
}

/** Части ФИО: сначала extendedProfile, затем fullName/строка имени, затем колонки карточки. */
function resolvePersonNameParts(customer: CustomerRowForPackageSync): PersonNameParts {
  const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const extLn = str(ext.lastName).trim();
  const extFn = str(ext.firstName).trim();
  const extPat = str(ext.patronymic).trim();
  if (extLn || extFn || extPat) return { lastName: extLn, firstName: extFn, patronymic: extPat };

  const extFull = str(ext.fullName).trim();
  if (extFull) return parseFullNameString(extFull);

  const rowFn = (customer.firstName ?? '').trim();
  const rowLn = (customer.lastName ?? '').trim();
  if (rowFn && /\s/.test(rowFn) && !rowLn) return parseFullNameString(rowFn);
  return { lastName: rowLn, firstName: rowFn, patronymic: '' };
}

/** Телефоны карточки: phones, иначе phone; обрезка и дедуп полных строк. */
function collectCustomerPhones(customer: CustomerRowForPackageSync): string[] {
  const list = (customer.phones?.length ? customer.phones : customer.phone ? [customer.phone] : [])
    .map((p) => p.trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const p of list) {
    if (!unique.includes(p)) unique.push(p);
  }
  return unique;
}

/** Блок «Заказчик» пакета из карточки CRM — как при прикреплении карточки в пакете. */
export function buildPackageCustomerBlockFromCustomerRow(
  customer: CustomerRowForPackageSync,
): PackageCustomerBlockJson {
  const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
  const str = (key: string) => {
    const v = ext[key];
    return typeof v === 'string' ? v.trim() : '';
  };

  const type = resolveCustomerEntityType(customer);
  const name = resolvePersonNameParts(customer);
  const personFullName = [name.lastName, name.firstName, name.patronymic]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
  const repNom =
    str('representativeFullNameNominative') ||
    [customer.firstName, customer.lastName]
      .map((x) => (x ?? '').trim())
      .filter(Boolean)
      .join(' ');
  const phones = collectCustomerPhones(customer);

  return {
    type,
    fullName: type === 'PERSON' ? personFullName : repNom,
    representativeFullNameNominative: repNom,
    representativeFullNameGenitive: str('representativeFullNameGenitive'),
    organizationName: str('organizationName') || (customer.company ?? '').trim(),
    representativePositionNominative: str('representativePositionNominative'),
    representativePositionGenitive: str('representativePositionGenitive'),
    inn: str('inn'),
    ogrn: str('ogrn'),
    address: str('address'),
    phone: phones[0] ?? '',
    phones: phones.length > 0 ? phones : [''],
    email: (customer.email ?? '').trim(),
    bankDetails: str('bankDetails'),
    passportSeriesNumber: str('passportSeriesNumber'),
    passportIssuedBy: str('passportIssuedBy'),
    passportIssueDate: str('passportIssueDate'),
  };
}

/** Первый адрес объекта из карточки (его подставляет прикрепление карточки в пакете). */
export function customerObjectAddressFromRow(customer: { extendedProfile: unknown }): string {
  const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
  const raw = ext.objectAddresses;
  if (!Array.isArray(raw)) return '';
  for (const item of raw) {
    const t = typeof item === 'string' ? item.trim() : '';
    if (t) return t;
  }
  return '';
}
