/** Общие резолверы карточки клиента: тип лица и отображаемое ФИО. */

export type CustomerDisplaySource = {
  firstName: string;
  lastName: string | null;
  company?: string | null;
  entityType?: string | null;
  extendedProfile: unknown;
};

export type ResolvedCustomerEntityType = 'PERSON' | 'COMPANY' | 'ENTREPRENEUR';

export function resolveCustomerEntityType(
  customer: CustomerDisplaySource,
): ResolvedCustomerEntityType {
  if (
    customer.entityType === 'PERSON' ||
    customer.entityType === 'COMPANY' ||
    customer.entityType === 'ENTREPRENEUR'
  ) {
    return customer.entityType;
  }
  const ext = customer.extendedProfile as Record<string, unknown> | null;
  const t = ext?.type;
  if (t === 'COMPANY' || t === 'ENTREPRENEUR') return t;
  return 'PERSON';
}

export function resolvePersonDisplayName(customer: {
  firstName: string;
  lastName: string | null;
  extendedProfile: unknown;
}): string {
  const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
  const str = (key: string) => {
    const v = ext[key];
    return typeof v === 'string' ? v.trim() : '';
  };
  const extLn = str('lastName');
  const extFn = str('firstName');
  const extPat = str('patronymic');
  if (extLn || extFn || extPat) {
    return [extLn, extFn, extPat].filter(Boolean).join(' ');
  }
  const full = str('fullName');
  if (full) return full;
  const rowFn = (customer.firstName ?? '').trim();
  const rowLn = (customer.lastName ?? '').trim();
  if (rowFn && /\s/.test(rowFn) && !rowLn) return rowFn;
  return [rowLn, rowFn].filter(Boolean).join(' ');
}
