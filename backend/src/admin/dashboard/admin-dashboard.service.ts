import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DP_MANUAL_DIRECTION_OTHER } from '../../common/config/package-direction-registry.config';
import { PrismaService } from '../../database/prisma.service';

export interface CatalogActivityRow {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** Создано за выбранный период */
  countInPeriod: number;
  /** Всего за всё время (по полю создателя) */
  totalCreated: number;
}

export interface CatalogActivityResponse {
  from: string;
  to: string;
  products: CatalogActivityRow[];
  categories: CatalogActivityRow[];
}

export interface DashboardSalesMonthResponse {
  periodFrom: string;
  periodTo: string;
  /** Сумма оплат за месяц (наличные/безнал, минус возвраты и изъятия). */
  totalSum: number;
  directionSums: { direction: string | null; sum: number }[];
  managerSums: { managerId: string | null; name: string; sum: number }[];
}

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Продажи за текущий месяц — те же итоги, что в блоке итогов журнала ДП
   * (/admin/dp): сумма оплат по журналам денежных движений, разбивка по
   * направлениям и по менеджерам (карточка менеджера договора).
   * Записи «Прочее» — движения ДС вне продаж, в продажи не входят.
   */
  async getSalesMonth(): Promise<DashboardSalesMonthResponse> {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const where: Prisma.MoneyMovementWhereInput = {
      paymentDate: { gte: from, lt: to },
      direction: { not: DP_MANUAL_DIRECTION_OTHER },
    };

    const [total, byDirection, byManager] = await Promise.all([
      this.prisma.moneyMovement.aggregate({ where, _sum: { amount: true } }),
      this.prisma.moneyMovement.groupBy({ by: ['direction'], where, _sum: { amount: true } }),
      this.prisma.moneyMovement.groupBy({ by: ['managerId'], where, _sum: { amount: true } }),
    ]);

    // Менеджер движения может быть не из справочника карточек — берём имена из users.
    const managerIds = [
      ...new Set(byManager.map((row) => row.managerId).filter((id): id is string => Boolean(id))),
    ];
    const users = managerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: managerIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];
    const nameById = new Map(
      users.map((u) => [
        u.id,
        [u.lastName, u.firstName].filter(Boolean).join(' ').trim() || u.email,
      ]),
    );

    const directionSums = byDirection
      .map((row) => ({ direction: row.direction, sum: Number(row._sum.amount ?? 0) }))
      .sort((a, b) => b.sum - a.sum);
    const managerSums = byManager
      .map((row) => ({
        managerId: row.managerId,
        name: row.managerId
          ? (nameById.get(row.managerId) ?? 'Неизвестный менеджер')
          : 'Без менеджера',
        sum: Number(row._sum.amount ?? 0),
      }))
      .sort((a, b) => b.sum - a.sum);

    return {
      periodFrom: from.toISOString(),
      periodTo: to.toISOString(),
      totalSum: Number(total._sum.amount ?? 0),
      directionSums,
      managerSums,
    };
  }

  async getCatalogActivity(from: Date, to: Date): Promise<CatalogActivityResponse> {
    const [productInPeriod, productTotal, categoryInPeriod, categoryTotal] = await Promise.all([
      this.prisma.product.groupBy({
        by: ['createdById'],
        where: {
          createdById: { not: null },
          createdAt: { gte: from, lte: to },
        },
        _count: { _all: true },
      }),
      this.prisma.product.groupBy({
        by: ['createdById'],
        where: { createdById: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.category.groupBy({
        by: ['createdById'],
        where: {
          createdById: { not: null },
          createdAt: { gte: from, lte: to },
        },
        _count: { _all: true },
      }),
      this.prisma.category.groupBy({
        by: ['createdById'],
        where: { createdById: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const products = await this.buildRows(productInPeriod, productTotal);
    const categories = await this.buildRows(categoryInPeriod, categoryTotal);

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      products,
      categories,
    };
  }

  private async buildRows(
    inPeriod: { createdById: string | null; _count: { _all: number } }[],
    totalAll: { createdById: string | null; _count: { _all: number } }[],
  ): Promise<CatalogActivityRow[]> {
    const periodMap = new Map<string, number>();
    for (const row of inPeriod) {
      if (row.createdById) periodMap.set(row.createdById, row._count._all);
    }
    const totalMap = new Map<string, number>();
    for (const row of totalAll) {
      if (row.createdById) totalMap.set(row.createdById, row._count._all);
    }
    const userIds = [...new Set([...periodMap.keys(), ...totalMap.keys()])];
    if (userIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const rows: CatalogActivityRow[] = userIds.map((userId) => {
      const u = userById.get(userId);
      return {
        userId,
        email: u?.email ?? '',
        firstName: u?.firstName ?? null,
        lastName: u?.lastName ?? null,
        countInPeriod: periodMap.get(userId) ?? 0,
        totalCreated: totalMap.get(userId) ?? 0,
      };
    });

    rows.sort((a, b) => {
      if (b.countInPeriod !== a.countInPeriod) return b.countInPeriod - a.countInPeriod;
      return b.totalCreated - a.totalCreated;
    });

    return rows;
  }
}
