import type { CrmCustomerEntityType } from '@/shared/api/admin-crm';

import type { CrmCustomerFormState, CrmPersonNameInitialSnapshot } from './crmCustomerForm';
import {
  CRM_PHONE_FORMAT_HINT,
  digitsOnlyPhone,
  formatCrmPhoneDisplay,
  isValidCrmPhone,
} from './crmCustomerPhone';

export type CrmCustomerFormFieldErrors = Partial<Record<string, string>>;

export type ValidateCrmCustomerFormOptions = {
  mode: 'create' | 'edit';
  lockedPhones?: readonly string[];
  initialPersonName?: CrmPersonNameInitialSnapshot;
};

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function digitsOnly(value: string): string {
  return digitsOnlyPhone(value);
}

export { isValidCrmPhone } from './crmCustomerPhone';

export function isValidCrmEmail(email: string): boolean {
  const t = email.trim();
  if (!t) return true;
  return EMAIL_RE.test(t);
}

/** Дата: дд.мм.гггг, дд/мм/гггг или гггг-мм-дд */
export function isValidCrmPassportIssueDate(value: string): boolean {
  const t = value.trim();
  if (!t) return true;

  let day: number;
  let month: number;
  let year: number;

  const dot = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;

  const mDot = dot.exec(t);
  if (mDot) {
    day = Number(mDot[1]);
    month = Number(mDot[2]);
    year = Number(mDot[3]);
  } else {
    const mIso = iso.exec(t);
    if (!mIso) return false;
    year = Number(mIso[1]);
    month = Number(mIso[2]);
    day = Number(mIso[3]);
  }

  if (year < 1900 || year > 2100) return false;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return false;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return d.getTime() <= today.getTime();
}

function isValidInn(value: string, entityType: CrmCustomerEntityType): boolean {
  const d = digitsOnly(value);
  if (entityType === 'COMPANY') return d.length === 10;
  if (entityType === 'ENTREPRENEUR' || entityType === 'PERSON') return d.length === 12;
  return false;
}

function isValidOgrn(value: string, entityType: CrmCustomerEntityType): boolean {
  const d = digitsOnly(value);
  if (entityType === 'COMPANY') return d.length === 13;
  if (entityType === 'ENTREPRENEUR') return d.length === 15;
  return false;
}

function isValidPassportSeriesNumber(value: string): boolean {
  const d = digitsOnly(value);
  return d.length === 10;
}

function hasMinText(value: string, min: number): boolean {
  return value.trim().length >= min;
}

