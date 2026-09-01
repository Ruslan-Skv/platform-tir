/** Нормализация email для сопоставления контактов (ЛК, CRM, пакеты документов). */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (email == null) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

/** Только цифры; для РФ ведущая 8 → 7 (11 цифр). */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (phone == null) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 11 && digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  }
  return digits;
}

/** Сравнение телефонов после нормализации. */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** Сравнение email после нормализации. */
export function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeEmail(a);
  const nb = normalizeEmail(b);
  if (!na || !nb) return false;
  return na === nb;
}
