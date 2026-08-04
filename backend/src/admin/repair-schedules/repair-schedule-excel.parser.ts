import * as XLSX from 'xlsx';
import { RepairScheduleProjectStatus } from '@prisma/client';

export type ParsedRepairWeekEntry = {
  date: string; // YYYY-MM-DD
  text: string;
};

export type ParsedRepairProjectRow = {
  status: RepairScheduleProjectStatus;
  contractNumber: string | null;
  workScope: string | null;
  installerName: string | null;
  customerAddress: string | null;
  contractSum: number | null;
  payoutSum: number | null;
  furnitureInfo: string | null;
  entries: ParsedRepairWeekEntry[];
  sourceRow: number;
};

export type RepairExcelParseResult = {
  sheetName: string;
  projects: ParsedRepairProjectRow[];
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
  return s || null;
}

function moneyValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value).replace(/\s/g, '').replace(',', '.');
  const m = raw.match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/** Excel date → UTC midnight YYYY-MM-DD parts (noon bias for TZ). */
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
  // d/m/y or m/d/y — prefer d.m.y (RU)
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

function detectSectionStatus(text: string | null): RepairScheduleProjectStatus | null {
  if (!text) return null;
  const t = text.toLowerCase().replace(/\s+/g, ' ');
  if (t.includes('в работе')) return RepairScheduleProjectStatus.IN_PROGRESS;
  if (t.includes('нов')) return RepairScheduleProjectStatus.NEW;
  if (t.includes('закрыт')) return RepairScheduleProjectStatus.CLOSED;
  return null;
}

function isSectionRow(row: unknown[]): boolean {
  const c3 = cellText(row[2]);
  if (!c3) return false;
  return /договор/i.test(c3) && !cellText(row[4]) && !cellText(row[5]) && !cellText(row[7]);
}

/**
 * Парсер матрицы Google/Excel «ГрафикРемонт»:
 * фикс. колонки + еженедельные даты; секции NEW / IN_PROGRESS / CLOSED.
 * По умолчанию импортируются только колонки недель 2025–2026.
 */
export function parseRepairScheduleExcel(
  buffer: Buffer,
  options?: { years?: number[] },
): RepairExcelParseResult {
  const years = new Set(options?.years?.length ? options.years : DEFAULT_YEARS);
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { sheetName: '', projects: [], skippedRows: 0, weekColumns: 0 };
  }
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
  });
  if (rows.length < 2) {
    return { sheetName, projects: [], skippedRows: 0, weekColumns: 0 };
  }

  const header = rows[0] ?? [];
  const weekCols: Array<{ col: number; iso: string }> = [];
  for (let c = 8; c < header.length; c++) {
    const iso = excelHeaderToIsoDate(header[c]);
    if (!iso) continue;
    const y = Number(iso.slice(0, 4));
    if (!years.has(y)) continue;
    weekCols.push({ col: c, iso });
  }

  let status: RepairScheduleProjectStatus = RepairScheduleProjectStatus.IN_PROGRESS;
  const projects: ParsedRepairProjectRow[] = [];
  let skippedRows = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    if (isSectionRow(row)) {
      const next = detectSectionStatus(cellText(row[2]));
      if (next) status = next;
      continue;
    }

    const contractNumber = cellText(row[4]);
    const workScope = cellText(row[5]);
    const installerName = cellText(row[6]);
    const customerAddress = cellText(row[7]);
    const payoutSum = moneyValue(row[0]);
    const contractSum = moneyValue(row[1]);
    const furnitureInfo = cellText(row[2]);

    if (!contractNumber && !customerAddress && !workScope && !installerName) {
      skippedRows += 1;
      continue;
    }

    const entries: ParsedRepairWeekEntry[] = [];
    for (const week of weekCols) {
      const text = cellText(row[week.col]);
      if (!text) continue;
      entries.push({ date: week.iso, text });
    }

    projects.push({
      status,
      contractNumber,
      workScope,
      installerName,
      customerAddress,
      contractSum,
      payoutSum,
      furnitureInfo,
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
