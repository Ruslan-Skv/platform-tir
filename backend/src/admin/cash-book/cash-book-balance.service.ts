import { Injectable } from '@nestjs/common';
import { PaymentForm, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CASH_ENTRY_KIND_MANUAL,
  CASH_ENTRY_KIND_OPENING,
  ENTRY_INCLUDE,
  serializeOpeningBalance,
} from './cash-book-serialize';

/** Остаток кассы (центра) за период: начало/конец, приход/расход и начальный остаток. */
export type CashBookBalanceResult = {
  /** Остаток на начало периода (все записи до «даты от»). */
  start: number;
  /** Остаток на конец периода (все записи до «даты до»; без неё — текущий). */
  end: number;
  /** Приход за период (положительные записи, без начального остатка). */
  income: number;
  /** Расход за период (величина изъятий, положительное число). */
  expense: number;
  /** Начальный остаток, если его дата попала внутрь периода. */
  openingInPeriod: number;
};

/** Зафиксированный начальный остаток; null — ещё не задан. */
export type CashBookOpeningBalanceResult = ReturnType<typeof serializeOpeningBalance>;

/**
 * Остатки кассы (центра): считаются по всем источникам журнала (свёрченные
 * наличные ДП, записи кассы, выплаты мастерам и выплаты з/п) без фильтров
 * менеджера и поиска — только границы периода, чтобы фильтры не искажали
 * остаток. Начальный остаток (kind = OPENING) входит в остатки на дату,
 * но не в обороты периода.
 */
