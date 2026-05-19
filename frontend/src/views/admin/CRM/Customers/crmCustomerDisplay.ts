import type { CrmCustomerAuditUser, CrmCustomerEntityType } from '@/shared/api/admin-crm';

/** Подписи типа заказчика (как в форме «Добавить клиента»). */
export const CRM_ENTITY_TYPE_LABELS: Record<CrmCustomerEntityType | string, string> = {
  PERSON: 'Физлицо',
  COMPANY: 'Юридическое лицо',
  ENTREPRENEUR: 'ИП',
};

export function formatCrmEntityType(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  return CRM_ENTITY_TYPE_LABELS[value] ?? value;
}

/** Дата и время создания карточки: дд.мм.гггг чч:мм */
export function formatCrmDateTime(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function resolveCrmEntityType(
  entityType: string | null | undefined,
  ext: Record<string, unknown> | null | undefined
): string | null {
  const fromRow = entityType?.trim();
  if (fromRow) return fromRow;
  const fromExt = ext?.type;
  return typeof fromExt === 'string' && fromExt.trim() ? fromExt.trim() : null;
}

export function isCrmPersonEntity(
  entityType: string | null | undefined,
  ext: Record<string, unknown> | null | undefined
): boolean {
  return resolveCrmEntityType(entityType, ext) === 'PERSON';
}

export function extProfileString(
  ext: Record<string, unknown> | null | undefined,
  key: string
): string {
  if (!ext) return '—';
  const v = ext[key];
  return typeof v === 'string' && v.trim() ? v.trim() : '—';
}

/** Автор или редактор карточки: ФИО, иначе e-mail (как в карточке товара). */
export function formatCrmUserOptionLabel(user: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return name || user.email?.trim() || '—';
}

export function formatCrmAuditActor(user: CrmCustomerAuditUser | null | undefined): string {
  if (!user) return '—';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  return user.email?.trim() || '—';
}

/**
 * Создатель карточки. Для записей до `created_by_id` — подставляем последнего редактора,
 * если он известен (часто это тот же пользователь).
 */
export function resolveCrmCreatedByActor(data: {
  createdBy?: CrmCustomerAuditUser | null;
  updatedBy?: CrmCustomerAuditUser | null;
}): CrmCustomerAuditUser | null | undefined {
  return data.createdBy ?? data.updatedBy ?? null;
}

export function crmContractDetailHref(contract: {
  documentPackageId?: string | null;
}): string | null {
  if (contract.documentPackageId) {
    return `/admin/contract-documents/contracts/repair/${contract.documentPackageId}`;
  }
  return null;
}

export function crmMeasurementDetailHref(measurementId: string): string {
  return `/admin/measurements/${measurementId}`;
}

const MEASUREMENT_STATUS_LABELS: Record<string, string> = {
  NEW: 'Принят',
  ASSIGNED: 'Назначен',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отказ',
  CONVERTED: 'В договор',
};

export function formatCrmMeasurementStatus(status: string): string {
  return MEASUREMENT_STATUS_LABELS[status] ?? status;
}

export function formatCrmDateTimeLocale(iso: string | null | undefined): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}
