/** Критерии и матчинг дублей карточек клиентов (см. задачу уникальности заказчиков). */

export interface CustomerDuplicateCandidate {
  id: string;
  firstName: string;
  lastName: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  phones: string[];
  extendedProfile: unknown;
  deletedAt: Date | null;
}

export interface CustomerDuplicateInput {
  phones?: string[];
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  extendedProfile?: Record<string, unknown> | null;
}

export type DuplicateReason = 'PHONE' | 'EMAIL' | 'FULL_NAME_WITH_PHONE';

export interface CustomerDuplicateMatch {
  candidate: CustomerDuplicateCandidate;
  reasons: DuplicateReason[];
}

export function digitsOnly(s: string | null | undefined): string {
  const d = (s ?? '').replace(/\D/g, '');
  // Российские номера: 8 999 111-22-33 и +7 999 111-22-33 — один и тот же номер.
  if (d.length === 11 && d.startsWith('8')) return `7${d.slice(1)}`;
  return d;
}

/** Полное ФИО из extendedProfile (lastName/firstName/patronymic), либо fallback на колонки. */
export function extractFullFio(customer: {
  firstName: string;
  lastName: string | null;
  extendedProfile: unknown;
}): { lastName: string; firstName: string; patronymic: string } {
  const ext = (customer.extendedProfile ?? {}) as Record<string, unknown>;
  const str = (key: string) => {
    const v = ext[key];
    return typeof v === 'string' ? v.trim() : '';
  };
  return {
    lastName: str('lastName') || (customer.lastName ?? '').trim(),
    firstName: str('firstName') || (customer.firstName ?? '').trim(),
    patronymic: str('patronymic'),
  };
}

function hasFullFio(fio: { lastName: string; firstName: string; patronymic: string }): boolean {
  return Boolean(fio.lastName && fio.firstName && fio.patronymic);
}

function sameFio(
  a: { lastName: string; firstName: string; patronymic: string },
  b: { lastName: string; firstName: string; patronymic: string },
): boolean {
  if (!hasFullFio(a) || !hasFullFio(b)) return false;
  return (
    a.lastName.toLowerCase() === b.lastName.toLowerCase() &&
    a.firstName.toLowerCase() === b.firstName.toLowerCase() &&
    a.patronymic.toLowerCase() === b.patronymic.toLowerCase()
  );
}

function phonesIntersect(a: string[], b: string[]): boolean {
  const digitsA = new Set(a.map(digitsOnly).filter(Boolean));
  return b.some((p) => {
    const d = digitsOnly(p);
    return d && digitsA.has(d);
  });
}

/** Дубль = совпадение телефона, или email, или полного ФИО вместе с телефоном. */
export function findDuplicateReasons(
  input: CustomerDuplicateInput,
  candidate: CustomerDuplicateCandidate,
): DuplicateReason[] {
  const reasons: DuplicateReason[] = [];

  const inputPhones = (input.phones ?? []).filter((p) => (p ?? '').trim());
  const candidatePhones = candidate.phones?.length
    ? candidate.phones
    : candidate.phone
      ? [candidate.phone]
      : [];
  if (inputPhones.length > 0 && phonesIntersect(inputPhones, candidatePhones)) {
    reasons.push('PHONE');
  }

  const inputEmail = (input.email ?? '').trim().toLowerCase();
  const candidateEmail = (candidate.email ?? '').trim().toLowerCase();
  if (inputEmail && candidateEmail && inputEmail === candidateEmail) {
    reasons.push('EMAIL');
  }

  if (
    phonesIntersect(inputPhones, candidatePhones) &&
    sameFio(extractFullFioFromInput(input), extractFullFio(candidate))
  ) {
    reasons.push('FULL_NAME_WITH_PHONE');
  }

  return reasons;
}

function extractFullFioFromInput(input: CustomerDuplicateInput) {
  const ext = input.extendedProfile ?? {};
  const str = (key: string) => {
    const v = ext[key];
    return typeof v === 'string' ? v.trim() : '';
  };
  return {
    lastName: str('lastName') || (input.lastName ?? '').trim(),
    firstName: str('firstName') || (input.firstName ?? '').trim(),
    patronymic: str('patronymic'),
  };
}

/** Компактное представление дубля для ответа API (без тяжёлых полей). */
export function toDuplicateDto(match: CustomerDuplicateMatch, displayName: string) {
  const ext = (match.candidate.extendedProfile ?? {}) as Record<string, unknown>;
  const address = typeof ext.address === 'string' ? ext.address : '';
  return {
    id: match.candidate.id,
    displayName,
    email: match.candidate.email,
    phone: match.candidate.phone ?? match.candidate.phones?.[0] ?? null,
    phones: match.candidate.phones,
    address,
    reasons: match.reasons,
  };
}
