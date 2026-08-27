import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateMarketingChannelDto } from './dto/create-marketing-channel.dto';
import { UpdateMarketingChannelDto } from './dto/update-marketing-channel.dto';
import { UpsertMarketingMetricDto } from './dto/upsert-marketing-metric.dto';
import { UpdateMarketingStrategyDto } from './dto/update-marketing-strategy.dto';
import { UpdateMarketingBudgetDto } from './dto/update-marketing-budget.dto';

const DEFAULT_STRATEGY = {
  title: 'Рекламная стратегия',
  summary:
    'Системное продвижение компании через платные и органические каналы: сбор «горячих» заявок, прогрев аудитории, долгосрочный SEO-трафик и рекомендации. Цель — стабильный поток новых клиентов и прозрачная статистика по каналам.',
  goals:
    '1. Обеспечить поток квалифицированных заявок из Яндекс.Директ.\n2. Выстроить доверие и портфолио через ВКонтакте (таргет + контент).\n3. Наращивать органический трафик (SEO) как долгосрочный канал.\n4. Подключить Авито / Юлу как дополнительный источник.\n5. Зафиксировать и усилить «сарафан» через систему рекомендаций.',
  notes:
    'Бюджет задаётся динамически: общий план и доли/суммы по каналам. Итоговый ориентир: ~90 000 ₽/мес.',
  monthlyBudgetTotal: 90000,
  monthlyBudgetNote: null as string | null,
};

const DEFAULT_CHANNELS: Array<{
  name: string;
  code: string;
  priority: number;
  monthlyBudget: number | null;
  role: string;
  description: string;
}> = [
  {
    name: 'Яндекс.Директ',
    code: 'yandex_direct',
    priority: 1,
    monthlyBudget: 50000,
    role: 'Сбор «горячих» заявок',
    description: 'Основной платный канал для привлечения готовых к покупке клиентов.',
  },
  {
    name: 'ВКонтакте (таргет + контент)',
    code: 'vk',
    priority: 2,
    monthlyBudget: 30000,
    role: 'Прогрев, доверие, портфолио',
    description: 'Таргетированная реклама и регулярный контент для прогрева аудитории.',
  },
  {
    name: 'SEO (органический трафик)',
    code: 'seo',
    priority: 3,
    monthlyBudget: null,
    role: 'Долгосрочный канал',
    description: 'Органический поиск — накопление трафика без прямого медиабюджета.',
  },
  {
    name: 'Авито / Юла',
    code: 'avito_youla',
    priority: 4,
    monthlyBudget: 10000,
    role: 'Дополнительный источник',
    description: 'Объявления и продвижение на площадках объявлений.',
  },
  {
    name: 'Рекомендации («сарафан»)',
    code: 'referrals',
    priority: 5,
    monthlyBudget: null,
    role: 'Бесплатно, но система нужна',
    description: 'Реферальная механика и учёт рекомендаций существующих клиентов.',
  },
];

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : parseFloat(value.toString());
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundShare(value: number): number {
  return Math.round(value * 100) / 100;
}

