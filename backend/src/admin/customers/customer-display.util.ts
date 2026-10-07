/** Общие резолверы карточки клиента: тип лица и отображаемое ФИО. */

export type CustomerDisplaySource = {
  firstName: string;
  lastName: string | null;
  company?: string | null;
  entityType?: string | null;
  extendedProfile: unknown;
  email?: string | null;
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

/**
 * Отображаемое имя карточки для снимков в других сущностях (расчёты, замеры):
 * физлицо — ФИО, организация — название. Совпадает с логикой фронтенда
 * `personDisplayNameFromCrmDetail`.
 */
export function resolveCustomerDisplayName(customer: CustomerDisplaySource): string {
  const email = (customer.email ?? '').trim();
  if (resolveCustomerEntityType(customer) === 'PERSON') {
    return resolvePersonDisplayName(customer) || email;
  }
  const company = (customer.company ?? '').trim();
  if (company) return company;
  const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
  const org = typeof ext.organizationName === 'string' ? ext.organizationName.trim() : '';
  if (org) return org;
  const names = [customer.lastName, customer.firstName]
    .map((x) => (x ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return names || email;
}
