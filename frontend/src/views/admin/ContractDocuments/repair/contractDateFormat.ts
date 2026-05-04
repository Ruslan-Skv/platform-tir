/** Дата договора в форме ремонта: **дд.мм.гггг** (чтение также yyyy-mm-dd, дд-мм-гггг, ISO). */

export function formatContractDateDdMmYyyy(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

export function todayContractDateDdMmYyyy(): string {
  return formatContractDateDdMmYyyy(new Date());
}

/** Разбор yyyy-mm-dd (префикс ISO), дд.мм.гггг, дд-мм-гггг. */
export function parseContractDate(raw: string | null | undefined): Date | null {
  if (!raw || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s|$)/);
  if (iso) {
    const y = Number(iso[1]);
    const mo = Number(iso[2]);
    const d = Number(iso[3]);
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null;
  }

  const dmyDot = t.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (dmyDot) {
    const d = Number(dmyDot[1]);
    const mo = Number(dmyDot[2]);
    const y = Number(dmyDot[3]);
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null;
  }

  const dmyDash = t.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyDash) {
    const d = Number(dmyDash[1]);
    const mo = Number(dmyDash[2]);
    const y = Number(dmyDash[3]);
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : null;
  }

  return null;
}

const RU_MONTH_NAMES_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

/** Дата для анкет и писем: «15 января 2026 г.»; при нераспознанной строке — как есть или «—». */
export function formatContractDateRuLong(raw: string | null | undefined): string {
  const t = (raw ?? '').trim();
  if (!t) return '—';
  const p = parseContractDate(t);
  if (!p) return t;
  const day = p.getDate();
  const month = RU_MONTH_NAMES_GENITIVE[p.getMonth()];
  const year = p.getFullYear();
  return `${day} ${month} ${year} г.`;
}

/** Приводит строку к дд.мм.гггг; нераспознанное возвращает как есть (trim). */
export function contractDateToDdMmYyyy(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const p = parseContractDate(t);
  if (p) return formatContractDateDdMmYyyy(p);
  const ts = Date.parse(t);
  if (!Number.isNaN(ts)) {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return formatContractDateDdMmYyyy(d);
  }
  return t;
}

/** Дата из CRM (ISO) → дд.мм.гггг для поля формы. */
export function isoOrCrmDateToContractDdMmYyyy(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = String(iso).trim();
  if (!s) return '';
  if (s.length >= 10) {
    const head = s.slice(0, 10);
    const p = parseContractDate(head);
    if (p) return formatContractDateDdMmYyyy(p);
  }
  const p2 = parseContractDate(s);
  return p2 ? formatContractDateDdMmYyyy(p2) : '';
}
