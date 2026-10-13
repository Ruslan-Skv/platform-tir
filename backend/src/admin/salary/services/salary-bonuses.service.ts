import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { DP_MANUAL_DIRECTION_OTHER } from '../../../common/config/package-direction-registry.config';
import { DEFAULT_CASH_QR_BONUS_PERCENT, round2, toNum } from '../salary.constants';

/** Премия за место по итогам продаж за завершённый месяц (журнал ДП). */
export type SalesPlaceBonus = {
  userId: string;
  userName: string | null;
  month: string;
  place: number;
  salesAmount: number;
  amount: number;
};

/** Премия за достижение порога плана продаж (% от з/п менеджера по договорам). */
export type SalesPlanBonus = {
  userId: string;
  userName: string | null;
  month: string;
  salesAmount: number;
  reachedTiers: number;
  percent: number;
  baseAmount: number;
  amount: number;
};

/** Премия «QR + Н»: терминал < 50% продаж → процент от остальных продаж. */
export type CashQrBonus = {
  userId: string;
  userName: string | null;
  month: string;
  totalSales: number;
  terminalSales: number;
  otherSales: number;
  terminalShare: number;
  amount: number;
};

/** Настройки премий, снятые со строки глобальных параметров. */
export type BonusSettings = {
  salesBonusFirstPlace?: Prisma.Decimal | null;
  salesBonusSecondPlace?: Prisma.Decimal | null;
  salesBonusThirdPlace?: Prisma.Decimal | null;
  salesBonusMinSales?: Prisma.Decimal | null;
  cashQrBonusEnforced?: boolean;
  cashQrBonusPercent?: Prisma.Decimal | null;
};

/** Строка расчёта по договору — источник з/п менеджера для премии за план. */
type ContractRowForPlan = {
  managerId: string | null;
  signedAt: string | null;
  closedAt: string | null;
  extraBills: Array<{ date: string | null; amount: number }>;
  parts: { sign: number; close: number };
  percents: { manager: number };
};

/**
 * Премии менеджеров по итогам продаж за полностью завершённые месяцы периода:
 *  - за призовые места (1–3) по объёму продаж месяца — фикс из настроек,
 *    только при продажах не ниже минимального уровня;
 *  - за достижение порогов плана продаж — % от з/п менеджера по договорам
 *    за месяц (без оклада и других премий), по самому высокому порогу;
 *  - «QR + Н» — если терминал даёт менее 50% продаж месяца, установленный
 *    в настройках процент от остальных.
 */
@Injectable()
export class SalaryBonusesService {
  constructor(private prisma: PrismaService) {}

