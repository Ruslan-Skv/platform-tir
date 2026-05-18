import type { CrmCustomerEntityType } from '@/shared/api/admin-crm';

import formStyles from './AddCrmCustomerModal.module.css';
import type { CrmCustomerFormState } from './crmCustomerForm';
import { personNameFromForm } from './crmCustomerForm';
import { personNamePartsFilledCount } from './crmCustomerName';

const PERSON_NAME_PARTS_COUNT = 3;

function hasTrimmedText(value: string): boolean {
  return value.trim().length > 0;
}

function hasAnyTrimmedPhone(phones: readonly string[]): boolean {
  return phones.some((p) => p.trim().length > 0);
}

function countWhitespaceSeparatedWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function fioSlotWeight(value: string): number {
  const n = countWhitespaceSeparatedWords(value);
  if (n === 0) return 0;
  return Math.min(n, PERSON_NAME_PARTS_COUNT) / PERSON_NAME_PARTS_COUNT;
}

function personNameSlotWeight(form: CrmCustomerFormState): number {
  return personNamePartsFilledCount(personNameFromForm(form)) / PERSON_NAME_PARTS_COUNT;
}

/** Доля заполненных полей; заметки и адреса объектов не учитываются. */
export function computeCrmCustomerFormFillPercent(form: CrmCustomerFormState): number {
  if (form.entityType === 'PERSON') {
    const parts =
      (hasTrimmedText(form.email) ? 1 : 0) +
      personNameSlotWeight(form) +
      (hasAnyTrimmedPhone(form.phones) ? 1 : 0) +
      (hasTrimmedText(form.address) ? 1 : 0);
    return Math.round((parts / 4) * 100);
  }

  const parts =
    (hasTrimmedText(form.email) ? 1 : 0) +
    fioSlotWeight(form.repNom) +
    (hasTrimmedText(form.repGen) ? 1 : 0) +
    (hasTrimmedText(form.organizationName) ? 1 : 0) +
    (hasTrimmedText(form.posNom) ? 1 : 0) +
    (hasTrimmedText(form.posGen) ? 1 : 0) +
    (hasTrimmedText(form.inn) ? 1 : 0) +
    (hasTrimmedText(form.ogrn) ? 1 : 0) +
    (hasTrimmedText(form.address) ? 1 : 0) +
    (hasTrimmedText(form.bankDetails) ? 1 : 0) +
    (hasAnyTrimmedPhone(form.phones) ? 1 : 0);
  return Math.round((parts / 11) * 100);
}

export function getCrmCustomerFillBannerToneClass(percent: number): string {
  if (percent >= 85) return formStyles.fillBannerSuccess;
  if (percent >= 55) return formStyles.fillBannerProgress;
  if (percent >= 30) return formStyles.fillBannerStarted;
  return formStyles.fillBannerLow;
}

export function crmCustomerFillPercentHint(entityType: CrmCustomerEntityType): string {
  if (entityType === 'PERSON') {
    return 'В расчёт входят: e-mail, фамилия, имя, отчество, телефоны, адрес проживания. Адреса объектов, паспорт и банковские реквизиты не учитываются.';
  }
  return 'В расчёт входят: e-mail, ФИО представителя, остальные данные представителя и организации, ИНН, ОГРН, адрес проживания, банковские реквизиты, телефоны. Адреса объектов не учитываются.';
}

/** Объединяет сохранённые и новые телефоны для расчёта процента. */
export function formStateForFillPercent(
  form: CrmCustomerFormState,
  lockedPhones: readonly string[]
): CrmCustomerFormState {
  const merged = [...lockedPhones.map((p) => p.trim()).filter(Boolean)];
  for (const p of form.phones) {
    const t = p.trim();
    if (t && !merged.includes(t)) merged.push(t);
  }
  return { ...form, phones: merged.length > 0 ? merged : [''] };
}