@Injectable()
export class CashBookBalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async compute(params: { dateFrom?: string; dateTo?: string }): Promise<{
    balance: CashBookBalanceResult;
    openingBalance: CashBookOpeningBalanceResult | null;
  }> {
    const beforeFilter = params.dateFrom
      ? { paymentDate: { lt: new Date(params.dateFrom) } }
      : undefined;
    const toEndFilter = params.dateTo
      ? { paymentDate: { lte: new Date(`${params.dateTo}T23:59:59.999`) } }
      : undefined;
    const periodFilter =
      params.dateFrom || params.dateTo
        ? {
            paymentDate: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999`) } : {}),
            },
          }
        : undefined;
    const payoutBeforeFilter = params.dateFrom
      ? { paidAt: { lt: new Date(params.dateFrom) } }
      : undefined;
    const payoutToEndFilter = params.dateTo
      ? { paidAt: { lte: new Date(`${params.dateTo}T23:59:59.999`) } }
      : undefined;
    const payoutPeriodFilter =
      params.dateFrom || params.dateTo
        ? {
            paidAt: {
              ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
              ...(params.dateTo ? { lte: new Date(`${params.dateTo}T23:59:59.999`) } : {}),
            },
          }
        : undefined;

    const dpBalanceBase: Prisma.MoneyMovementWhereInput = {
      deletedAt: null,
      paymentForm: PaymentForm.CASH,
      manualReconciledAt: { not: null },
    };
    const advanceBalanceFrom = Prisma.sql`
      FROM contract_document_package_installer_advances a
      JOIN contract_document_packages p ON p."id" = a."packageId"
      WHERE p."deleted_at" IS NULL AND a."paymentMethod" = 'CASH'`;
    const payoutBalanceBase: Prisma.SalaryPayoutWhereInput = {
      deletedAt: null,
      paymentMethod: 'CASH',
    };

    const [
      openingRow,
      dpSumBefore,
      dpSumToEnd,
      dpSumPosInPeriod,
      dpSumNegInPeriod,
      cashSumBefore,
      cashSumToEnd,
      cashSumPosInPeriod,
      cashSumNegInPeriod,
      advanceSumBefore,
      advanceSumToEnd,
      advanceSumInPeriod,
      payoutSumBefore,
      payoutSumToEnd,
      payoutSumInPeriod,
    ] = await Promise.all([
      this.prisma.cashBookEntry.findFirst({
        where: { kind: CASH_ENTRY_KIND_OPENING },
        include: ENTRY_INCLUDE,
      }),
      this.prisma.moneyMovement.aggregate({
        where: { ...dpBalanceBase, ...(beforeFilter ?? {}) },
        _sum: { amount: true },
      }),
      this.prisma.moneyMovement.aggregate({
        where: { ...dpBalanceBase, ...(toEndFilter ?? {}) },
        _sum: { amount: true },
      }),
      this.prisma.moneyMovement.aggregate({
        where: { ...dpBalanceBase, ...(periodFilter ?? {}), amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.moneyMovement.aggregate({
        where: { ...dpBalanceBase, ...(periodFilter ?? {}), amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.aggregate({
        where: beforeFilter ?? {},
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.aggregate({
        where: toEndFilter ?? {},
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.aggregate({
        where: { kind: CASH_ENTRY_KIND_MANUAL, ...(periodFilter ?? {}), amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.cashBookEntry.aggregate({
        where: { kind: CASH_ENTRY_KIND_MANUAL, ...(periodFilter ?? {}), amount: { lt: 0 } },
        _sum: { amount: true },
      }),
      params.dateFrom
        ? this.prisma.$queryRaw<Array<{ sum: Prisma.Decimal | number }>>(
            Prisma.sql`SELECT COALESCE(SUM(a."amount"), 0) AS "sum"${advanceBalanceFrom} AND a."paidAt" < ${params.dateFrom}::date`,
          )
        : Promise.resolve([{ sum: 0 }]),
      params.dateTo
        ? this.prisma.$queryRaw<Array<{ sum: Prisma.Decimal | number }>>(
            Prisma.sql`SELECT COALESCE(SUM(a."amount"), 0) AS "sum"${advanceBalanceFrom} AND a."paidAt" <= ${params.dateTo}::date`,
          )
        : this.prisma.$queryRaw<Array<{ sum: Prisma.Decimal | number }>>(
            Prisma.sql`SELECT COALESCE(SUM(a."amount"), 0) AS "sum"${advanceBalanceFrom}`,
          ),
      this.prisma.$queryRaw<Array<{ sum: Prisma.Decimal | number }>>(
        Prisma.sql`SELECT COALESCE(SUM(a."amount"), 0) AS "sum"${advanceBalanceFrom}${
          params.dateFrom ? Prisma.sql` AND a."paidAt" >= ${params.dateFrom}::date` : Prisma.empty
        }${params.dateTo ? Prisma.sql` AND a."paidAt" <= ${params.dateTo}::date` : Prisma.empty}`,
      ),
      this.prisma.salaryPayout.aggregate({
        where: { ...payoutBalanceBase, ...(payoutBeforeFilter ?? {}) },
        _sum: { amount: true },
      }),
      this.prisma.salaryPayout.aggregate({
        where: { ...payoutBalanceBase, ...(payoutToEndFilter ?? {}) },
        _sum: { amount: true },
      }),
      this.prisma.salaryPayout.aggregate({
        where: { ...payoutBalanceBase, ...(payoutPeriodFilter ?? {}) },
        _sum: { amount: true },
      }),
    ]);

    // Начальный остаток внутри периода учитывается отдельной строкой, чтобы
    // сходилась арифметика: начало + нач. остаток + приход − расход = конец.
    const openingInPeriod =
      openingRow &&
      (!params.dateFrom || openingRow.paymentDate >= new Date(params.dateFrom)) &&
      (!params.dateTo || openingRow.paymentDate <= new Date(`${params.dateTo}T23:59:59.999`))
        ? Number(openingRow.amount)
        : 0;
    const balance: CashBookBalanceResult = {
      start:
        Number(dpSumBefore._sum.amount ?? 0) +
        Number(cashSumBefore._sum.amount ?? 0) -
        Number(advanceSumBefore[0]?.sum ?? 0) -
        Number(payoutSumBefore._sum.amount ?? 0),
      end:
        Number(dpSumToEnd._sum.amount ?? 0) +
        Number(cashSumToEnd._sum.amount ?? 0) -
        Number(advanceSumToEnd[0]?.sum ?? 0) -
        Number(payoutSumToEnd._sum.amount ?? 0),
      income:
        Number(dpSumPosInPeriod._sum.amount ?? 0) + Number(cashSumPosInPeriod._sum.amount ?? 0),
      expense:
        Math.abs(Number(dpSumNegInPeriod._sum.amount ?? 0)) +
        Math.abs(Number(cashSumNegInPeriod._sum.amount ?? 0)) +
        Number(advanceSumInPeriod[0]?.sum ?? 0) +
        Number(payoutSumInPeriod._sum.amount ?? 0),
      openingInPeriod,
    };
    return {
      balance,
      openingBalance: openingRow ? serializeOpeningBalance(openingRow) : null,
    };
  }
}
