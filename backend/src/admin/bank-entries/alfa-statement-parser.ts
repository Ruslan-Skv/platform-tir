import * as XLSX from 'xlsx';

import { BankEntryType } from '@prisma/client';

import { parseStatementAmount } from './sber-statement-parser';

/** Распознанная строка кредитовой операции выписки Альфа-Банка. */
export type ParsedAlfaEntry = {
  /** Дата зачисления (YYYY-MM-DD). */
  entryDate: string;
  bank: 'ALFA';
  entryType: BankEntryType;
  /** Зачислено на счёт (за вычетом комиссии), RUB. */
  amount: number;
  fee: number;
  refund: number;
  counterparty: string | null;
  notes: string | null;
  docNumber: string | null;
  /** Номер терминала эквайринга из назначения платежа. */
  terminal: string | null;
};

export type ParsedAlfaStatement = {
  entries: ParsedAlfaEntry[];
  account: string | null;
  period: string | null;
};

/** Парсит дату «ДД.ММ.ГГГГ» в YYYY-MM-DD. */
function parseStatementDate(raw: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(raw ?? '').trim());
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Разбирает назначение платежа Альфа-Банка: «Возм 511005087470 06.10.2025
 * ПСК ПОБЕДА 94153698 Р. 17102026 К.1092.64 в т.ч. НДС 197.03», где «К.» —
 * комиссия эквайринга (зачисление уже за её вычетом).
 */
function parsePurpose(purpose: string): { fee: number; terminal: string | null } {
  let fee = 0;
  for (const match of purpose.matchAll(/(?:^|\s)К\.\s*([\d\s\u00a0]+[.,]?\d*)/gi)) {
    fee += parseStatementAmount(match[1]) ?? 0;
  }
  const terminalMatch = /\b(\d{6,})\s+Р\./.exec(purpose);
  return {
    fee: Math.round(fee * 100) / 100,
    terminal: terminalMatch ? terminalMatch[1] : null,
  };
}

/** Распознаёт xlsx-выписку Альфа-Банка («Выписка по счёту», колонки Дата/Кредит/Контрагент). */
export function parseAlfaStatement(buffer: Buffer): ParsedAlfaStatement {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('В файле нет листов');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false });

  const cell = (row: unknown[], index: number): string => {
    const value = row[index];
    return value == null ? '' : String(value).trim();
  };

  let account: string | null = null;
  let period: string | null = null;

  // Шапка: «Выписка по счёту | 40802 810 2 …», «За период | c 01.10.2026 по 17.10.2026».
  for (const row of rows) {
    const label = cell(row ?? [], 0);
    if (!account && label === 'Выписка по счёту') {
      account = cell(row ?? [], 1).replace(/\s+/g, '') || null;
    }
    if (!period && label === 'За период') {
      period = cell(row ?? [], 1) || null;
    }
  }

  // Строка заголовков таблицы операций: «Дата | Номер документа | Дебет | Кредит | Контрагент …».
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (cell(row, 0) === 'Дата' && cell(row, 3) === 'Кредит') {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex < 0) {
    throw new Error(
      'Не найдена таблица операций: это не выписка Альфа-Банка (нет строки «Дата … Кредит»)',
    );
  }

  const entries: ParsedAlfaEntry[] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const entryDate = parseStatementDate(cell(row, 0));
    if (!entryDate) continue;

    const amount = parseStatementAmount(cell(row, 3));
    if (amount == null || amount <= 0) continue;

    const purpose = cell(row, 10);
    const counterpartyText = cell(row, 4);
    const { fee, terminal } = parsePurpose(purpose);

    // Эквайринг: плательщик по операции — сам Альфа-Банк (транзитный счёт 30233…).
    const isAcquiring = /АЛЬФА-БАНК/i.test(counterpartyText) && /ПСК/i.test(purpose);
    const counterparty = isAcquiring
      ? `Альфа-Банк · эквайринг${terminal ? ` (терминал ${terminal})` : ''}`
      : counterpartyText || null;

    let entryType: BankEntryType = 'TERMINAL_QR';
    if (!isAcquiring && /счет/i.test(purpose)) {
      entryType = 'INVOICE_PAYMENT';
    }

    const docNumber = cell(row, 1) || null;
    const noteParts: string[] = [];
    if (docNumber) noteParts.push(`№ док. ${docNumber}`);
    if (terminal && !isAcquiring) noteParts.push(`терминал ${terminal}`);

    entries.push({
      entryDate,
      bank: 'ALFA',
      entryType,
      amount,
      fee,
      refund: 0,
      counterparty,
      notes: noteParts.length > 0 ? noteParts.join(' · ') : null,
      docNumber,
      terminal,
    });
  }

  if (entries.length === 0) {
    throw new Error('В выписке не найдено кредитовых операций для импорта');
  }

  return { entries, account, period };
}
