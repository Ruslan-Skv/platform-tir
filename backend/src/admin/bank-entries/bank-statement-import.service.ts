import { BadRequestException, Injectable } from '@nestjs/common';

import { BankCode, BankEntryType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { parseAlfaStatement } from './alfa-statement-parser';
import { parseSberStatement } from './sber-statement-parser';

/** Применяемая запись импорта (после возможной правки пользователем на превью). */
export type ImportStatementEntryInput = {
  entryDate: string;
  entryType: string;
  amount: number;
  fee?: number;
  refund?: number;
  counterparty?: string;
  notes?: string;
};

export type ParsedStatement = {
  bank: BankCode;
  entries: {
    entryDate: string;
    entryType: BankEntryType;
    amount: number;
    fee: number;
    refund: number;
    counterparty: string | null;
    notes: string | null;
    docNumber: string | null;
  }[];
  account: string | null;
  period: string | null;
};

export type ImportApplyResult = {
  created: number;
  /** Пропущено как дубли (та же дата + банк + сумма зачисления). */
  skippedDuplicates: number;
};

/**
 * Импорт банковских выписок: распознавание файла (Сбер / Альфа) и массовое
 * внесение записей раздела «Банк» с защитой от повторного импорта.
 */
@Injectable()
export class BankStatementImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Распознаёт xlsx-выписку (банк определяется автоматически) и возвращает строки для превью. */
  parse(file: Express.Multer.File): ParsedStatement {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Файл выписки не получен');
    }
    if (!/\.xlsx?$/i.test(file.originalname ?? '')) {
      throw new BadRequestException('Ожидается xlsx-файл банковской выписки');
    }
    try {
      try {
        return { bank: 'SBER' as BankCode, ...parseSberStatement(file.buffer) };
      } catch (sberError) {
        try {
          return { bank: 'ALFA' as BankCode, ...parseAlfaStatement(file.buffer) };
        } catch {
          throw sberError;
        }
      }
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Не удалось распознать файл выписки',
      );
    }
  }

  /**
   * Вносит выбранные строки выписки. Дубли (та же дата + тот же банк + та же
   * сумма зачисления) пропускаются, чтобы повторная загрузка выписки не
   * задваивала данные.
   */
  async apply(
    bank: BankCode,
    entries: ImportStatementEntryInput[],
    createdById?: string,
  ): Promise<ImportApplyResult> {
    if (bank !== 'SBER' && bank !== 'ALFA') {
      throw new BadRequestException('Импорт поддерживает выписки Сбера и Альфа-Банка');
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new BadRequestException('Не выбрано ни одной строки для импорта');
    }

    const dates = Array.from(new Set(entries.map((entry) => entry.entryDate)));
    const existing = await this.prisma.bankEntry.findMany({
      where: { bank, entryDate: { in: dates.map((date) => new Date(date)) } },
      select: { entryDate: true, amount: true },
    });
    const existingKeys = new Set(
      existing.map((row) => `${row.entryDate.toISOString().slice(0, 10)}|${row.amount.toFixed(2)}`),
    );

    let created = 0;
    let skippedDuplicates = 0;
    const validEntryTypes = Object.values(BankEntryType) as string[];
    for (const entry of entries) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.entryDate ?? '')) {
        throw new BadRequestException('Некорректная дата строки импорта');
      }
      if (!validEntryTypes.includes(entry.entryType)) {
        throw new BadRequestException('Некорректный способ оплаты строки импорта');
      }
      if (!(Number(entry.amount) > 0)) {
        throw new BadRequestException('Сумма строки импорта должна быть больше нуля');
      }
      const key = `${entry.entryDate}|${Number(entry.amount).toFixed(2)}`;
      if (existingKeys.has(key)) {
        skippedDuplicates += 1;
        continue;
      }
      await this.prisma.bankEntry.create({
        data: {
          entryDate: new Date(entry.entryDate),
          bank,
          entryType: entry.entryType as BankEntryType,
          amount: Number(entry.amount),
          fee: Number(entry.fee ?? 0),
          refund: Number(entry.refund ?? 0),
          counterparty: entry.counterparty?.trim() || null,
          notes: entry.notes?.trim() || null,
          createdById: createdById ?? null,
        },
      });
      existingKeys.add(key);
      created += 1;
    }

    return { created, skippedDuplicates };
  }
}
