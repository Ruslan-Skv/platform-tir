export const PHONE_PLACEHOLDER = '+7 (___) ___-__-__';

export const PHONE_FORMAT_HINT = 'Формат: +7(000)-000-00-00 или 8(000)-000-00-00';

const PHONE_FORMAT_PLUS7_RE = /^\+7\(\d{3}\)-\d{3}-\d{2}-\d{2}$/;
const PHONE_FORMAT_8_RE = /^8\(\d{3}\)-\d{3}-\d{2}-\d{2}$/;

export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/** 11 цифр с ведущей 7 (российский мобильный/городской). */
export function normalizePhoneDigits(phone: string): string | null {
  let d = digitsOnlyPhone(phone);
  if (d.length === 11 && d.startsWith('8')) d = `7${d.slice(1)}`;
  if (d.length === 10) d = `7${d}`;
  if (d.length === 11 && d.startsWith('7')) return d;
  return null;
}

export function isValidPhone(phone: string): boolean {
  const t = phone.trim();
  if (!t) return false;
  return PHONE_FORMAT_PLUS7_RE.test(t) || PHONE_FORMAT_8_RE.test(t);
}

function prefersEightPrefix(raw: string, digits: string): boolean {
  const trimmed = raw.trimStart();
  return (
    trimmed.startsWith('8') ||
    (digits.startsWith('8') && !trimmed.includes('+') && !trimmed.startsWith('+7'))
  );
}

/** Форматирование при вводе: +7(XXX)-XXX-XX-XX или 8(XXX)-XXX-XX-XX. */
export function formatPhoneInput(raw: string): string {
  const digits = digitsOnlyPhone(raw);
  if (!digits) return '';

  if (prefersEightPrefix(raw, digits)) {
    let d = digits;
    if (d.startsWith('7')) d = `8${d.slice(1)}`;
    if (!d.startsWith('8')) d = `8${d}`;
    d = d.slice(0, 11);
    const n = d.slice(1);
    if (n.length <= 3) return `8(${n}`;
    if (n.length <= 6) return `8(${n.slice(0, 3)})-${n.slice(3)}`;
    if (n.length <= 8) return `8(${n.slice(0, 3)})-${n.slice(3, 6)}-${n.slice(6)}`;
    return `8(${n.slice(0, 3)})-${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8, 10)}`;
  }

  let d = digits;
  if (d.startsWith('8')) d = `7${d.slice(1)}`;
  if (!d.startsWith('7')) d = `7${d}`;
  d = d.slice(0, 11);
  const n = d.slice(1);
  if (n.length === 0) return '+7';
  if (n.length <= 3) return `+7(${n}`;
  if (n.length <= 6) return `+7(${n.slice(0, 3)})-${n.slice(3)}`;
  if (n.length <= 8) return `+7(${n.slice(0, 3)})-${n.slice(3, 6)}-${n.slice(6)}`;
  return `+7(${n.slice(0, 3)})-${n.slice(3, 6)}-${n.slice(6, 8)}-${n.slice(8, 10)}`;
}

export function formatPhoneDisplay(phone: string): string {
  const t = phone.trim();
  if (!t) return '';
  if (PHONE_FORMAT_PLUS7_RE.test(t) || PHONE_FORMAT_8_RE.test(t)) return t;

  const digits = normalizePhoneDigits(t);
  if (!digits) return t;

  const useEight = prefersEightPrefix(t, digitsOnlyPhone(t));
  const code = digits.slice(1, 4);
  const p1 = digits.slice(4, 7);
  const p2 = digits.slice(7, 9);
  const p3 = digits.slice(9, 11);
  if (useEight) return `8(${code})-${p1}-${p2}-${p3}`;
  return `+7(${code})-${p1}-${p2}-${p3}`;
}

export function normalizePhoneForStorage(phone: string): string {
  const formatted = formatPhoneDisplay(phone.trim());
  if (!formatted || !isValidPhone(formatted)) return '';
  return formatted;
}

export function getPhoneValidationMessage(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return 'Укажите телефон';
  if (!isValidPhone(trimmed)) return PHONE_FORMAT_HINT;
  return null;
}
