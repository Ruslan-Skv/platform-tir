import type { ParsedPriceListRow } from './price-list-parser.types';
import { buildPriceListRowKey, parseRrcPrice } from './stroykom-price-list.shared';

function extractVariantNote(colorLine: string): string | null {
  const matches = [...colorLine.matchAll(/\(([^)]+)\)/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1][1].trim();
  if (!last) return null;
  const lower = last.toLowerCase();
  if (lower === 'стандартный' || lower === 'телескопический' || lower.includes('телескоп')) {
    return last;
  }
  return last;
}

function parseColorsFromLine(colorLine: string): string[] {
  const withoutPrefix = colorLine.replace(/^цвет:\s*/i, '').trim();
  const variantNote = extractVariantNote(withoutPrefix);
  let body = withoutPrefix;
  if (variantNote) {
    body = body.replace(
      new RegExp(`\\(${variantNote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\s*\\.?$`),
      '',
    );
  }

  return body
    .split(/[,;]/)
    .map((part) =>
      part
        .replace(/\(\d+\)/g, '')
        .replace(/\([^)]*\)/g, '')
        .replace(/\./g, '')
        .trim(),
    )
    .filter(Boolean);
}

function isTrimSectionBreak(col0: string): boolean {
  if (!col0) return false;
  if (/^\d+\./.test(col0)) return true;
  if (/^размеры полотна/i.test(col0)) return true;
  if (/^модель$/i.test(col0)) return true;
  return false;
}

export function parseStroykomTrimRows(rows: unknown[][]): ParsedPriceListRow[] {
  const parsedRows: ParsedPriceListRow[] = [];

  let currentBlock: string | null = null;
  let pendingColors: string[] = [];
  let pendingVariantNote: string | null = null;

  for (const row of rows) {
    const col0 = String(row[0] ?? '').trim();
    const col1 = String(row[1] ?? '').trim();
    const material = String(row[2] ?? '').trim() || null;
    const rrc = parseRrcPrice(row[4]);

    if (/^погонаж/i.test(col0)) {
      currentBlock = col0;
      pendingColors = [];
      pendingVariantNote = null;
      continue;
    }

    if (!currentBlock) continue;

    if (isTrimSectionBreak(col0)) {
      currentBlock = null;
      pendingColors = [];
      pendingVariantNote = null;
      continue;
    }

    if (/^цвет:/i.test(col0)) {
      pendingColors = parseColorsFromLine(col0);
      pendingVariantNote = extractVariantNote(col0);
      continue;
    }

    if (!pendingColors.length || !col0 || rrc === null) continue;

    for (const color of pendingColors) {
      const rowKey = buildPriceListRowKey('TRIM', {
        blockTitle: currentBlock,
        color,
        itemName: col0,
        size: col1 || null,
        material,
        variantNote: pendingVariantNote,
      });

      parsedRows.push({
        rowKey,
        blockTitle: currentBlock,
        color,
        itemName: col0,
        size: col1 || null,
        material,
        variantNote: pendingVariantNote,
        priceRrc: rrc,
      });
    }
  }

  return parsedRows;
}

export function parseStroykomInteriorDoorRows(rows: unknown[][]): ParsedPriceListRow[] {
  const parsedRows: ParsedPriceListRow[] = [];

  let section: string | null = null;
  let currentModel: string | null = null;
  let currentColor = '';
  let sizeNote: string | null = null;
  let inPogonazhBlock = false;

  for (const row of rows) {
    const col0 = String(row[0] ?? '').trim();
    const col1 = String(row[1] ?? '').trim();
    const note = String(row[2] ?? '').trim() || null;
    const rrc = parseRrcPrice(row[4]);

    if (/^погонаж/i.test(col0)) {
      inPogonazhBlock = true;
      section = null;
      currentModel = null;
      currentColor = '';
      continue;
    }

    if (/^\d+\./.test(col0)) {
      inPogonazhBlock = false;
      section = col0;
      currentModel = null;
      currentColor = '';
      continue;
    }

    if (inPogonazhBlock || !section) continue;

    if (/^размеры полотна/i.test(col0)) {
      sizeNote = col0;
      continue;
    }

    if (/^модель$/i.test(col0) || col0 === '(окрашенный)') continue;

    if (col0) currentModel = col0;
    if (col1) currentColor = col1;

    if (rrc === null || !currentModel) continue;

    const rowKey = buildPriceListRowKey('INTERIOR_DOOR', {
      blockTitle: section,
      color: currentColor,
      itemName: currentModel,
      size: sizeNote,
      material: null,
      variantNote: note,
    });

    parsedRows.push({
      rowKey,
      blockTitle: section,
      color: currentColor,
      itemName: currentModel,
      size: sizeNote,
      material: null,
      variantNote: note,
      priceRrc: rrc,
    });
  }

  return parsedRows;
}

export function parseStroykomSteelDoorRows(rows: unknown[][]): ParsedPriceListRow[] {
  const parsedRows: ParsedPriceListRow[] = [];

  let section: string | null = null;
  let currentModel: string | null = null;
  let sizeNote: string | null = null;

  for (const row of rows) {
    const col0 = String(row[0] ?? '').trim();
    const exterior = String(row[1] ?? '').trim();
    const interior = String(row[2] ?? '').trim();
    const paint = String(row[3] ?? '').trim() || null;
    const rrc = parseRrcPrice(row[5]);

    if (/^\d+\./.test(col0)) {
      section = col0;
      currentModel = null;
      sizeNote = null;
      continue;
    }

    if (!section) continue;

    if (/^размеры/i.test(col0)) {
      sizeNote = col0;
      continue;
    }

    if (
      /^наименование$/i.test(col0) ||
      /^внутренняя панель$/i.test(col0) ||
      /^вставка/i.test(col0) ||
      /^однопольные$/i.test(col0)
    ) {
      continue;
    }

    if (col0 && !/^850,/i.test(col0)) {
      currentModel = col0;
    }

    if (rrc === null || !currentModel) continue;

    const rowKey = buildPriceListRowKey('STEEL_DOOR', {
      blockTitle: section,
      color: interior,
      itemName: currentModel,
      size: sizeNote,
      material: exterior || null,
      variantNote: paint,
    });

    parsedRows.push({
      rowKey,
      blockTitle: section,
      color: interior,
      itemName: currentModel,
      size: sizeNote,
      material: exterior || null,
      variantNote: paint,
      priceRrc: rrc,
    });
  }

  return parsedRows;
}

