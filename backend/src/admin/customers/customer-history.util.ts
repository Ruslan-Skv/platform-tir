import type { Customer } from '@prisma/client';

export type CustomerHistorySnapshot = Record<string, unknown>;

const EXT_SNAPSHOT_KEYS = [
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

export function resolveCustomerEntityTypeFromRow(customer: {
  entityType: string | null;
  extendedProfile: unknown;
}): 'PERSON' | 'COMPANY' | 'ENTREPRENEUR' {
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

function collectPhones(customer: { phone: string | null; phones: string[] }): string[] {
  const list = (customer.phones?.length ? customer.phones : customer.phone ? [customer.phone] : [])
    .map((p) => p.trim())
    .filter(Boolean);
  const unique: string[] = [];
  for (const p of list) {
    if (!unique.includes(p)) unique.push(p);
  }
  return unique;
}

export function buildCustomerHistorySnapshot(customer: {
  email: string | null;
  phone: string | null;
  phones: string[];
  firstName: string;
  lastName: string | null;
  company: string | null;
  position: string | null;
  entityType: string | null;
  notes: string | null;
  extendedProfile: unknown;
}): CustomerHistorySnapshot {
  const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
  const snap: CustomerHistorySnapshot = {
    entityType: resolveCustomerEntityTypeFromRow(customer),
    email: customer.email ?? '',
    phones: collectPhones(customer),
    firstName: customer.firstName,
    lastName: customer.lastName ?? '',
    company: customer.company ?? '',
    position: customer.position ?? '',
    notes: customer.notes ?? '',
  };

  for (const key of EXT_SNAPSHOT_KEYS) {
    const v = ext[key];
    if (Array.isArray(v)) {
      snap[key] = v.map((x) => (typeof x === 'string' ? x : String(x)));
    } else if (typeof v === 'string') {
      snap[key] = v;
    } else {
      snap[key] = '';
    }
  }

  return snap;
}

export function computeCustomerHistoryChangedFields(
  before: CustomerHistorySnapshot,
  after: CustomerHistorySnapshot,
): string[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changed: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key);
    }
  }
  return changed;
}

export function customerRowAfterUpdate(
  existing: Customer,
  patch: {
    email?: string | null;
    phone?: string | null;
    phones?: string[];
    notes?: string | null;
    company?: string | null;
    position?: string | null;
    extendedProfile?: unknown;
  },
): Customer {
  return {
    ...existing,
    email: patch.email !== undefined ? patch.email : existing.email,
    phone: patch.phone !== undefined ? patch.phone : existing.phone,
    phones: patch.phones !== undefined ? patch.phones : existing.phones,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    company: patch.company !== undefined ? patch.company : existing.company,
    position: patch.position !== undefined ? patch.position : existing.position,
    extendedProfile:
      patch.extendedProfile !== undefined ? patch.extendedProfile : existing.extendedProfile,
  };
}
