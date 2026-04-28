const ONES_MALE = [
  '',
  'один',
  'два',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
] as const;

const ONES_FEMALE = [
  '',
  'одна',
  'две',
  'три',
  'четыре',
  'пять',
  'шесть',
  'семь',
  'восемь',
  'девять',
] as const;

const TEENS = [
  'десять',
  'одиннадцать',
  'двенадцать',
  'тринадцать',
  'четырнадцать',
  'пятнадцать',
  'шестнадцать',
  'семнадцать',
  'восемнадцать',
  'девятнадцать',
] as const;

const TENS = [
  '',
  '',
  'двадцать',
  'тридцать',
  'сорок',
  'пятьдесят',
  'шестьдесят',
  'семьдесят',
  'восемьдесят',
  'девяносто',
] as const;

const HUNDREDS = [
  '',
  'сто',
  'двести',
  'триста',
  'четыреста',
  'пятьсот',
  'шестьсот',
  'семьсот',
  'восемьсот',
  'девятьсот',
] as const;

const THOUSANDS_FORMS = ['тысяча', 'тысячи', 'тысяч'] as const;
const MILLIONS_FORMS = ['миллион', 'миллиона', 'миллионов'] as const;
const BILLIONS_FORMS = ['миллиард', 'миллиарда', 'миллиардов'] as const;
const RUBLES_FORMS = ['рубль', 'рубля', 'рублей'] as const;
const KOPECKS_FORMS = ['копейка', 'копейки', 'копеек'] as const;

function choosePlural(n: number, forms: readonly [string, string, string]): string {
  const value = Math.abs(n) % 100;
  const last = value % 10;
  if (value > 10 && value < 20) return forms[2];
  if (last > 1 && last < 5) return forms[1];
  if (last === 1) return forms[0];
  return forms[2];
}

function tripletToWords(value: number, isFemale: boolean): string {
  if (value === 0) return '';
  const hundreds = Math.floor(value / 100);
  const tensUnits = value % 100;
  const tens = Math.floor(tensUnits / 10);
  const units = tensUnits % 10;
  const ones = isFemale ? ONES_FEMALE : ONES_MALE;
  const parts: string[] = [];

  if (hundreds > 0) parts.push(HUNDREDS[hundreds]);
  if (tensUnits >= 10 && tensUnits <= 19) {
    parts.push(TEENS[tensUnits - 10]);
  } else {
    if (tens > 0) parts.push(TENS[tens]);
    if (units > 0) parts.push(ones[units]);
  }
  return parts.join(' ');
}

function integerToWords(value: number): string {
  if (value === 0) return 'ноль';

  const parts: string[] = [];
  const billions = Math.floor(value / 1_000_000_000);
  const millions = Math.floor((value % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const rest = value % 1_000;

  if (billions > 0) {
    parts.push(tripletToWords(billions, false), choosePlural(billions, BILLIONS_FORMS));
  }
  if (millions > 0) {
    parts.push(tripletToWords(millions, false), choosePlural(millions, MILLIONS_FORMS));
  }
  if (thousands > 0) {
    parts.push(tripletToWords(thousands, true), choosePlural(thousands, THOUSANDS_FORMS));
  }
  if (rest > 0) {
    parts.push(tripletToWords(rest, false));
  }

  return parts.filter(Boolean).join(' ');
}

function parseAmount(raw: string): number | null {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const match = normalized.match(/^\d+(\.\d{0,2})?$/);
  if (!match) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function amountToRussianWords(raw: string): string {
  const amount = parseAmount(raw);
  if (amount === null) return '';

  const rubles = Math.floor(amount);
  const kopecks = Math.round((amount - rubles) * 100);
  const safeKopecks = kopecks === 100 ? 0 : kopecks;
  const safeRubles = kopecks === 100 ? rubles + 1 : rubles;

  const rublesText = `${integerToWords(safeRubles)} ${choosePlural(safeRubles, RUBLES_FORMS)}`;
  const kopecksText = `${String(safeKopecks).padStart(2, '0')} ${choosePlural(safeKopecks, KOPECKS_FORMS)}`;

  return `${rublesText} ${kopecksText}`;
}
