import * as XLSX from 'xlsx';
import { FurnitureScheduleProjectStatus } from '@prisma/client';

export type ParsedFurnitureWeekEntry = {
  date: string; // YYYY-MM-DD
  text: string;
};

/** Excel date → UTC midnight YYYY-MM-DD (noon bias for TZ). */
export function excelHeaderToIsoDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const d = new Date(value.getTime() + 12 * 60 * 60 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    const y = parsed.y;
    const m = String(parsed.m).padStart(2, '0');
    const day = String(parsed.d).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = String(value).trim();
  if (!s || s === '.') return null;
  const m =
    /^(\d{4})-(\d{2})-(\d{2})/.exec(s) ||
    /^(\d{1,2})[./](\d{1,2})[./](\d{2,4})$/.exec(s) ||
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s);
  if (!m) return null;
  if (m[0].startsWith(m[1]) && m[1].length === 4) {
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  let day = Number(m[1]);
  let month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (month > 12 && day <= 12) {
    const tmp = day;
    day = month;
    month = tmp;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export type ParsedFurnitureProjectRow = {
  status: FurnitureScheduleProjectStatus;
  workPeriodDays: number | null;
  contractNumber: string | null;
  installationContractNumber: string | null;
  appliancesContractNumber: string | null;
  repairInfo: string | null;
  reviewInfo: string | null;
  contractDate: string | null;
  kzInfo: string | null;
  customerAddress: string | null;
  installerName: string | null;
  pauseStartDate: string | null;
  pauseResumeDate: string | null;
  workStartActDate: string | null;
  workCloseActDate: string | null;
  entries: ParsedFurnitureWeekEntry[];
  sourceRow: number;
};

export type FurnitureExcelParseResult = {
  sheetName: string;
  projects: ParsedFurnitureProjectRow[];
  skippedRows: number;
  weekColumns: number;
};

const DEFAULT_YEARS = [2025, 2026] as const;

function cellText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const d = new Date(value.getTime() + 12 * 60 * 60 * 1000);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getUTCFullYear()}`;
  }
  const s = String(value).replace(/\s+/g, ' ').trim();
  if (!s || s === '#VALUE!' || s === '#REF!' || s === '#N/A') return null;
  return s;
}

function intValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const m = String(value).replace(/\s/g, '').match(/-?\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function isoOrNull(value: unknown): string | null {
  const iso = excelHeaderToIsoDate(value);
  if (iso) return iso;
  const t = cellText(value);
  if (!t) return null;
  // «кз» и прочие маркеры — не даты
  if (/^[а-яa-z]+$/i.test(t)) return null;
  return excelHeaderToIsoDate(t);
}

function kzInfoValue(value: unknown): string | null {
  const t = cellText(value);
  if (!t) return null;
  const iso = excelHeaderToIsoDate(value) ?? excelHeaderToIsoDate(t);
  if (iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
  }
  return t.toLowerCase() === 'кз' || t.toLowerCase() === 'o' || t.toLowerCase() === 'о'
    ? t.toLowerCase() === 'o' || t.toLowerCase() === 'о'
      ? null
      : 'кз'
    : t;
}

function detectSectionStatus(text: string | null): FurnitureScheduleProjectStatus | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/рекламац|доделк/.test(t) && !/\d/.test(t)) {
    return FurnitureScheduleProjectStatus.CLAIMS;
  }
  if (/^заказы\s+в\s+работе/.test(t) || t === 'в работе') {
    return FurnitureScheduleProjectStatus.IN_PROGRESS;
  }
  if (/^заказы\s+на\s+очереди/.test(t) || /на\s+очереди/.test(t)) {
    return FurnitureScheduleProjectStatus.NEW;
  }
  if (/^закрыт/.test(t)) return FurnitureScheduleProjectStatus.CLOSED;
  return null;
}

function looksLikeContractNumber(text: string | null): boolean {
  if (!text) return false;
  // 19м-150, 1977с-127, 19т-29 и т.п.
  return /\d/.test(text) && /[а-яa-z]/i.test(text);
}

function sectionMarkerText(row: unknown[]): string | null {
  // Заголовок секции — в первых колонках, без номера договора.
  if (
    looksLikeContractNumber(cellText(row[1])) ||
    looksLikeContractNumber(cellText(row[2])) ||
    looksLikeContractNumber(cellText(row[3]))
  ) {
    return null;
  }
  for (let i = 0; i < Math.min(4, row.length); i++) {
    const t = cellText(row[i]);
    if (!t) continue;
    if (/^заказы\s+в\s+работе/i.test(t)) return t;
    if (/^выдан\s*мастеру/i.test(t)) return t;
    if (/^заказы\s+на\s+очереди/i.test(t)) return t;
    if (/рекламац|доделк/i.test(t)) return t;
    if (/^закрыт/i.test(t)) return t;
  }
  return null;
}

function buildRepairInfo(row: unknown[]): string | null {
  const parts: string[] = [];
  const main = cellText(row[4]);
  if (main) parts.push(main);
  const ceilings = cellText(row[5]);
  if (ceilings) parts.push(`потолки: ${ceilings}`);
  const windows = cellText(row[6]);
  if (windows) parts.push(`окна: ${windows}`);
  const doors = cellText(row[7]);
  if (doors) parts.push(`двери: ${doors}`);
  return parts.length ? parts.join('; ') : null;
}

/**
 * Парсер матрицы Google/Excel «ГрафикМебель» (вкладка «План-график»):
 * фикс. колонки A–T + еженедельные даты со 2-й строки заголовка;
 * секции: в работе / на очереди / рекламации / закрытые.
 * По умолчанию импортируются только колонки недель 2025–2026.
 */
export function parseFurnitureScheduleExcel(
  buffer: Buffer,
  options?: { years?: number[] },
): FurnitureExcelParseResult {
  const years = new Set(options?.years?.length ? options.years : DEFAULT_YEARS);
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => /план[\s-]*график/i.test(n)) ?? wb.SheetNames[0] ?? '';
  if (!sheetName) {
    return { sheetName: '', projects: [], skippedRows: 0, weekColumns: 0 };
  }
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
  });
  if (rows.length < 3) {
    return { sheetName, projects: [], skippedRows: 0, weekColumns: 0 };
  }

  // Даты недель во 2-й строке (индекс 1), начиная с колонки 20
  const weekHeader = rows[1] ?? [];
  const weekCols: Array<{ col: number; iso: string }> = [];
  for (let c = 20; c < weekHeader.length; c++) {
    const iso = excelHeaderToIsoDate(weekHeader[c]);
    if (!iso) continue;
    const y = Number(iso.slice(0, 4));
    if (!years.has(y)) continue;
    weekCols.push({ col: c, iso });
  }

  let status: FurnitureScheduleProjectStatus = FurnitureScheduleProjectStatus.IN_PROGRESS;
  let skipSection = false;
  const projects: ParsedFurnitureProjectRow[] = [];
  let skippedRows = 0;

  for (let r = 2; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const marker = sectionMarkerText(row);
    if (marker) {
      const next = detectSectionStatus(marker);
      if (/выдан\s*мастеру/i.test(marker)) {
        skipSection = true;
        continue;
      }
      if (next) {
        status = next;
        skipSection = false;
      }
      continue;
    }

    if (skipSection) {
      skippedRows += 1;
      continue;
    }

    const contractNumber = cellText(row[1]);
    const installationContractNumber = cellText(row[2]);
    const appliancesContractNumber = cellText(row[3]);
    const customerAddress = cellText(row[11]);
    const installerName = cellText(row[12]);
    const workPeriodDays = intValue(row[0]);
    const repairInfo = buildRepairInfo(row);
    const reviewInfo = cellText(row[8]);

    // Строки-заглушки: только «о» в датах без договоров
    if (
      !contractNumber &&
      !installationContractNumber &&
      !appliancesContractNumber &&
      !customerAddress &&
      !installerName &&
      !repairInfo
    ) {
      skippedRows += 1;
      continue;
    }

    // Имя мастера без договора в секции «Выдан» уже отфильтровано; здесь — пустые хвосты
    if (
      !contractNumber &&
      !installationContractNumber &&
      !appliancesContractNumber &&
      !customerAddress &&
      installerName &&
      !workPeriodDays
    ) {
      skippedRows += 1;
      continue;
    }

    const contractDate = isoOrNull(row[9]);
    const kzInfo = kzInfoValue(row[10]);
    const pauseStartDate = isoOrNull(row[13]);
    const pauseResumeDate = isoOrNull(row[14]);
    let workStartActDate = isoOrNull(row[15]);
    if (!workStartActDate && contractDate && (!kzInfo || kzInfo !== 'кз')) {
      workStartActDate = contractDate;
    }
    const workCloseActDate = isoOrNull(row[16]);

    const entries: ParsedFurnitureWeekEntry[] = [];
    for (const week of weekCols) {
      const text = cellText(row[week.col]);
      if (!text) continue;
      entries.push({ date: week.iso, text });
    }

    projects.push({
      status,
      workPeriodDays,
      contractNumber,
      installationContractNumber,
      appliancesContractNumber,
      repairInfo,
      reviewInfo,
      contractDate,
      kzInfo,
      customerAddress,
      installerName,
      pauseStartDate,
      pauseResumeDate,
      workStartActDate,
      workCloseActDate,
      entries,
      sourceRow: r + 1,
    });
  }

  return {
    sheetName,
    projects,
    skippedRows,
    weekColumns: weekCols.length,
  };
}
