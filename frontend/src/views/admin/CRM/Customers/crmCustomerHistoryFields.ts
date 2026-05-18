import type { CrmCustomerDetail } from '@/shared/api/admin-crm';

import { formatCrmEntityType } from './crmCustomerDisplay';
import { formatCrmPhoneOrDash } from './crmCustomerPhone';

export const CRM_CUSTOMER_HISTORY_FIELD_LABELS: Record<string, string> = {
  entityType: 'Тип заказчика',
  email: 'E-mail',
  phones: 'Телефоны',
  firstName: 'Имя (в БД)',
  lastName: 'Фамилия (в БД)',
  company: 'Компания',
  position: 'Должность',
  notes: 'Заметки',
  fullName: 'ФИО',
  patronymic: 'Отчество',
  address: 'Адрес проживания',
  objectAddresses: 'Адреса объектов',
  bankDetails: 'Банковские реквизиты',
  passportSeriesNumber: 'Паспорт (серия и номер)',
  passportIssuedBy: 'Паспорт кем выдан',
  passportIssueDate: 'Паспорт дата выдачи',
  representativeFullNameNominative: 'ФИО представителя (именит.)',
  representativeFullNameGenitive: 'ФИО представителя (родит.)',
  organizationName: 'Наименование организации',
  representativePositionNominative: 'Должность представ. (именит.)',
  representativePositionGenitive: 'Должность представ. (родит.)',
  inn: 'ИНН',
  ogrn: 'ОГРН',
};

export function buildCrmCustomerSnapshotFromDetail(
  data: CrmCustomerDetail
): Record<string, unknown> {
  const ext = (data.extendedProfile ?? {}) as Record<string, unknown>;
  const phones = (data.phones?.length ? data.phones : data.phone ? [data.phone] : [])
    .map((p) => p.trim())
    .filter(Boolean);

  const snap: Record<string, unknown> = {
    entityType: data.entityType ?? ext.type ?? 'PERSON',
    email: data.email?.trim() ?? '',
    phones,
    firstName: data.firstName?.trim() ?? '',
    lastName: data.lastName?.trim() ?? '',
    company: data.company?.trim() ?? '',
    position:
      typeof ext.representativePositionNominative === 'string'
        ? ext.representativePositionNominative
        : '',
    notes: data.notes?.trim() ?? '',
  };

  const extKeys = [
    'fullName',
    'lastName',
    'firstName',
    'patronymic',
    'address',
    'objectAddresses',
    'bankDetails',
    'passportSeriesNumber',
    'passportIssuedBy',
    'passportIssueDate',
    'representativeFullNameNominative',
    'representativeFullNameGenitive',
    'organizationName',
    'representativePositionNominative',
    'representativePositionGenitive',
    'inn',
    'ogrn',
  ] as const;

  for (const key of extKeys) {
    const v = ext[key];
    if (Array.isArray(v)) snap[key] = v;
    else snap[key] = typeof v === 'string' ? v : '';
  }

  return snap;
}

export function formatCrmCustomerHistoryValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (key === 'entityType') return formatCrmEntityType(String(value));
  if (key === 'phones' && Array.isArray(value)) {
    const list = value.map((p) => formatCrmPhoneOrDash(String(p))).filter((p) => p !== '—');
    return list.length > 0 ? list.join(', ') : '—';
  }
  if (key === 'objectAddresses' && Array.isArray(value)) {
    const list = value.map((a) => String(a).trim()).filter(Boolean);
    return list.length > 0 ? list.join('; ') : '—';
  }
  const s = String(value).trim();
  return s || '—';
}

export function crmCustomerHistoryFieldLabel(key: string): string {
  return CRM_CUSTOMER_HISTORY_FIELD_LABELS[key] ?? key;
}
