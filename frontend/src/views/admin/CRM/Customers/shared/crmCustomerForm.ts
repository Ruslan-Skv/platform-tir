import type { CrmCustomerDetail, CrmCustomerEntityType } from '@/shared/api/admin-crm';

import { resolveCrmEntityType } from './crmCustomerDisplay';
import { normalizeObjectAddresses, parseObjectAddresses } from './crmCustomerExtendedProfile';
import {
  type CrmPersonNameParts,
  buildPersonExtendedProfileFields,
  mergePersonNameForEdit,
  resolvePersonNamePartsFromDetail,
} from './crmCustomerName';
import { digitsOnlyPhone, normalizeCrmPhonesList } from './crmCustomerPhone';

export type CrmCustomerFormState = {
  entityType: CrmCustomerEntityType;
  email: string;
  /** Только новые номера (режим редактирования); при создании — все номера */
  phones: string[];
  lastName: string;
  firstName: string;
  patronymic: string;
  repNom: string;
  repGen: string;
  organizationName: string;
  posNom: string;
  posGen: string;
  inn: string;
  ogrn: string;
  address: string;
  objectAddresses: string[];
  bankDetails: string;
  passportSeriesNumber: string;
  passportIssuedBy: string;
  passportIssueDate: string;
  notes: string;
};

export const emptyCrmCustomerForm = (): CrmCustomerFormState => ({
  entityType: 'PERSON',
  email: '',
  phones: [''],
  lastName: '',
  firstName: '',
  patronymic: '',
  repNom: '',
  repGen: '',
  organizationName: '',
  posNom: '',
  posGen: '',
  inn: '',
  ogrn: '',
  address: '',
  objectAddresses: [],
  bankDetails: '',
  passportSeriesNumber: '',
  passportIssuedBy: '',
  passportIssueDate: '',
  notes: '',
});

function str(ext: Record<string, unknown> | undefined, key: string): string {
  const v = ext?.[key];
  return typeof v === 'string' ? v : '';
}

export function personNameFromForm(form: CrmCustomerFormState): CrmPersonNameParts {
  return {
    lastName: form.lastName,
    firstName: form.firstName,
    patronymic: form.patronymic,
  };
}

export function collectCustomerPhones(data: CrmCustomerDetail): string[] {
  const list = (data.phones?.length ? data.phones : data.phone ? [data.phone] : [])
    .map((p) => p.trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const p of list) {
    if (!unique.includes(p)) unique.push(p);
  }
  return unique;
}

/** Форма редактирования: заблокированные телефоны отдельно, в `phones` — только поля для новых. */
export function formFromCrmCustomerDetail(data: CrmCustomerDetail): {
  form: CrmCustomerFormState;
  lockedPhones: string[];
} {
  const ext = (data.extendedProfile ?? {}) as Record<string, unknown>;
  const entityType = (resolveCrmEntityType(data.entityType, ext) ??
    'PERSON') as CrmCustomerEntityType;
  const lockedPhones = collectCustomerPhones(data);
  const objectAddresses = parseObjectAddresses(ext);
  const personName = resolvePersonNamePartsFromDetail(data);

  const repFromExt = str(ext, 'representativeFullNameNominative');
  const repFromRow = [data.firstName, data.lastName].filter((x) => (x ?? '').trim()).join(' ');

  return {
    lockedPhones,
    form: {
      entityType,
      email: data.email?.trim() ?? '',
      phones: [''],
      lastName: personName.lastName,
      firstName: personName.firstName,
      patronymic: personName.patronymic,
      repNom: repFromExt || repFromRow,
      repGen: str(ext, 'representativeFullNameGenitive'),
      organizationName: str(ext, 'organizationName') || data.company?.trim() || '',
      posNom: str(ext, 'representativePositionNominative'),
      posGen: str(ext, 'representativePositionGenitive'),
      inn: str(ext, 'inn'),
      ogrn: str(ext, 'ogrn'),
      address: str(ext, 'address'),
      objectAddresses: objectAddresses.length > 0 ? objectAddresses : [],
      bankDetails: str(ext, 'bankDetails'),
      passportSeriesNumber: str(ext, 'passportSeriesNumber'),
      passportIssuedBy: str(ext, 'passportIssuedBy'),
      passportIssueDate: str(ext, 'passportIssueDate'),
      notes: data.notes?.trim() ?? '',
    },
  };
}

export type CrmPersonNameInitialSnapshot = Pick<
  CrmCustomerFormState,
  'lastName' | 'firstName' | 'patronymic'
>;

