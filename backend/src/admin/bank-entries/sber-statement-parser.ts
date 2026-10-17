import * as XLSX from 'xlsx';

import { BankEntryType } from '@prisma/client';

/** Распознанная строка кредитовой операции выписки Сбербизнеса. */
export type ParsedSberEntry = {
  /** Дата зачисления (YYYY-MM-DD). */
  entryDate: string;
  bank: 'SBER';
  entryType: BankEntryType;
  /** Зачислено на счёт (за вычетом комиссии), RUB. */
  amount: number;
  fee: number;
  refund: number;
  counterparty: string | null;
  notes: string | null;
  /** Номер документа из выписки (для отображения и контроля дублей). */
  docNumber: string | null;
  /** Мерчант эквайринга из назначения платежа. */
  merchant: string | null;
};

export type ParsedSberStatement = {
  entries: ParsedSberEntry[];
  /** Номер лицевого счёта из имени листа/шапки. */
  account: string | null;
  /** Период выписки в формате из шапки. */
  period: string | null;
};

/** Парсит денежную сумму из текста выписки: «23,436.77», «0,00», «2 867.00», «76,69». */
export function parseStatementAmount(raw: string): number | null {
  if (!raw) return null;
  let text = String(raw).replace(/\s|\u00a0/g, '');
  if (/^\d+$/.test(text)) return Number(text);
  if (text.includes(',') && text.includes('.')) {
    // «23,436.77» — разделитель тысяч запятая, десятичная точка.
    text = text.replace(/,/g, '');
  } else if (text.includes(',')) {
    // «0,00» / «76,69» — десятичная запятая.
    text = text.replace(',', '.');
  }
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

/** Парсит дату «ДД.ММ.ГГГГ» в YYYY-MM-DD. */
function parseStatementDate(raw: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(raw ?? '').trim());
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Разбирает назначение платежа: комиссии («Комиссия 616.23», «усл.банка 76.69»),
 * возврат («Возврат покупки 150.00/2.30»), мерчант эквайринга и способ оплаты.
 */
function parsePurpose(purpose: string): {
  fee: number;
  refund: number;
  merchant: string | null;
  entryType: BankEntryType;
} {
  let fee = 0;
  let refund = 0;

  for (const match of purpose.matchAll(/комиссия\s+([\d\s\u00a0]+[.,]?\d*)/gi)) {
    fee += parseStatementAmount(match[1]) ?? 0;
  }
  for (const match of purpose.matchAll(/усл\.?\s*банка\s+([\d\s\u00a0]+[.,]?\d*)/gi)) {
    fee += parseStatementAmount(match[1]) ?? 0;
  }
  for (const match of purpose.matchAll(
    /возврат\s+покупки\s+([\d\s\u00a0.,]+)\/([\d\s\u00a0.,]+)/gi,
  )) {
    // «Возврат покупки X/Y»: X — сумма возврата, Y — комиссия возврата.
    refund += parseStatementAmount(match[1]) ?? 0;
    fee += parseStatementAmount(match[2]) ?? 0;
  }

  const merchantMatch = /Мерчант\s*№\s*(\d+)/i.exec(purpose);
  const merchant = merchantMatch ? merchantMatch[1] : null;

  let entryType: BankEntryType = 'TERMINAL_QR';
  if (/оплата\s+по\s+сч[её]ту/i.test(purpose) && !/эквайринг/i.test(purpose)) {
    entryType = 'INVOICE_PAYMENT';
  } else if (/перевод\s+(на\s+)?(личн|карт)/i.test(purpose)) {
    entryType = 'LC_TRANSFER';
  }

  fee = Math.round(fee * 100) / 100;
  refund = Math.round(refund * 100) / 100;
  return { fee, refund, merchant, entryType };
}

/**
 * Контрагент из ячейки счёта плательщика: «30233...\nИНН\nНазвание //ФИО//».
 * Для операций эквайринга плательщик — сам банк, поэтому берётся из назначения.
 */
function parseCounterparty(
  accountCell: string,
  merchant: string | null,
  isAcquiring: boolean,
): string | null {
  const text = String(accountCell ?? '').trim();
  if (isAcquiring) {
    return merchant ? `Сбербанк · эквайринг (мерчант №${merchant})` : 'Сбербанк · эквайринг';
  }
  const selfMatch = /\/\/\s*(.+?)\s*\/\//.exec(text);
  if (selfMatch) return selfMatch[1].trim();
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  // Первая строка — счёт, вторая — ИНН; дальше — наименование плательщика.
  const name = lines.slice(2).join(' ').trim();
  return name || null;
}

/** Распознаёт xlsx-выписку Сбербизнеса («СПИСОК КРЕДИТОВЫХ ОПЕРАЦИЙ ПО ЛИЦЕВОМУ СЧЕТУ»). */
export function parseSberStatement(buffer: Buffer): ParsedSberStatement {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('В файле нет листов');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false });

  const cell = (row: unknown[], index: number): string => {
    const value = row[index];
    return value == null ? '' : String(value).trim();
  };

  // Шапка: счёт — имя листа (или первая непустая ячейка со счётом), период — строка «за период…».
  let account: string | null = /^\d{20}$/.test(sheetName) ? sheetName : null;
  let period: string | null = null;

  // Строка заголовков таблицы операций.
  let headerIndex = -1;
  let dateCol = -1;
  let accountCol = -1;
  let creditCol = -1;
  let docCol = -1;
  let purposeCol = -1;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const joined = row.map((value) => String(value ?? '').trim());
    const dateIdx = joined.findIndex((value) => value === 'Дата проводки');
    if (dateIdx >= 0) {
      headerIndex = i;
      dateCol = dateIdx;
      accountCol = joined.findIndex((value) => value === 'Счет' || value === 'Счёт');
      creditCol = joined.findIndex((value) => value === 'Сумма по кредиту');
      docCol = joined.findIndex((value) => value === '№ документа');
      purposeCol = joined.findIndex((value) => value === 'Назначение платежа');
      break;
    }
  }
  if (headerIndex < 0) {
    throw new Error(
      'Не найдена таблица операций: это не выписка Сбербизнеса (нет строки «Дата проводки»)',
    );
  }

  const entries: ParsedSberEntry[] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const joinedText = row.map((value) => String(value ?? '').trim()).join(' ');
    if (/^\s*б\/с\b/.test(cell(row, 1)) || joinedText.includes('Входящий остаток')) break;

    const entryDate = parseStatementDate(dateCol >= 0 ? cell(row, dateCol) : '');
    if (!entryDate) continue;

    const amount = creditCol >= 0 ? parseStatementAmount(cell(row, creditCol)) : null;
    if (amount == null || amount <= 0) continue;

    const purpose = purposeCol >= 0 ? cell(row, purposeCol) : '';
    const accountCellText = accountCol >= 0 ? cell(row, accountCol) : '';

    const { fee, refund, merchant, entryType } = parsePurpose(purpose);
    const isAcquiring = /эквайринг/i.test(purpose) && Boolean(merchant);

    const docNumber = docCol >= 0 ? cell(row, docCol) || null : null;
    const noteParts: string[] = [];
    if (docNumber) noteParts.push(`№ док. ${docNumber}`);
    if (/по принятым платежам/i.test(purpose)) noteParts.push('СБП/оплата заказов');
    if (refund > 0) noteParts.push('есть возврат');

    entries.push({
      entryDate,
      bank: 'SBER',
      entryType,
      amount,
      fee,
      refund,
      counterparty: parseCounterparty(accountCellText, merchant, isAcquiring),
      notes: noteParts.length > 0 ? noteParts.join(' · ') : null,
      docNumber,
      merchant,
    });
  }

  // Период и счёт из шапки (до таблицы операций).
  for (let i = 0; i < headerIndex && i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    for (const value of row) {
      const text = String(value ?? '').trim();
      if (!account && /^\d{20}$/.test(text)) account = text;
      if (!period && /за период с/i.test(text)) {
        period = text.replace(/\s+/g, ' ');
      }
    }
  }

  if (entries.length === 0) {
    throw new Error('В выписке не найдено кредитовых операций для импорта');
  }

  return { entries, account, period };
}