function collectPhones(form: CrmCustomerFormState, lockedPhones: readonly string[]): string[] {
  const out: string[] = [];
  for (const p of lockedPhones) {
    const t = p.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  for (const p of form.phones) {
    const t = p.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

export function validateCrmCustomerForm(
  form: CrmCustomerFormState,
  options: ValidateCrmCustomerFormOptions
): CrmCustomerFormFieldErrors {
  const errors: CrmCustomerFormFieldErrors = {};
  const lockedPhones = options.lockedPhones ?? [];
  const isCreate = options.mode === 'create';
  const isPerson = form.entityType === 'PERSON';

  if (isCreate && isPerson) {
    const lastName = form.lastName.trim();
    const firstName = form.firstName.trim();
    const validLastName = hasMinText(lastName, 2);
    const validFirstName = hasMinText(firstName, 2);

    if (!validLastName && !validFirstName) {
      const msg = 'Укажите имя или фамилию';
      errors.lastName = msg;
      errors.firstName = msg;
    } else {
      if (lastName && !validLastName) {
        errors.lastName = 'Фамилия должна содержать минимум 2 символа';
      }
      if (firstName && !validFirstName) {
        errors.firstName = 'Имя должно содержать минимум 2 символа';
      }
    }

    if (form.patronymic.trim() && !hasMinText(form.patronymic, 2)) {
      errors.patronymic = 'Отчество должно содержать минимум 2 символа';
    }
  }

  if (isCreate && !isPerson) {
    if (!form.organizationName.trim()) {
      errors.organizationName = 'Укажите наименование организации';
    } else if (!hasMinText(form.organizationName, 2)) {
      errors.organizationName = 'Наименование слишком короткое';
    }
    if (!form.repNom.trim()) {
      errors.repNom = 'Укажите ФИО представителя (именит.)';
    } else if (!hasMinText(form.repNom, 2)) {
      errors.repNom = 'ФИО представителя должно содержать минимум 2 символа';
    }
  }

  if (!isCreate && !isPerson && form.repNom.trim() && !hasMinText(form.repNom, 2)) {
    errors.repNom = 'ФИО представителя должно содержать минимум 2 символа';
  }

  if (!isCreate && isPerson && options.initialPersonName) {
    const initial = options.initialPersonName;
    if (!initial.lastName.trim() && form.lastName.trim() && !hasMinText(form.lastName, 2)) {
      errors.lastName = 'Фамилия должна содержать минимум 2 символа';
    }
    if (!initial.firstName.trim() && form.firstName.trim() && !hasMinText(form.firstName, 2)) {
      errors.firstName = 'Имя должно содержать минимум 2 символа';
    }
    if (!initial.patronymic.trim() && form.patronymic.trim() && !hasMinText(form.patronymic, 2)) {
      errors.patronymic = 'Отчество должно содержать минимум 2 символа';
    }
  }

  if (form.repGen.trim() && !hasMinText(form.repGen, 2)) {
    errors.repGen = 'ФИО (родит.) должно содержать минимум 2 символа';
  }

  const emailTrimmed = form.email.trim();
  if (emailTrimmed && !isValidCrmEmail(emailTrimmed)) {
    errors.email = 'Некорректный адрес e-mail';
  }

  const allPhones = collectPhones(form, lockedPhones);
  if (allPhones.length === 0) {
    errors.phones = 'Укажите хотя бы один телефон';
  }

  const seenDigits = new Set<string>();
  for (const locked of lockedPhones) {
    const d = digitsOnly(locked);
    if (d) seenDigits.add(d);
  }

  form.phones.forEach((raw, index) => {
    const t = raw.trim();
    if (!t) return;
    const formatted = formatCrmPhoneDisplay(t);
    if (!isValidCrmPhone(formatted)) {
      errors[`phones.${index}`] = CRM_PHONE_FORMAT_HINT;
      return;
    }
    const d = digitsOnly(formatted);
    if (seenDigits.has(d)) {
      errors[`phones.${index}`] = 'Этот номер уже указан';
    } else {
      seenDigits.add(d);
    }
  });

  if (form.address.trim() && !hasMinText(form.address, 3)) {
    errors.address = 'Адрес слишком короткий';
  }

  form.objectAddresses.forEach((addr, index) => {
    const t = addr.trim();
    if (t && !hasMinText(t, 3)) {
      errors[`objectAddresses.${index}`] = 'Адрес объекта слишком короткий';
    }
  });

  if (!isPerson) {
    const innTrimmed = form.inn.trim();
    if (innTrimmed) {
      if (!/^\d+$/.test(digitsOnly(innTrimmed)) || !isValidInn(innTrimmed, form.entityType)) {
        errors.inn = form.entityType === 'COMPANY' ? 'ИНН юрлица — 10 цифр' : 'ИНН — 12 цифр';
      }
    }

    const ogrnTrimmed = form.ogrn.trim();
    if (ogrnTrimmed) {
      if (!/^\d+$/.test(digitsOnly(ogrnTrimmed)) || !isValidOgrn(ogrnTrimmed, form.entityType)) {
        errors.ogrn = form.entityType === 'COMPANY' ? 'ОГРН — 13 цифр' : 'ОГРНИП — 15 цифр';
      }
    }
  }

  if (isPerson) {
    const passNum = form.passportSeriesNumber.trim();
    if (passNum && !isValidPassportSeriesNumber(passNum)) {
      errors.passportSeriesNumber = 'Серия и номер — 10 цифр (например, 1234 567890)';
    }

    const passBy = form.passportIssuedBy.trim();
    if (passBy && !hasMinText(passBy, 3)) {
      errors.passportIssuedBy = 'Укажите, кем выдан паспорт';
    }

    const passDate = form.passportIssueDate.trim();
    if (passDate && !isValidCrmPassportIssueDate(passDate)) {
      errors.passportIssueDate =
        'Некорректная дата. Формат: дд.мм.гггг (дата не может быть в будущем)';
    }
  }

  return errors;
}

export function hasCrmCustomerFormErrors(errors: CrmCustomerFormFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Минимум для кнопки «Создать»: как обязательные поля при mode=create. */
export function isCrmCustomerCreateMinimumFilled(form: CrmCustomerFormState): boolean {
  const isPerson = form.entityType === 'PERSON';

  if (isPerson) {
    const lastName = form.lastName.trim();
    const firstName = form.firstName.trim();
    const validLastName = hasMinText(lastName, 2);
    const validFirstName = hasMinText(firstName, 2);
    if (!validLastName && !validFirstName) return false;
    if (lastName && !validLastName) return false;
    if (firstName && !validFirstName) return false;
  } else {
    if (!hasMinText(form.organizationName, 2)) return false;
    if (!hasMinText(form.repNom, 2)) return false;
  }

  return form.phones.some((raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    return isValidCrmPhone(formatCrmPhoneDisplay(trimmed));
  });
}

export function getFirstCrmCustomerFormError(errors: CrmCustomerFormFieldErrors): string | null {
  const first = Object.values(errors).find(Boolean);
  return first ?? null;
}

/** Сбрасывает ошибку поля и связанные (например, phones.0 → phones). */
export function clearCrmCustomerFieldError(
  errors: CrmCustomerFormFieldErrors,
  key: string
): CrmCustomerFormFieldErrors {
  const next = { ...errors };
  delete next[key];
  if (key.startsWith('phones.')) delete next.phones;
  if (key === 'phones') {
    for (const k of Object.keys(next)) {
      if (k.startsWith('phones.')) delete next[k];
    }
  }
  if (key.startsWith('objectAddresses.')) {
    /* keep other object address errors */
  }
  return next;
}
