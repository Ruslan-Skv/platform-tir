import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

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
