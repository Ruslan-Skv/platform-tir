import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // Sales Analytics
  async getSalesOverview(dateFrom?: string, dateTo?: string) {
    const where: Prisma.OrderWhereInput = {
      paymentStatus: 'PAID',
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [totalRevenue, totalOrders, avgOrderValue, totalProducts] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _sum: { total: true },
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where,
        _avg: { total: true },
      }),
      this.prisma.orderItem.aggregate({
        where: { order: where },
        _sum: { quantity: true },
      }),
    ]);

    return {
      totalRevenue: totalRevenue._sum.total || 0,
      totalOrders,
      avgOrderValue: avgOrderValue._avg.total || 0,
      totalProductsSold: totalProducts._sum.quantity || 0,
    };
  }

  async getSalesByPeriod(
    period: 'day' | 'week' | 'month' = 'day',
    dateFrom?: string,
    dateTo?: string,
  ) {
    const startDate = dateFrom
      ? new Date(dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = dateTo ? new Date(dateTo) : new Date();

    // Raw SQL for date grouping
    let dateFormat: string;
    switch (period) {
      case 'week':
        dateFormat = 'YYYY-WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const sales = await this.prisma.$queryRaw<{ date: string; revenue: number; orders: number }[]>`
      SELECT 
        TO_CHAR("createdAt", ${dateFormat}) as date,
        SUM(total) as revenue,
        COUNT(*) as orders
      FROM orders
      WHERE "paymentStatus" = 'PAID'
        AND "createdAt" >= ${startDate}
        AND "createdAt" <= ${endDate}
      GROUP BY TO_CHAR("createdAt", ${dateFormat})
      ORDER BY date ASC
    `;

    return sales;
  }

  async getTopProducts(limit = 10, dateFrom?: string, dateTo?: string) {
    const where: Prisma.OrderItemWhereInput = {
      order: {
        paymentStatus: 'PAID',
      },
    };

    if (dateFrom || dateTo) {
      const orderWhere = where.order as Prisma.OrderWhereInput;
      const createdAt: Prisma.DateTimeFilter = {};
      if (dateFrom) {
        createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        createdAt.lte = new Date(dateTo);
      }
      where.order = {
        ...orderWhere,
        createdAt,
      };
    }

    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where,
      _sum: {
        quantity: true,
        price: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        sku: true,
        images: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return topProducts.map((item) => ({
      product: productMap.get(item.productId),
      quantity: item._sum.quantity,
      revenue: item._sum.price,
    }));
  }

  async getTopCategories(limit = 10, dateFrom?: string, dateTo?: string) {
    // Note: where variable is kept for reference but raw SQL is used below
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _where: Prisma.OrderItemWhereInput = {
      order: {
        paymentStatus: 'PAID',
      },
    };

    const categories = await this.prisma.$queryRaw<
      { categoryId: string; name: string; revenue: number; orders: number }[]
    >`
      SELECT 
        c.id as "categoryId",
        c.name,
        SUM(oi.price * oi.quantity) as revenue,
        COUNT(DISTINCT o.id) as orders
      FROM order_items oi
      JOIN products p ON oi."productId" = p.id
      JOIN categories c ON p."categoryId" = c.id
      JOIN orders o ON oi."orderId" = o.id
      WHERE o."paymentStatus" = 'PAID'
        ${dateFrom ? Prisma.sql`AND o."createdAt" >= ${new Date(dateFrom)}` : Prisma.empty}
        ${dateTo ? Prisma.sql`AND o."createdAt" <= ${new Date(dateTo)}` : Prisma.empty}
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;

    return categories;
  }

  // Customer Analytics
  async getCustomerStats(dateFrom?: string, dateTo?: string) {
    const where: Prisma.CustomerWhereInput = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [totalCustomers, newCustomers, byStatus, bySource] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where }),
      this.prisma.customer.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.customer.groupBy({
        by: ['source'],
        _count: true,
      }),
    ]);

    return {
      totalCustomers,
      newCustomers,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      bySource: bySource.map((s) => ({
        source: s.source,
        count: s._count,
      })),
    };
  }

  // Manager KPIs
  async getManagerKPIs(managerId?: string, dateFrom?: string, dateTo?: string) {
    const dateRange: { gte?: Date; lte?: Date } = {};
    if (dateFrom) {
      dateRange.gte = new Date(dateFrom);
    }
    if (dateTo) {
      dateRange.lte = new Date(dateTo);
    }
    const hasDateFilter = dateFrom || dateTo;

    const managers = managerId
      ? [{ id: managerId }]
      : await this.prisma.user.findMany({
          where: { role: { in: ['MANAGER', 'ADMIN'] } },
          select: { id: true, firstName: true, lastName: true, email: true },
        });

    const kpis = await Promise.all(
      managers.map(async (manager) => {
        const [customersAssigned, customersWon, dealsValue, tasksCompleted, tasksPending] =
          await Promise.all([
            this.prisma.customer.count({
              where: { managerId: manager.id },
            }),
            this.prisma.customer.count({
              where: { managerId: manager.id, stage: 'WON' },
            }),
            this.prisma.customer.aggregate({
              where: {
                managerId: manager.id,
                stage: 'WON',
                ...(hasDateFilter ? { createdAt: dateRange } : {}),
              },
              _sum: { dealValue: true },
            }),
            this.prisma.task.count({
              where: {
                assigneeId: manager.id,
                status: 'COMPLETED',
                ...(hasDateFilter ? { createdAt: dateRange } : {}),
              },
            }),
            this.prisma.task.count({
              where: {
                assigneeId: manager.id,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
              },
            }),
          ]);

        const conversionRate =
          customersAssigned > 0 ? ((customersWon / customersAssigned) * 100).toFixed(2) : 0;

        return {
          manager,
          customersAssigned,
          customersWon,
          conversionRate: parseFloat(conversionRate as string),
          totalDealsValue: dealsValue._sum?.dealValue || 0,
          tasksCompleted,
          tasksPending,
        };
      }),
    );

    return managerId ? kpis[0] : kpis;
  }

  // Marketing Channel Analytics
  async getMarketingStats(dateFrom?: string, dateTo?: string) {
    const where: Prisma.MarketingMetricWhereInput = {};

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) {
        where.date.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.date.lte = new Date(dateTo);
      }
    }

    const channels = await this.prisma.marketingChannel.findMany({
      where: { isActive: true },
      include: {
        metrics: {
          where,
        },
      },
    });

    return channels.map((channel) => {
      const totals = channel.metrics.reduce(
        (acc, m) => ({
          visits: acc.visits + m.visits,
          leads: acc.leads + m.leads,
          orders: acc.orders + m.orders,
          revenue: acc.revenue + parseFloat(m.revenue.toString()),
          cost: acc.cost + parseFloat(m.cost.toString()),
        }),
        { visits: 0, leads: 0, orders: 0, revenue: 0, cost: 0 },
      );

      const roi =
        totals.cost > 0 ? (((totals.revenue - totals.cost) / totals.cost) * 100).toFixed(2) : 0;
      const conversionRate =
        totals.visits > 0 ? ((totals.orders / totals.visits) * 100).toFixed(2) : 0;

      return {
        channel: {
          id: channel.id,
          name: channel.name,
          code: channel.code,
        },
        ...totals,
        roi: parseFloat(roi as string),
        conversionRate: parseFloat(conversionRate as string),
      };
    });
  }

  // Financial Report
  async getFinancialReport(dateFrom?: string, dateTo?: string) {
    const where: Prisma.OrderWhereInput = {
      paymentStatus: 'PAID',
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [grossRevenue, refunds, shipping, taxes] = await Promise.all([
      this.prisma.order.aggregate({
        where,
        _sum: { total: true, subtotal: true },
      }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'REFUNDED' },
        _sum: { refundAmount: true },
      }),
      this.prisma.order.aggregate({
        where,
        _sum: { shippingCost: true },
      }),
      this.prisma.order.aggregate({
        where,
        _sum: { tax: true },
      }),
    ]);

    const totalRevenue = parseFloat(grossRevenue._sum.total?.toString() || '0');
    const totalRefunds = parseFloat(refunds._sum.refundAmount?.toString() || '0');
    const netRevenue = totalRevenue - totalRefunds;

    return {
      grossRevenue: totalRevenue,
      subtotal: parseFloat(grossRevenue._sum.subtotal?.toString() || '0'),
      refunds: totalRefunds,
      netRevenue,
      shipping: parseFloat(shipping._sum.shippingCost?.toString() || '0'),
      taxes: parseFloat(taxes._sum.tax?.toString() || '0'),
    };
  }

  // Dashboard Summary
  async getDashboardSummary() {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todayOrders,
      weekOrders,
      monthOrders,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      pendingOrders,
      lowStockProducts,
      pendingTasks,
      newCustomers,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: startOfToday } },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: startOfWeek } },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: startOfToday }, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: startOfWeek }, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: startOfMonth }, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      }),
      this.prisma.product.count({
        where: { stock: { lte: 10 }, isActive: true },
      }),
      this.prisma.task.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
      this.prisma.customer.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      orders: {
        today: todayOrders,
        week: weekOrders,
        month: monthOrders,
        pending: pendingOrders,
      },
      revenue: {
        today: todayRevenue._sum.total || 0,
        week: weekRevenue._sum.total || 0,
        month: monthRevenue._sum.total || 0,
      },
      alerts: {
        lowStockProducts,
        pendingTasks,
      },
      customers: {
        newThisMonth: newCustomers,
      },
    };
  }
}
