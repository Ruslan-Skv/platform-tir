import * as XLSX from 'xlsx';
import type {
  ParsedPriceList,
  ParsedPriceListRow,
  SupplierPriceListCategory,
} from './price-list-parser.types';
import {
  PRICE_LIST_CATEGORY_LABELS,
  PRICE_LIST_CATEGORY_SHEETS,
  SUPPLIER_PRICE_LIST_CATEGORIES,
} from './price-list-parser.types';
import {
  parseStroykomAccordionRows,
  parseStroykomArchRows,
  parseStroykomHardwareRows,
  parseStroykomInteriorDoorRows,
  parseStroykomSteelDoorRows,
  parseStroykomTrimRows,
} from './stroykom-category-parsers';
import { extractPriceListDate, findSheetByName, PARSER_CODE } from './stroykom-price-list.shared';

/** В файлах Стройкома часто десятки тысяч пустых строк — ограничиваем чтение. */
const PRICE_LIST_SHEET_MAX_ROWS = 4000;

function readStroykomWorkbook(filePath: string) {
  return XLSX.readFile(filePath, {
    cellDates: false,
    sheetRows: PRICE_LIST_SHEET_MAX_ROWS,
  });
}

function readSheetRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Вкладка «${sheetName}» не найдена в файле прайс-листа`);
  }
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });
}

function parseCategoryFromWorkbook(
  workbook: XLSX.WorkBook,
  category: SupplierPriceListCategory,
  sheetRowsCache: Map<string, unknown[][]>,
): ParsedPriceList {
  const targetSheet = PRICE_LIST_CATEGORY_SHEETS[category];
  const sheetName = findSheetByName(workbook, targetSheet);
  if (!sheetName) {
    throw new Error(`Вкладка «${targetSheet}» не найдена в файле прайс-листа`);
  }

  let rows = sheetRowsCache.get(sheetName);
  if (!rows) {
    rows = readSheetRows(workbook, sheetName);
    sheetRowsCache.set(sheetName, rows);
  }

  const parsedRows = parseRowsByCategory(category, rows);

  return {
    priceListDate: extractPriceListDate(rows),
    sheetName,
    parserCode: PARSER_CODE,
    category,
    rows: parsedRows,
  };
}

export {
  SUPPLIER_PRICE_LIST_CATEGORIES,
  PRICE_LIST_CATEGORY_LABELS,
} from './price-list-parser.types';
export { buildPriceListRowKey, normalizePriceListText } from './stroykom-price-list.shared';

function parseRowsByCategory(
  category: SupplierPriceListCategory,
  rows: unknown[][],
): ParsedPriceListRow[] {
  switch (category) {
    case 'TRIM':
      return parseStroykomTrimRows(rows);
    case 'INTERIOR_DOOR':
      return parseStroykomInteriorDoorRows(rows);
    case 'STEEL_DOOR':
      return parseStroykomSteelDoorRows(rows);
    case 'HARDWARE':
      return parseStroykomHardwareRows(rows);
    case 'ARCH':
      return parseStroykomArchRows(rows);
    case 'ACCORDION':
      return parseStroykomAccordionRows(rows);
    default:
      return [];
  }
}

export function parseStroykomPriceList(
  filePath: string,
  category: SupplierPriceListCategory = 'TRIM',
): ParsedPriceList {
  const workbook = readStroykomWorkbook(filePath);
  return parseCategoryFromWorkbook(workbook, category, new Map());
}

export type ParsedPriceListCategoryResult = {
  category: SupplierPriceListCategory;
  parsed?: ParsedPriceList;
  skipped: boolean;
  skipReason?: string;
};

export function parseStroykomPriceListAll(filePath: string): ParsedPriceListCategoryResult[] {
  const workbook = readStroykomWorkbook(filePath);
  const sheetRowsCache = new Map<string, unknown[][]>();

  return SUPPLIER_PRICE_LIST_CATEGORIES.map((category) => {
    try {
      const parsed = parseCategoryFromWorkbook(workbook, category, sheetRowsCache);
      if (parsed.rows.length === 0) {
        return {
          category,
          skipped: true,
          skipReason: `В категории «${PRICE_LIST_CATEGORY_LABELS[category]}» не найдено строк`,
        };
      }
      return { category, parsed, skipped: false };
    } catch (e) {
      return {
        category,
        skipped: true,
        skipReason: e instanceof Error ? e.message : 'Ошибка разбора',
      };
    }
  });
}

export function diffPriceListRows(
  previous: ParsedPriceListRow[],
  current: ParsedPriceListRow[],
): Array<{
  status: 'unchanged' | 'changed' | 'added' | 'removed';
  rowKey: string;
  blockTitle: string;
  color: string;
  itemName: string;
  size: string | null;
  material: string | null;
  variantNote: string | null;
  previousPrice: number | null;
  currentPrice: number | null;
  delta: number | null;
}> {
  const prevMap = new Map(previous.map((r) => [r.rowKey, r]));
  const curMap = new Map(current.map((r) => [r.rowKey, r]));
  const keys = new Set([...prevMap.keys(), ...curMap.keys()]);
  const result: Array<{
    status: 'unchanged' | 'changed' | 'added' | 'removed';
    rowKey: string;
    blockTitle: string;
    color: string;
    itemName: string;
    size: string | null;
    material: string | null;
    variantNote: string | null;
    previousPrice: number | null;
    currentPrice: number | null;
    delta: number | null;
  }> = [];

  for (const rowKey of [...keys].sort()) {
    const prev = prevMap.get(rowKey);
    const cur = curMap.get(rowKey);

    if (prev && cur) {
      const delta = Math.round((cur.priceRrc - prev.priceRrc) * 100) / 100;
      result.push({
        status: delta === 0 ? 'unchanged' : 'changed',
        rowKey,
        blockTitle: cur.blockTitle,
        color: cur.color,
        itemName: cur.itemName,
        size: cur.size,
        material: cur.material,
        variantNote: cur.variantNote,
        previousPrice: prev.priceRrc,
        currentPrice: cur.priceRrc,
        delta,
      });
      continue;
    }

    if (cur && !prev) {
      result.push({
        status: 'added',
        rowKey,
        blockTitle: cur.blockTitle,
        color: cur.color,
        itemName: cur.itemName,
        size: cur.size,
        material: cur.material,
        variantNote: cur.variantNote,
        previousPrice: null,
        currentPrice: cur.priceRrc,
        delta: null,
      });
      continue;
    }

    if (prev && !cur) {
      result.push({
        status: 'removed',
        rowKey,
        blockTitle: prev.blockTitle,
        color: prev.color,
        itemName: prev.itemName,
        size: prev.size,
        material: prev.material,
        variantNote: prev.variantNote,
        previousPrice: prev.priceRrc,
        currentPrice: null,
        delta: null,
      });
    }
  }

  return result;
}
