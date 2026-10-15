import { Injectable, NotFoundException } from '@nestjs/common';
import { BankCode, BankEntryType, PaymentType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  serializeBankEntry,
  serializeSalaryPayoutBankEntry,
  type BankEntryRowWithUsers,
} from './bank-entry-serialize';

/** Сводка сумм по набору записей банка (все суммы — строки с двумя знаками). */
export type BankEntriesTotals = {
  count: number;
  amount: string;
  fee: string;
  refund: string;
  total: string;
};

/** Итог безналичных выплат з/п за период (строки-проекции записей банка). */
export type SalaryPayoutsTotals = {
  count: number;
  sum: string;
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
   * Вместе с поступлениями показываются безналичные выплаты з/п (строки-проекции
   * со знаком минус): записи раздела «Выплаты з/п», ручные записи ДП «Зар/плата»
   * и авансы мастерам по банку. Выплаты не входят в итоги поступлений —
   * для них отдельная сводка payouts; в сверке с ДП не участвуют.
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

    // Фильтры банка и способа оплаты относятся к поступлениям — строки-проекции
    // выплат з/п показываем только в общем списке.
    const includePayouts = !bank && !entryType;
    const payoutSearch = search?.trim();
    const payoutDateFilter = (field: 'paidAt' | 'paymentDate') =>
      dateFrom || dateTo
        ? {
            [field]: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
            },
          }
        : undefined;

    // Записи раздела «Выплаты з/п» со способом «Банк».
    const payoutWhere: Prisma.SalaryPayoutWhereInput = {
      deletedAt: null,
      paymentMethod: 'BANK',
      ...(payoutDateFilter('paidAt') ?? {}),
      ...(payoutSearch
        ? {
            OR: [
              { recipientName: { contains: payoutSearch, mode: 'insensitive' } },
              { note: { contains: payoutSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Ручные записи ДП «Зар/плата» безналом (переводы на ЛК, банк. приложение).
    const dpSalaryWhere: Prisma.MoneyMovementWhereInput = {
      deletedAt: null,
      paymentType: PaymentType.OTHER,
      sourceId: null,
      salaryRecipientName: { not: null },
      paymentForm: { not: 'CASH' },
      ...(payoutDateFilter('paymentDate') ?? {}),
      ...(payoutSearch
        ? {
            OR: [
              { salaryRecipientName: { contains: payoutSearch, mode: 'insensitive' } },
              { notes: { contains: payoutSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Авансы мастерам по банку (раньше были видны только в расчётах мастеров).
    const advanceWhere: Prisma.ContractDocumentPackageInstallerAdvanceWhereInput = {
      paymentMethod: 'BANK',
      package: { deletedAt: null },
      ...(payoutDateFilter('paidAt') ?? {}),
      ...(payoutSearch
        ? {
            OR: [
              { installer: { fullName: { contains: payoutSearch, mode: 'insensitive' } } },
              { installerName: { contains: payoutSearch, mode: 'insensitive' } },
              { note: { contains: payoutSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Страница объединённого списка: из каждого источника достаточно skip + take
    // отсортированных строк — слияние и срез дают страницу объединения.
    const fetchTake = skip + take;

    const [
      rows,
      total,
      aggregate,
      byBankGroups,
      payoutRows,
      payoutTotal,
      payoutSum,
      dpSalaryRows,
      dpSalaryTotal,
      dpSalarySum,
      advanceRows,
      advanceTotal,
      advanceSum,
    ] = await Promise.all([
      this.prisma.bankEntry.findMany({
        where,
        include: INCLUDE_CREATED_BY,
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        take: fetchTake,
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
      includePayouts
        ? this.prisma.salaryPayout.findMany({
            where: payoutWhere,
            include: INCLUDE_CREATED_BY,
            orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            take: fetchTake,
          })
        : Promise.resolve([]),
      includePayouts ? this.prisma.salaryPayout.count({ where: payoutWhere }) : Promise.resolve(0),
      includePayouts
        ? this.prisma.salaryPayout.aggregate({ where: payoutWhere, _sum: { amount: true } })
        : Promise.resolve({ _sum: { amount: null as Prisma.Decimal | null } }),
      includePayouts
        ? this.prisma.moneyMovement.findMany({
            where: dpSalaryWhere,
            include: INCLUDE_CREATED_BY,
            orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            take: fetchTake,
          })
        : Promise.resolve([]),
      includePayouts
        ? this.prisma.moneyMovement.count({ where: dpSalaryWhere })
        : Promise.resolve(0),
      includePayouts
        ? this.prisma.moneyMovement.aggregate({ where: dpSalaryWhere, _sum: { amount: true } })
        : Promise.resolve({ _sum: { amount: null as Prisma.Decimal | null } }),
      includePayouts
        ? this.prisma.contractDocumentPackageInstallerAdvance.findMany({
            where: advanceWhere,
            include: {
              installer: { select: { fullName: true } },
              createdBy: INCLUDE_CREATED_BY.createdBy,
            },
            orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
            take: fetchTake,
          })
        : Promise.resolve([]),
      includePayouts
        ? this.prisma.contractDocumentPackageInstallerAdvance.count({ where: advanceWhere })
        : Promise.resolve(0),
      includePayouts
        ? this.prisma.contractDocumentPackageInstallerAdvance.aggregate({
            where: advanceWhere,
            _sum: { amount: true },
          })
        : Promise.resolve({ _sum: { amount: null as Prisma.Decimal | null } }),
    ]);

    const merged = [
      ...rows.map((row: BankEntryRowWithUsers) => serializeBankEntry(row)),
      ...payoutRows.map((row) =>
        serializeSalaryPayoutBankEntry({
          id: row.id,
          source: 'PAYOUT',
          entryDate: row.paidAt,
          amount: row.amount,
          counterparty: row.recipientName,
          notes: row.note,
          createdBy: row.createdBy,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
      ),
      ...dpSalaryRows.map((row) =>
        serializeSalaryPayoutBankEntry({
          id: row.id,
          source: 'DP',
          entryDate: row.paymentDate,
          amount: row.amount.neg(),
          counterparty: row.salaryRecipientName ?? '—',
          notes: row.notes,
          createdBy: row.createdBy,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
      ),
      ...advanceRows.map((row) =>
        serializeSalaryPayoutBankEntry({
          id: row.id,
          source: 'INSTALLER_ADVANCE',
          entryDate: row.paidAt,
          amount: row.amount,
          counterparty: row.installer?.fullName ?? row.installerName ?? '—',
          notes: row.note,
          createdBy: row.createdBy,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
      ),
    ];
    merged.sort((a, b) => {
      if (a.entryDate !== b.entryDate) return a.entryDate < b.entryDate ? 1 : -1;
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    });

    const byBank: Record<string, BankEntriesTotals> = {};
    for (const group of byBankGroups) {
      byBank[group.bank] = buildTotals(group._count._all, group._sum);
    }

    const payoutsCount = payoutTotal + dpSalaryTotal + advanceTotal;
    const payoutsSum =
      Number(payoutSum._sum.amount ?? 0) +
      Math.abs(Number(dpSalarySum._sum.amount ?? 0)) +
      Number(advanceSum._sum.amount ?? 0);
    const payouts: SalaryPayoutsTotals = {
      count: payoutsCount,
      sum: payoutsSum.toFixed(2),
    };

    return {
      data: merged.slice(skip, skip + take),
      total: total + payoutsCount,
      page,
      limit: take,
      totals: buildTotals(aggregate._count._all, aggregate._sum),
      byBank,
      payouts,
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
