import { Injectable, NotFoundException } from '@nestjs/common';
import { BankCode, BankEntryType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { serializeBankEntry, type BankEntryRowWithUsers } from './bank-entry-serialize';

/** Сводка сумм по набору записей банка (все суммы — строки с двумя знаками). */
export type BankEntriesTotals = {
  count: number;
  amount: string;
  fee: string;
  refund: string;
  total: string;
};

const INCLUDE_CREATED_BY = {
  createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const;

function sumDecimal(value: Prisma.Decimal | null): number {
  return value ? value.toNumber() : 0;
}

function buildTotals(
  count: number,
  sums: {
    amount: Prisma.Decimal | null;
    fee: Prisma.Decimal | null;
    refund: Prisma.Decimal | null;
  },
): BankEntriesTotals {
  const amount = sumDecimal(sums.amount);
  const fee = sumDecimal(sums.fee);
  const refund = sumDecimal(sums.refund);
  return {
    count,
    amount: amount.toFixed(2),
    fee: fee.toFixed(2),
    refund: refund.toFixed(2),
    total: (amount + fee + refund).toFixed(2),
  };
}

@Injectable()
export class BankEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Список поступлений банка за период с фильтрами и сводками:
   * totals — итог по всем записям выборки, byBank — разбивка по банкам.
   */
  async findAll(params?: {
    dateFrom?: string;
    dateTo?: string;
    bank?: string;
    entryType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { dateFrom, dateTo, bank, entryType, search, page = 1, limit = 20 } = params || {};
    const take = Math.min(Math.max(limit, 1), 200);
    const skip = (page - 1) * take;

    const where: Prisma.BankEntryWhereInput = {};
    if (bank) where.bank = bank as BankCode;
    if (entryType) where.entryType = entryType as BankEntryType;
    if (dateFrom || dateTo) {
      where.entryDate = {};
      if (dateFrom) where.entryDate.gte = new Date(dateFrom);
      if (dateTo) where.entryDate.lte = new Date(dateTo);
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { counterparty: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [rows, total, aggregate, byBankGroups] = await Promise.all([
      this.prisma.bankEntry.findMany({
        where,
        include: INCLUDE_CREATED_BY,
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        take,
        skip,
      }),
      this.prisma.bankEntry.count({ where }),
      this.prisma.bankEntry.aggregate({
        where,
        _count: { _all: true },
        _sum: { amount: true, fee: true, refund: true },
      }),
      this.prisma.bankEntry.groupBy({
        by: ['bank'],
        where,
        _count: { _all: true },
        _sum: { amount: true, fee: true, refund: true },
      }),
    ]);

    const byBank: Record<string, BankEntriesTotals> = {};
    for (const group of byBankGroups) {
      byBank[group.bank] = buildTotals(group._count._all, group._sum);
    }

    return {
      data: rows.map((row: BankEntryRowWithUsers) => serializeBankEntry(row)),
      total,
      page,
      limit: take,
      totals: buildTotals(aggregate._count._all, aggregate._sum),
      byBank,
    };
  }

  async create(
    dto: {
      entryDate: string;
      bank: BankCode;
      entryType: BankEntryType;
      amount: number;
      fee?: number;
      refund?: number;
      counterparty?: string;
      notes?: string;
    },
    createdById?: string,
  ) {
    const row = await this.prisma.bankEntry.create({
      data: {
        entryDate: new Date(dto.entryDate),
        bank: dto.bank,
        entryType: dto.entryType,
        amount: dto.amount,
        fee: dto.fee ?? 0,
        refund: dto.refund ?? 0,
        counterparty: dto.counterparty?.trim() || null,
        notes: dto.notes?.trim() || null,
        createdById: createdById ?? null,
      },
      include: INCLUDE_CREATED_BY,
    });
    return serializeBankEntry(row);
  }

  async update(
    id: string,
    dto: {
      entryDate?: string;
      bank?: BankCode;
      entryType?: BankEntryType;
      amount?: number;
      fee?: number;
      refund?: number;
      counterparty?: string;
      notes?: string;
    },
  ) {
    const existing = await this.prisma.bankEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Запись банка не найдена');

    const data: Prisma.BankEntryUpdateInput = {};
    if (dto.entryDate != null) data.entryDate = new Date(dto.entryDate);
    if (dto.bank != null) data.bank = dto.bank;
    if (dto.entryType != null) data.entryType = dto.entryType;
    if (dto.amount != null) data.amount = dto.amount;
    if (dto.fee != null) data.fee = dto.fee;
    if (dto.refund != null) data.refund = dto.refund;
    if (dto.counterparty !== undefined) data.counterparty = dto.counterparty?.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes?.trim() || null;

    const row = await this.prisma.bankEntry.update({
      where: { id },
      data,
      include: INCLUDE_CREATED_BY,
    });
    return serializeBankEntry(row);
  }

  /** Удаление ошибочной записи — только супер-админ (источник — банковская выписка). */
  async remove(id: string) {
    const existing = await this.prisma.bankEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Запись банка не найдена');
    await this.prisma.bankEntry.delete({ where: { id } });
    return { deleted: true };
  }
}