function isArchColorPaletteRow(col0: string, col4: string): boolean {
  if (/^пвх\s+пленка/i.test(col0)) return true;
  if (col4) return false;
  if (!col0) return false;
  if (/^арка\s/i.test(col0)) return false;
  if (/выводится из ассортимента/i.test(col0)) return false;
  return /^[А-ЯA-Z]/.test(col0) && col0.length < 40;
}

export function parseStroykomHardwareRows(rows: unknown[][]): ParsedPriceListRow[] {
  const parsedRows: ParsedPriceListRow[] = [];
  let currentGroup: string | null = null;

  for (const row of rows) {
    const col2 = String(row[2] ?? '').trim();
    const col3 = String(row[3] ?? '').trim();
    const col4 = String(row[4] ?? '').trim();
    const rrc = parseRrcPrice(row[6]);

    if (col2) {
      currentGroup = col2;
    }

    if (!currentGroup || !col3 || rrc === null) continue;

    const rowKey = buildPriceListRowKey('HARDWARE', {
      blockTitle: currentGroup,
      color: col4,
      itemName: col3,
      size: null,
      material: null,
      variantNote: null,
    });

    parsedRows.push({
      rowKey,
      blockTitle: currentGroup,
      color: col4,
      itemName: col3,
      size: null,
      material: null,
      variantNote: null,
      priceRrc: rrc,
    });
  }

  return parsedRows;
}

export function parseStroykomArchRows(rows: unknown[][]): ParsedPriceListRow[] {
  const parsedRows: ParsedPriceListRow[] = [];

  let currentModel: string | null = null;
  let currentSubItem: string | null = null;
  let pendingFinish = '';

  for (const row of rows) {
    const col0 = String(row[0] ?? '').trim();
    const col2 = String(row[2] ?? '').trim();
    const col3 = String(row[3] ?? '').trim();
    const col4 = String(row[4] ?? '')
      .trim()
      .replace(/\s*:\s*$/, '');
    const rrc = parseRrcPrice(row[6]);

    if (col0) {
      if (/^арка\s/i.test(col0)) {
        currentModel = col0;
        currentSubItem = null;
        pendingFinish = '';
        continue;
      }

      if (currentModel && !isArchColorPaletteRow(col0, col4) && !/^пвх\s+пленка/i.test(col0)) {
        currentSubItem = col0.replace(/\s+/g, ' ').trim();
      }
    }

    if (!currentModel) continue;
    if (isArchColorPaletteRow(col0, col4)) continue;

    if (col4) {
      pendingFinish = col4;
    }

    if (rrc === null) continue;

    const finish = col4 || pendingFinish || 'неокрашен';
    const itemName = col2 || currentSubItem || 'Базовая комплектация';

    const rowKey = buildPriceListRowKey('ARCH', {
      blockTitle: currentModel,
      color: finish,
      itemName,
      size: col3 || null,
      material: null,
      variantNote: null,
    });

    parsedRows.push({
      rowKey,
      blockTitle: currentModel,
      color: finish,
      itemName,
      size: col3 || null,
      material: null,
      variantNote: null,
      priceRrc: rrc,
    });
  }

  return parsedRows;
}

export function parseStroykomAccordionRows(rows: unknown[][]): ParsedPriceListRow[] {
  const parsedRows: ParsedPriceListRow[] = [];

  let currentModel: string | null = null;
  let samplesBlock = false;

  for (const row of rows) {
    const col0 = String(row[0] ?? '').trim();
    const col3 = String(row[3] ?? '').trim();
    const col4 = String(row[4] ?? '').trim();
    const rrc = parseRrcPrice(row[5]) ?? parseRrcPrice(col4);

    if (/^цветовая\s+гамма/i.test(col0)) {
      samplesBlock = false;
      currentModel = null;
      continue;
    }

    if (/образцы панелей/i.test(col3)) {
      samplesBlock = true;
      currentModel = 'Образцы панелей';
      continue;
    }

    if (
      col0 &&
      !/^фото$/i.test(col0) &&
      !/^пластиковые/i.test(col0) &&
      !/прайс-лист/i.test(col0) &&
      rrc === null
    ) {
      if (/^[А-ЯA-Z]/.test(col0) && col0.length > 3) {
        currentModel = col0;
        samplesBlock = false;
      }
    }

    if (!currentModel || rrc === null) continue;

    const itemName = samplesBlock ? col3 || currentModel : currentModel;
    const blockTitle = samplesBlock ? 'Образцы панелей' : currentModel;

    const rowKey = buildPriceListRowKey('ACCORDION', {
      blockTitle,
      color: '',
      itemName,
      size: null,
      material: null,
      variantNote: samplesBlock ? col4 || null : null,
    });

    parsedRows.push({
      rowKey,
      blockTitle,
      color: '',
      itemName,
      size: null,
      material: null,
      variantNote: samplesBlock ? col4 || null : null,
      priceRrc: rrc,
    });

    if (!samplesBlock) {
      currentModel = null;
    }
  }

  return parsedRows;
}