/** Поля, доступные для изменения в режиме редактирования карточки. */
function crmCustomerFormEditSnapshot(
  form: CrmCustomerFormState,
  initialPersonName?: CrmPersonNameInitialSnapshot
): string {
  const snapshot: Record<string, unknown> = {
    email: form.email.trim(),
    phones: form.phones.map((p) => p.trim()).filter(Boolean),
    repNom: form.repNom.trim(),
    repGen: form.repGen.trim(),
    posNom: form.posNom.trim(),
    posGen: form.posGen.trim(),
    inn: form.inn.trim(),
    ogrn: form.ogrn.trim(),
    address: form.address.trim(),
    objectAddresses: normalizeObjectAddresses(form.objectAddresses),
    bankDetails: form.bankDetails.trim(),
    passportSeriesNumber: form.passportSeriesNumber.trim(),
    passportIssuedBy: form.passportIssuedBy.trim(),
    passportIssueDate: form.passportIssueDate.trim(),
    notes: form.notes.trim(),
  };

  if (initialPersonName) {
    if (!initialPersonName.lastName.trim()) snapshot.lastName = form.lastName.trim();
    if (!initialPersonName.firstName.trim()) snapshot.firstName = form.firstName.trim();
    if (!initialPersonName.patronymic.trim()) snapshot.patronymic = form.patronymic.trim();
  }

  return JSON.stringify(snapshot);
}

export function cloneCrmCustomerForm(form: CrmCustomerFormState): CrmCustomerFormState {
  return {
    ...form,
    phones: [...form.phones],
    objectAddresses: [...form.objectAddresses],
  };
}

export function isCrmCustomerEditFormDirty(
  current: CrmCustomerFormState,
  initial: CrmCustomerFormState,
  initialPersonName?: CrmPersonNameInitialSnapshot
): boolean {
  return (
    crmCustomerFormEditSnapshot(current, initialPersonName) !==
    crmCustomerFormEditSnapshot(initial, initialPersonName)
  );
}

function mergePhoneLists(locked: readonly string[], added: readonly string[]): string[] {
  const out: string[] = [];
  for (const p of locked) {
    const t = p.trim();
    if (t && !out.some((x) => digitsOnlyPhone(x) === digitsOnlyPhone(t))) out.push(t);
  }
  for (const p of normalizeCrmPhonesList(added)) {
    if (!out.some((x) => digitsOnlyPhone(x) === digitsOnlyPhone(p))) out.push(p);
  }
  return out;
}

export function buildCrmCustomerUpdatePayload(
  form: CrmCustomerFormState,
  lockedPhones: readonly string[],
  original: CrmCustomerDetail,
  initialPersonName: CrmPersonNameInitialSnapshot
): Record<string, unknown> {
  const ext0 = (original.extendedProfile ?? {}) as Record<string, unknown>;
  const entityType = (resolveCrmEntityType(original.entityType, ext0) ??
    'PERSON') as CrmCustomerEntityType;
  const mergedPhones = mergePhoneLists(lockedPhones, form.phones);
  const originalPersonName = resolvePersonNamePartsFromDetail(original);
  const mergedPersonName = mergePersonNameForEdit(
    personNameFromForm(form),
    originalPersonName,
    initialPersonName
  );

  const ext: Record<string, unknown> = {
    ...ext0,
    type: entityType,
    representativeFullNameGenitive: form.repGen.trim(),
    representativePositionNominative: form.posNom.trim(),
    representativePositionGenitive: form.posGen.trim(),
    inn: form.inn.trim(),
    ogrn: form.ogrn.trim(),
    address: form.address.trim(),
    objectAddresses: normalizeObjectAddresses(form.objectAddresses),
    phone: mergedPhones[0] ?? '',
    email: form.email.trim(),
    bankDetails: form.bankDetails.trim(),
    passportSeriesNumber: form.passportSeriesNumber.trim(),
    passportIssuedBy: form.passportIssuedBy.trim(),
    passportIssueDate: form.passportIssueDate.trim(),
  };

  if (entityType === 'PERSON') {
    Object.assign(ext, buildPersonExtendedProfileFields(mergedPersonName));
  } else {
    ext.organizationName = str(ext0, 'organizationName') || original.company?.trim() || '';
    ext.representativeFullNameNominative = form.repNom.trim();
  }

  const emailTrimmed = form.email.trim();
  const payload: Record<string, unknown> = {
    ...(emailTrimmed ? { email: emailTrimmed } : { email: null }),
    phones: mergedPhones,
    phone: mergedPhones[0] ?? null,
    extendedProfile: ext,
    notes: form.notes.trim() || null,
  };

  if (entityType === 'PERSON') {
    const ln = mergedPersonName.lastName.trim();
    const fn = mergedPersonName.firstName.trim();
    if (fn) {
      payload.firstName = fn;
      payload.lastName = ln || null;
    } else if (ln) {
      payload.firstName = ln;
      payload.lastName = null;
    } else {
      payload.firstName = original.firstName;
      payload.lastName = original.lastName ?? null;
    }
  } else {
    const repTrim = form.repNom.trim();
    const repParts = repTrim.split(/\s+/).filter(Boolean);
    if (repParts.length >= 2) {
      payload.lastName = repParts[repParts.length - 1];
      payload.firstName = repParts.slice(0, -1).join(' ');
    } else {
      payload.firstName = repTrim;
      payload.lastName = null;
    }
    payload.position = form.posNom.trim() || null;
  }

  return payload;
}
