import { normalizeContractDocumentObjectAddress } from './contract-document-object-address';

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** Адрес объекта из formData пакета (общая структура customer/object). */
export function packageFormObjectAddress(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '';
  const o = asObj((formData as Record<string, unknown>).object);
  return String(o?.objectAddress ?? '').trim();
}

export function packageFormCustomerName(formData: unknown): string {
  if (!formData || typeof formData !== 'object') return '';
  const c = asObj((formData as Record<string, unknown>).customer);
  if (!c) return '';
  const type = c.type;
  if (type === 'COMPANY' || type === 'ENTREPRENEUR') {
    return String(c.organizationName ?? '').trim();
  }
  return String(c.fullName ?? '').trim();
}

export function packageFormNormalizedAddress(formData: unknown): string {
  return normalizeContractDocumentObjectAddress(packageFormObjectAddress(formData));
}