function shareOf(amount: number | null, base: number): number | null {
  if (amount === null || amount === undefined) return null;
  if (base <= 0) return amount > 0 ? null : 0;
  return roundShare((amount / base) * 100);
}

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  /** Гарантирует наличие стратегии и стартовых каналов. */
  async ensureDefaults() {
    let strategy = await this.prisma.marketingStrategy.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!strategy) {
      try {
        strategy = await this.prisma.marketingStrategy.create({ data: DEFAULT_STRATEGY });
      } catch {
        strategy = await this.prisma.marketingStrategy.findFirst({
          orderBy: { createdAt: 'asc' },
        });
      }
    }

    const channelCount = await this.prisma.marketingChannel.count();
    if (channelCount === 0) {
      try {
        await this.prisma.marketingChannel.createMany({
          data: DEFAULT_CHANNELS.map((ch) => ({
            name: ch.name,
            code: ch.code,
            priority: ch.priority,
            monthlyBudget: ch.monthlyBudget,
            role: ch.role,
            description: ch.description,
            isActive: true,
          })),
          skipDuplicates: true,
        });
      } catch {
        // параллельный seed — игнорируем
      }
    }

    // Если общий бюджет не задан — подставим сумму каналов
    if (strategy && decimalToNumber(strategy.monthlyBudgetTotal) == null) {
      const channels = await this.prisma.marketingChannel.findMany({
        where: { isActive: true, monthlyBudget: { not: null } },
        select: { monthlyBudget: true },
      });
      const sum = channels.reduce((s, c) => s + (decimalToNumber(c.monthlyBudget) ?? 0), 0);
      if (sum > 0) {
        strategy = await this.prisma.marketingStrategy.update({
          where: { id: strategy.id },
          data: { monthlyBudgetTotal: sum },
        });
      }
    }

    return strategy;
  }

  private async resolveTotalBudget(
    strategyTotal: number | null,
    channelBudgets: Array<number | null>,
  ): Promise<{ total: number; source: 'strategy' | 'channels' | 'none' }> {
    if (strategyTotal != null && strategyTotal > 0) {
      return { total: strategyTotal, source: 'strategy' };
    }
    const sum = channelBudgets.reduce<number>((s, b) => s + (b ?? 0), 0);
    if (sum > 0) return { total: sum, source: 'channels' };
    return { total: 0, source: 'none' };
  }

  private mapChannelWithShare<T extends { monthlyBudget: number | null }>(
    channel: T,
    total: number,
  ) {
    return {
      ...channel,
      budgetSharePercent: shareOf(channel.monthlyBudget, total),
    };
  }

  private async getStrategyTotal(): Promise<number | null> {
    const strategy = await this.prisma.marketingStrategy.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { monthlyBudgetTotal: true },
    });
    return decimalToNumber(strategy?.monthlyBudgetTotal);
  }

  private resolveChannelBudgetFromDto(
    dto: { monthlyBudget?: number | null; budgetSharePercent?: number | null },
    total: number | null,
  ): number | null | undefined {
    if (dto.monthlyBudget !== undefined) {
      return dto.monthlyBudget;
    }
    if (dto.budgetSharePercent !== undefined) {
      if (dto.budgetSharePercent === null) return null;
      if (total == null || total <= 0) {
        throw new BadRequestException(
          'Чтобы задать долю канала, сначала укажите общий бюджет стратегии',
        );
      }
      return roundMoney((total * dto.budgetSharePercent) / 100);
    }
    return undefined;
  }

  async getOverview(dateFrom?: string, dateTo?: string) {
    await this.ensureDefaults();

    const strategyRow = await this.prisma.marketingStrategy.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!strategyRow) {
      throw new NotFoundException('Стратегия не найдена');
    }

    const rawChannels = await this.prisma.marketingChannel.findMany({
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
    const channelBudgets = rawChannels.map((c) => decimalToNumber(c.monthlyBudget));
    const strategyTotal = decimalToNumber(strategyRow.monthlyBudgetTotal);
    const { total, source } = await this.resolveTotalBudget(strategyTotal, channelBudgets);

    const channels = rawChannels.map((row) =>
      this.mapChannelWithShare(
        {
          ...row,
          monthlyBudget: decimalToNumber(row.monthlyBudget),
        },
        total,
      ),
    );

    const stats = await this.getChannelStats(dateFrom, dateTo, total);
    const allocatedBudget = channels
      .filter((c) => c.isActive && c.monthlyBudget != null)
      .reduce((sum, c) => sum + (c.monthlyBudget ?? 0), 0);
    const unallocatedBudget = Math.max(0, roundMoney(total - allocatedBudget));

    const totals = stats.reduce(
      (acc, s) => ({
        visits: acc.visits + s.visits,
        leads: acc.leads + s.leads,
        orders: acc.orders + s.orders,
        revenue: acc.revenue + s.revenue,
        cost: acc.cost + s.cost,
      }),
      { visits: 0, leads: 0, orders: 0, revenue: 0, cost: 0 },
    );

    const strategy = {
      ...strategyRow,
      monthlyBudgetTotal: strategyTotal,
    };

    return {
      strategy,
      channels,
      stats,
      summary: {
        monthlyBudgetTotal: total,
        budgetSource: source,
        allocatedBudget,
        unallocatedBudget,
        allocatedSharePercent: total > 0 ? roundShare((allocatedBudget / total) * 100) : 0,
        activeChannels: channels.filter((c) => c.isActive).length,
        ...totals,
        roi:
          totals.cost > 0
            ? Number((((totals.revenue - totals.cost) / totals.cost) * 100).toFixed(2))
            : 0,
        conversionRate:
          totals.visits > 0 ? Number(((totals.orders / totals.visits) * 100).toFixed(2)) : 0,
        budgetUtilizationPercent:
          allocatedBudget > 0
            ? roundShare((totals.cost / allocatedBudget) * 100)
            : totals.cost > 0
              ? null
              : 0,
      },
    };
  }

  async getStrategy() {
    await this.ensureDefaults();
    const strategy = await this.prisma.marketingStrategy.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!strategy) {
      throw new NotFoundException('Стратегия не найдена');
    }
    return {
      ...strategy,
      monthlyBudgetTotal: decimalToNumber(strategy.monthlyBudgetTotal),
    };
  }

  async updateStrategy(dto: UpdateMarketingStrategyDto) {
    const current = await this.getStrategy();
    const updated = await this.prisma.marketingStrategy.update({
      where: { id: current.id },
      data: {
        title: dto.title,
        summary: dto.summary,
        goals: dto.goals,
        notes: dto.notes,
        monthlyBudgetTotal:
          dto.monthlyBudgetTotal === undefined ? undefined : dto.monthlyBudgetTotal,
        monthlyBudgetNote: dto.monthlyBudgetNote,
      },
    });
    return {
      ...updated,
      monthlyBudgetTotal: decimalToNumber(updated.monthlyBudgetTotal),
    };
  }

  async updateBudget(dto: UpdateMarketingBudgetDto) {
    const current = await this.getStrategy();
    const nextTotal =
      dto.monthlyBudgetTotal !== undefined ? dto.monthlyBudgetTotal : current.monthlyBudgetTotal;

    if (dto.channels?.length) {
      for (const item of dto.channels) {
        const budget = this.resolveChannelBudgetFromDto(item, nextTotal);
        if (budget === undefined && item.monthlyBudget === undefined) continue;
        await this.prisma.marketingChannel.update({
          where: { id: item.id },
          data: {
            monthlyBudget: budget === undefined ? item.monthlyBudget : budget,
          },
        });
      }
    }

    if (dto.monthlyBudgetTotal !== undefined || dto.monthlyBudgetNote !== undefined) {
      await this.prisma.marketingStrategy.update({
        where: { id: current.id },
        data: {
          monthlyBudgetTotal:
            dto.monthlyBudgetTotal === undefined ? undefined : dto.monthlyBudgetTotal,
          monthlyBudgetNote:
            dto.monthlyBudgetNote === undefined ? undefined : dto.monthlyBudgetNote,
        },
      });
    }

    return this.getOverview();
  }

  async findAllChannels() {
    await this.ensureDefaults();
    const rows = await this.prisma.marketingChannel.findMany({
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
    const strategyTotal = await this.getStrategyTotal();
    const budgets = rows.map((r) => decimalToNumber(r.monthlyBudget));
    const { total } = await this.resolveTotalBudget(strategyTotal, budgets);

    return rows.map((row) =>
      this.mapChannelWithShare(
        {
          ...row,
          monthlyBudget: decimalToNumber(row.monthlyBudget),
        },
        total,
      ),
    );
  }

  async findOneChannel(id: string) {
    const channel = await this.prisma.marketingChannel.findUnique({ where: { id } });
    if (!channel) {
      throw new NotFoundException(`Канал ${id} не найден`);
    }
    const strategyTotal = await this.getStrategyTotal();
    const budget = decimalToNumber(channel.monthlyBudget);
    const { total } = await this.resolveTotalBudget(strategyTotal, [budget]);
    return this.mapChannelWithShare({ ...channel, monthlyBudget: budget }, total);
  }

  async createChannel(dto: CreateMarketingChannelDto) {
    const total = await this.getStrategyTotal();
    const monthlyBudget = this.resolveChannelBudgetFromDto(dto, total);
    const created = await this.prisma.marketingChannel.create({
      data: {
        name: dto.name,
        code: dto.code,
        priority: dto.priority ?? 100,
        monthlyBudget: monthlyBudget === undefined ? null : monthlyBudget,
        role: dto.role ?? null,
        description: dto.description ?? null,
        isActive: dto.isActive ?? true,
      },
    });
    const budget = decimalToNumber(created.monthlyBudget);
    const { total: base } = await this.resolveTotalBudget(total, [budget]);
    return this.mapChannelWithShare({ ...created, monthlyBudget: budget }, base);
  }

  async updateChannel(id: string, dto: UpdateMarketingChannelDto) {
    await this.findOneChannel(id);
    const total = await this.getStrategyTotal();
    const monthlyBudget = this.resolveChannelBudgetFromDto(dto, total);

    const updated = await this.prisma.marketingChannel.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        priority: dto.priority,
        monthlyBudget: monthlyBudget === undefined ? undefined : monthlyBudget,
        role: dto.role,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
    const budget = decimalToNumber(updated.monthlyBudget);
    const { total: base } = await this.resolveTotalBudget(total, [budget]);
    return this.mapChannelWithShare({ ...updated, monthlyBudget: budget }, base);
  }

  async removeChannel(id: string) {
    await this.findOneChannel(id);
    await this.prisma.marketingChannel.delete({ where: { id } });
    return { ok: true };
  }

  async getChannelStats(dateFrom?: string, dateTo?: string, budgetTotal?: number) {
    const where: Prisma.MarketingMetricWhereInput = {};
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const channels = await this.prisma.marketingChannel.findMany({
      where: { isActive: true },
      include: { metrics: { where } },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });

    const strategyTotal =
      budgetTotal ??
      (
        await this.resolveTotalBudget(
          await this.getStrategyTotal(),
          channels.map((c) => decimalToNumber(c.monthlyBudget)),
        )
      ).total;

    return channels.map((channel) => {
      const monthlyBudget = decimalToNumber(channel.monthlyBudget);
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
        totals.cost > 0
          ? Number((((totals.revenue - totals.cost) / totals.cost) * 100).toFixed(2))
          : 0;
      const conversionRate =
        totals.visits > 0 ? Number(((totals.orders / totals.visits) * 100).toFixed(2)) : 0;
      const cpl = totals.leads > 0 ? Number((totals.cost / totals.leads).toFixed(2)) : 0;

      return {
        channel: {
          id: channel.id,
          name: channel.name,
          code: channel.code,
          priority: channel.priority,
          monthlyBudget,
          budgetSharePercent: shareOf(monthlyBudget, strategyTotal),
          role: channel.role,
        },
        ...totals,
        roi,
        conversionRate,
        cpl,
        plannedVsActual:
          monthlyBudget != null
            ? {
                planned: monthlyBudget,
                actual: totals.cost,
                delta: roundMoney(monthlyBudget - totals.cost),
                utilizationPercent:
                  monthlyBudget > 0 ? roundShare((totals.cost / monthlyBudget) * 100) : null,
              }
            : null,
      };
    });
  }

  async listMetrics(params: {
    channelId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const { channelId, dateFrom, dateTo, page = 1, limit = 50 } = params;
    const where: Prisma.MarketingMetricWhereInput = {};
    if (channelId) where.channelId = channelId;
    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom);
      if (dateTo) where.date.lte = new Date(dateTo);
    }

    const [rows, total] = await Promise.all([
      this.prisma.marketingMetric.findMany({
        where,
        include: {
          channel: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.marketingMetric.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        ...r,
        revenue: parseFloat(r.revenue.toString()),
        cost: parseFloat(r.cost.toString()),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async upsertMetric(dto: UpsertMarketingMetricDto) {
    await this.findOneChannel(dto.channelId);
    const date = new Date(dto.date);

    const metric = await this.prisma.marketingMetric.upsert({
      where: {
        channelId_date: {
          channelId: dto.channelId,
          date,
        },
      },
      create: {
        channelId: dto.channelId,
        date,
        visits: dto.visits ?? 0,
        leads: dto.leads ?? 0,
        orders: dto.orders ?? 0,
        revenue: dto.revenue ?? 0,
        cost: dto.cost ?? 0,
      },
      update: {
        visits: dto.visits,
        leads: dto.leads,
        orders: dto.orders,
        revenue: dto.revenue,
        cost: dto.cost,
      },
      include: {
        channel: { select: { id: true, name: true, code: true } },
      },
    });

    return {
      ...metric,
      revenue: parseFloat(metric.revenue.toString()),
      cost: parseFloat(metric.cost.toString()),
    };
  }

  async removeMetric(id: string) {
    const existing = await this.prisma.marketingMetric.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Метрика ${id} не найдена`);
    }
    await this.prisma.marketingMetric.delete({ where: { id } });
    return { ok: true };
  }
}