  async calculate(input: {
    from: Date;
    to: Date;
    todayUtc: number;
    settings: BonusSettings | null;
    /** Строки расчёта по договорам за период (база премии за план). */
    rows: ContractRowForPlan[];
    employeeId?: string;
  }): Promise<{
    salesBonuses: SalesPlaceBonus[];
    salesBonusesTotal: number;
    salesPlanBonuses: SalesPlanBonus[];
    salesPlanBonusesTotal: number;
    cashQrBonuses: CashQrBonus[];
    cashQrBonusesTotal: number;
  }> {
    const { from, to, todayUtc, rows, employeeId } = input;
    const settings = input.settings ?? {};

    // --- Премии за места по итогам продаж (журнал ДП). ---

    const bonusByPlace = [
      toNum(settings.salesBonusFirstPlace ?? 0),
      toNum(settings.salesBonusSecondPlace ?? 0),
      toNum(settings.salesBonusThirdPlace ?? 0),
    ];
    const bonusMinSales = toNum(settings.salesBonusMinSales ?? 0);
    const salesBonuses: SalesPlaceBonus[] = [];
    if (bonusByPlace.some((b) => b > 0)) {
      for (const { monthStart } of this.completedMonths(from, to, todayUtc)) {
        const ranked = (await this.monthSalesByManager(monthStart))
          .filter((row) => row.salesAmount > 0 && row.salesAmount >= bonusMinSales)
          .sort((a, b) => b.salesAmount - a.salesAmount);
        const winners = ranked.slice(0, 3);
        const nameById = await this.userNames(winners.map((w) => w.userId));
        winners.forEach((winner, index) => {
          const amount = bonusByPlace[index] ?? 0;
          if (amount <= 0) return;
          if (employeeId && winner.userId !== employeeId) return;
          salesBonuses.push({
            userId: winner.userId,
            userName: nameById.get(winner.userId) ?? null,
            month: this.monthKey(monthStart),
            place: index + 1,
            salesAmount: round2(winner.salesAmount),
            amount: round2(amount),
          });
        });
      }
    }
    const salesBonusesTotal = round2(salesBonuses.reduce((sum, b) => sum + b.amount, 0));

    // --- Премии за выполнение плана продаж: порог объёма за месяц → % от з/п
    // менеджера по договорам за этот месяц. Планы устанавливаются индивидуально
    // на каждого менеджера. Проценты порогов не суммируются — премия считается
    // по самому высокому достигнутому порогу. ---

    const planRows = await this.prisma.salaryManagerSalesPlan.findMany();
    const planTiersByUser = new Map<string, Array<{ threshold: number; percent: number }>>();
    for (const plan of planRows) {
      const tiers = [
        { threshold: toNum(plan.threshold1), percent: toNum(plan.percent1) },
        { threshold: toNum(plan.threshold2), percent: toNum(plan.percent2) },
        { threshold: toNum(plan.threshold3), percent: toNum(plan.percent3) },
      ].filter((tier) => tier.threshold > 0 && tier.percent > 0);
      if (tiers.length > 0) planTiersByUser.set(plan.userId, tiers);
    }
    const salesPlanBonuses: SalesPlanBonus[] = [];
    if (planTiersByUser.size > 0) {
      // З/п менеджеров по договорам в разрезе месяцев: доли при заключении/закрытии
      // и доп. соглашения относятся к месяцам своих дат.
      const monthOf = (iso: string | null) => (iso ? iso.slice(0, 7) : null);
      const managerPartsByMonth = new Map<string, number>();
      for (const row of rows) {
        if (!row.managerId) continue;
        const add = (iso: string | null, value: number) => {
          const key = monthOf(iso);
          if (!key || value === 0) return;
          const mapKey = `${row.managerId}|${key}`;
          managerPartsByMonth.set(mapKey, round2((managerPartsByMonth.get(mapKey) ?? 0) + value));
        };
        add(row.signedAt, row.parts.sign);
        add(row.closedAt, row.parts.close);
        for (const bill of row.extraBills) {
          add(bill.date, round2(bill.amount * (row.percents.manager / 100)));
        }
      }

      for (const { monthStart } of this.completedMonths(from, to, todayUtc)) {
        const monthKeyStr = this.monthKey(monthStart);
        const monthManagers = await this.monthSalesByManager(monthStart);
        const nameById = await this.userNames(monthManagers.map((c) => c.userId));
        for (const candidate of monthManagers) {
          const planTiers = planTiersByUser.get(candidate.userId);
          if (!planTiers) continue;
          if (employeeId && candidate.userId !== employeeId) continue;
          const reached = planTiers.filter((tier) => candidate.salesAmount >= tier.threshold);
          if (reached.length === 0) continue;
          const baseAmount = managerPartsByMonth.get(`${candidate.userId}|${monthKeyStr}`) ?? 0;
          if (baseAmount <= 0) continue;
          const percent = reached[reached.length - 1].percent;
          salesPlanBonuses.push({
            userId: candidate.userId,
            userName: nameById.get(candidate.userId) ?? null,
            month: monthKeyStr,
            salesAmount: round2(candidate.salesAmount),
            reachedTiers: reached.length,
            percent,
            baseAmount,
            amount: round2((baseAmount * percent) / 100),
          });
        }
      }
    }
    const salesPlanBonusesTotal = round2(salesPlanBonuses.reduce((sum, b) => sum + b.amount, 0));

    // --- Премия «QR + Н»: терминал < 50% продаж месяца → установленный
    // в настройках процент от остальных (не через терминал: наличные, QR,
    // счёт, перевод на ЛК, банк-приложение). ---

    const cashQrPercent = toNum(settings.cashQrBonusPercent ?? DEFAULT_CASH_QR_BONUS_PERCENT);
    const cashQrBonuses: CashQrBonus[] = [];
    if (settings.cashQrBonusEnforced !== false && cashQrPercent > 0) {
      for (const { monthStart } of this.completedMonths(from, to, todayUtc)) {
        const formSums = await this.prisma.moneyMovement.groupBy({
          by: ['managerId', 'paymentForm'],
          where: {
            deletedAt: null,
            managerId: { not: null },
            paymentDate: {
              gte: monthStart,
              lte: new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)),
            },
            direction: { not: DP_MANUAL_DIRECTION_OTHER },
          },
          _sum: { amount: true },
        });
        const totals = new Map<string, { total: number; terminal: number }>();
        for (const row of formSums) {
          const userId = row.managerId as string;
          const agg = totals.get(userId) ?? { total: 0, terminal: 0 };
          const amount = toNum(row._sum.amount ?? 0);
          agg.total += amount;
          if (row.paymentForm === 'TERMINAL') agg.terminal += amount;
          totals.set(userId, agg);
        }
        const winners = [...totals.entries()].filter(
          ([, v]) => v.total > 0 && v.terminal < v.total * 0.5,
        );
        const nameById = await this.userNames(winners.map(([id]) => id));
        for (const [userId, v] of winners) {
          if (employeeId && userId !== employeeId) continue;
          const otherSales = round2(v.total - v.terminal);
          const amount = round2((otherSales * cashQrPercent) / 100);
          if (amount <= 0) continue;
          cashQrBonuses.push({
            userId,
            userName: nameById.get(userId) ?? null,
            month: this.monthKey(monthStart),
            totalSales: round2(v.total),
            terminalSales: round2(v.terminal),
            otherSales,
            terminalShare: round2((v.terminal / v.total) * 100),
            amount,
          });
        }
      }
    }
    const cashQrBonusesTotal = round2(cashQrBonuses.reduce((sum, b) => sum + b.amount, 0));

    return {
      salesBonuses,
      salesBonusesTotal,
      salesPlanBonuses,
      salesPlanBonusesTotal,
      cashQrBonuses,
      cashQrBonusesTotal,
    };
  }

  /** Первые дни полностью завершённых месяцев, пересекающихся с периодом. */
  private *completedMonths(from: Date, to: Date, todayUtc: number) {
    const month = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const periodEnd = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    while (month.getTime() <= periodEnd) {
      const monthStart = new Date(month);
      const monthEnd = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
      // Премия начисляется сразу после завершения месяца: текущий месяц не участвует.
      if (monthEnd.getTime() < todayUtc) yield { monthStart, monthEnd };
      month.setUTCMonth(month.getUTCMonth() + 1);
    }
  }

  /** Продажи менеджеров за месяц по журналу ДП (без «Прочего» и удалённых). */
  private async monthSalesByManager(monthStart: Date, monthEnd?: Date) {
    const end =
      monthEnd ?? new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
    const monthSums = await this.prisma.moneyMovement.groupBy({
      by: ['managerId'],
      where: {
        deletedAt: null,
        managerId: { not: null },
        paymentDate: { gte: monthStart, lte: end },
        direction: { not: DP_MANUAL_DIRECTION_OTHER },
      },
      _sum: { amount: true },
    });
    return monthSums.map((row) => ({
      userId: row.managerId as string,
      salesAmount: toNum(row._sum.amount ?? 0),
    }));
  }

  /** id → ФИО по списку пользователей. */
  private async userNames(userIds: string[]) {
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    return new Map(
      users.map((u) => [u.id, [u.lastName, u.firstName].filter(Boolean).join(' ').trim() || null]),
    );
  }

  private monthKey(monthStart: Date): string {
    return `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}
