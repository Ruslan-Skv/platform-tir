import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  ManagerSubstitutionPeriod,
  substituteManagerIdAt,
} from '../../common/utils/manager-substitutions.helper';
import { PrismaService } from '../../database/prisma.service';

/** Итоги личных продаж по менеджерам для детальной статистики ДП. */
export type ManagerSalesAgg = {
  manager: Array<{ managerId: string | null; sum: number }>;
  directionManager: Array<{ direction: string | null; managerId: string | null; sum: number }>;
  managerIds: Set<string | null>;
};

/** Подмена с участниками (для бейджей «подмена» и переатрибуции продаж). */
export type ManagerSubstitutionRow = Prisma.ManagerSubstitutionGetPayload<{
  include: typeof MANAGER_SUBSTITUTION_INCLUDE;
}>;

const MANAGER_SUBSTITUTION_INCLUDE = {
  absentManager: { select: { id: true, email: true, firstName: true, lastName: true } },
  substituteManager: { select: { id: true, email: true, firstName: true, lastName: true } },
} satisfies Prisma.ManagerSubstitutionInclude;

/**
 * Итоги личных продаж менеджеров журнала ДП для детальной статистики, с учётом
 * подмен (отпуск/больничный): в период подмены продажи договоров отсутствующего
 * менеджера засчитываются подменяющему — атрибуция зависит от даты платежа.
 */
@Injectable()
export class ManagerSalesStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Все подмены менеджеров с участниками. */
  async loadSubstitutions(): Promise<ManagerSubstitutionRow[]> {
    return this.prisma.managerSubstitution.findMany({
      include: MANAGER_SUBSTITUTION_INCLUDE,
      orderBy: { dateFrom: 'asc' },
    });
  }

  /** Периоды подмен (без имён участников) — для переатрибуции по датам. */
  static periodsOf(rows: ManagerSubstitutionRow[]): ManagerSubstitutionPeriod[] {
    return rows.map((s) => ({
      absentManagerId: s.absentManagerId,
      substituteManagerId: s.substituteManagerId,
      dateFrom: s.dateFrom,
      dateTo: s.dateTo,
    }));
  }

  /** Имена участников подмен: id → ФИО (отсутствующий и подменяющий). */
  static nameById(rows: ManagerSubstitutionRow[]): Map<string, string> {
    const name = (u: { email: string; firstName: string | null; lastName: string | null }) =>
      [u.lastName, u.firstName].filter(Boolean).join(' ').trim() || u.email;
    const map = new Map<string, string>();
    for (const s of rows) {
      map.set(s.absentManagerId, name(s.absentManager));
      map.set(s.substituteManagerId, name(s.substituteManager));
    }
    return map;
  }

  /** Итоги личных продаж по менеджерам: без подмен — группировка в БД; с подменами
   *  атрибуция зависит от даты платежа, поэтому агрегируем в коде. */
  async managerSalesSums(
    salesWhere: Prisma.MoneyMovementWhereInput,
    subPeriods: ManagerSubstitutionPeriod[] = [],
  ): Promise<ManagerSalesAgg> {
    return subPeriods.length > 0
      ? this.sumsWithSubstitutions(salesWhere, subPeriods)
      : this.sumsGroupedInDb(salesWhere);
  }

  /** Итоги личных продаж по менеджерам (без подмен) — группировка в БД. */
  private async sumsGroupedInDb(
    salesWhere: Prisma.MoneyMovementWhereInput,
  ): Promise<ManagerSalesAgg> {
    const [managerRows, directionManagerRows] = await Promise.all([
      this.prisma.moneyMovement.groupBy({
        by: ['managerId'],
        where: salesWhere,
        _sum: { amount: true },
      }),
      this.prisma.moneyMovement.groupBy({
        by: ['direction', 'managerId'],
        where: salesWhere,
        _sum: { amount: true },
      }),
    ]);
    return {
      manager: managerRows.map((row) => ({
        managerId: row.managerId,
        sum: Number(row._sum.amount ?? 0),
      })),
      directionManager: directionManagerRows.map((row) => ({
        direction: row.direction,
        managerId: row.managerId,
        sum: Number(row._sum.amount ?? 0),
      })),
      managerIds: new Set(managerRows.map((row) => row.managerId)),
    };
  }

  /** Итоги личных продаж по менеджерам с подменами: на дату платежа договоры
   *  отсутствующего менеджера засчитываются подменяющему. Копейки агрегируем
   *  целыми, чтобы не накапливать погрешность float. */
  private async sumsWithSubstitutions(
    salesWhere: Prisma.MoneyMovementWhereInput,
    subPeriods: ManagerSubstitutionPeriod[],
  ): Promise<ManagerSalesAgg> {
    const rows = await this.prisma.moneyMovement.findMany({
      where: salesWhere,
      select: { managerId: true, direction: true, amount: true, paymentDate: true },
    });
    const managerKopecks = new Map<string | null, number>();
    const directionKopecks = new Map<string, Map<string | null, number>>();
    for (const row of rows) {
      const effectiveId =
        substituteManagerIdAt(subPeriods, row.managerId, row.paymentDate) ?? row.managerId;
      const kopecks = Math.round(Number(row.amount) * 100);
      managerKopecks.set(effectiveId, (managerKopecks.get(effectiveId) ?? 0) + kopecks);
      const directionKey = row.direction ?? '';
      let byManager = directionKopecks.get(directionKey);
      if (!byManager) {
        byManager = new Map();
        directionKopecks.set(directionKey, byManager);
      }
      byManager.set(effectiveId, (byManager.get(effectiveId) ?? 0) + kopecks);
    }
    return {
      manager: [...managerKopecks.entries()].map(([managerId, kopecks]) => ({
        managerId,
        sum: kopecks / 100,
      })),
      directionManager: [...directionKopecks.entries()].flatMap(([direction, byManager]) =>
        [...byManager.entries()].map(([managerId, kopecks]) => ({
          direction: direction || null,
          managerId,
          sum: kopecks / 100,
        })),
      ),
      managerIds: new Set(managerKopecks.keys()),
    };
  }
}
