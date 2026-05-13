import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { ContractsService } from '../contracts/contracts.service';
import { Prisma } from '@prisma/client';

function digitsPhone(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '');
}

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private contractsService: ContractsService,
  ) {}

  /** Уникальный служебный e-mail для карточек без почты (запись на замер и т.п.). */
  private async allocatePlaceholderEmail(): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = `client-no-email-${randomBytes(10).toString('hex')}@placeholder.local`;
      const taken = await this.prisma.customer.findUnique({
        where: { email: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    throw new BadRequestException('Не удалось выделить уникальный служебный e-mail');
  }

  /** Нормализует телефоны: порядок как в `phones`, затем одиночный `phone` без дублей; `phone` в БД = первый номер. */
  private normalizeCustomerPhones(params: { phone?: string | null; phones?: string[] | null }): {
    phone: string | null;
    phones: string[];
  } {
    if (params.phone === null && params.phones === undefined) {
      return { phone: null, phones: [] };
    }
    const out: string[] = [];
    const add = (s: string | null | undefined) => {
      const t = (s ?? '').trim();
      if (t && !out.includes(t)) out.push(t);
    };
    if (params.phones != null) {
      for (const p of params.phones) add(p);
    }
    if (params.phone !== undefined && params.phone !== null) {
      add(params.phone);
    }
    return { phone: out[0] ?? null, phones: out };
  }

  async create(createCustomerDto: CreateCustomerDto) {
    const { extendedProfile, dealValue, nextFollowUp, phone, phones, email, ...rest } =
      createCustomerDto;
    const emailResolved =
      email != null && String(email).trim() !== ''
        ? String(email).trim()
        : await this.allocatePlaceholderEmail();
    const { phone: primary, phones: list } = this.normalizeCustomerPhones({ phone, phones });
    return this.prisma.customer.create({
      data: {
        ...rest,
        email: emailResolved,
        phone: primary,
        phones: list,
        dealValue: dealValue != null ? new Prisma.Decimal(dealValue) : null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
        extendedProfile:
          extendedProfile != null ? (extendedProfile as Prisma.InputJsonValue) : undefined,
      },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(params?: {
    status?: string;
    stage?: string;
    managerId?: string;
    search?: string;
    /** PERSON | COMPANY | ENTREPRENEUR — колонка `entity_type` */
    entityType?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, stage, managerId, search, entityType, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumCustomerStatusFilter;
    }

    if (stage) {
      where.stage = stage as
        | 'NEW'
        | 'CONTACTED'
        | 'QUALIFIED'
        | 'PROPOSAL'
        | 'NEGOTIATION'
        | 'WON'
        | 'LOST';
    }

    if (managerId) {
      where.managerId = managerId;
    }

    if (entityType && ['PERSON', 'COMPANY', 'ENTREPRENEUR'].includes(entityType)) {
      where.entityType = entityType;
    }

    if (search) {
      const t = search.trim();
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { phones: { has: t } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          manager: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              interactions: true,
              tasks: true,
              deals: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Единый справочник: карточки клиентов + заказчики только по договорам (без `customer_id`),
   * если их телефон не совпадает с уже заведённой карточкой.
   */
  async findClientDirectory(params?: {
    search?: string;
    entityType?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page ?? 1;
    const limit = Math.min(Math.max(params?.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const entityType =
      params?.entityType && ['PERSON', 'COMPANY', 'ENTREPRENEUR'].includes(params.entityType)
        ? params.entityType
        : undefined;

    const where: Prisma.CustomerWhereInput = {};
    if (entityType) {
      where.entityType = entityType;
    }
    if (params?.search?.trim()) {
      const search = params.search.trim();
      const t = search;
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { phones: { has: t } },
      ];
    }

    const FETCH_CAP = 5000;
    const dbCustomers = await this.prisma.customer.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: FETCH_CAP,
    });

    const digitSet = new Set<string>();
    for (const c of dbCustomers) {
      const d = digitsPhone(c.phone);
      if (d.length >= 10) digitSet.add(d);
      for (const p of c.phones ?? []) {
        const pd = digitsPhone(p);
        if (pd.length >= 10) digitSet.add(pd);
      }
    }

    type ContractParty = Awaited<
      ReturnType<ContractsService['getCustomersFromContracts']>
    >['customers'][number];

    let orphanParties: ContractParty[] = [];
    if (!entityType) {
      const { customers: contractParties } = await this.contractsService.getCustomersFromContracts(
        params?.search,
      );
      orphanParties = contractParties.filter((x) => !x.customerId);
      orphanParties = orphanParties.filter((o) => {
        const d = digitsPhone(o.customerPhone);
        if (d.length >= 10 && digitSet.has(d)) return false;
        return true;
      });
    }

    type Merged = { sort: string; row: Record<string, unknown> };
    const merged: Merged[] = [];

    for (const c of dbCustomers) {
      const row = this.serializeCustomerDirectoryRow(c);
      merged.push({ sort: String(row['displayName'] ?? '').toLowerCase(), row });
    }
    for (const o of orphanParties) {
      const row = this.serializeContractOnlyDirectoryRow(o);
      merged.push({ sort: String(row['displayName'] ?? '').toLowerCase(), row });
    }

    merged.sort((a, b) => a.sort.localeCompare(b.sort, 'ru'));
    const total = merged.length;
    const slice = merged.slice(skip, skip + limit);
    return {
      data: slice.map((m) => m.row),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private serializeCustomerDirectoryRow(
    c: Prisma.CustomerGetPayload<{
      include: {
        manager: { select: { id: true; email: true; firstName: true; lastName: true } };
      };
    }>,
  ): Record<string, unknown> {
    const parts = [c.firstName, c.lastName].map((x) => (x ?? '').trim()).filter(Boolean);
    const displayName =
      parts.length > 0 ? parts.join(' ') : (c.company ?? '').trim() || c.email || c.id;
    return {
      rowSource: 'customer',
      id: c.id,
      displayName,
      email: c.email,
      phone: c.phone ?? c.phones?.[0] ?? null,
      entityType: c.entityType ?? null,
      status: c.status,
      stage: c.stage,
      createdAt: c.createdAt.toISOString(),
      manager: c.manager,
      sourceLabel: 'Карточка',
      contractCount: null,
      totalAmount: null,
      lastContractDate: null,
      contractCustomer: null,
    };
  }

  private serializeContractOnlyDirectoryRow(
    o: Awaited<ReturnType<ContractsService['getCustomersFromContracts']>>['customers'][number],
  ): Record<string, unknown> {
    const displayName = (o.customerName ?? '').trim() || '—';
    const phoneKey = (o.customerPhone ?? '').trim();
    return {
      rowSource: 'contract_only',
      id: `contract-only:${displayName}|${phoneKey}`,
      displayName,
      email: null,
      phone: o.customerPhone ?? null,
      entityType: (() => {
        const doc = o.documentCustomer as unknown;
        if (doc && typeof doc === 'object' && 'type' in doc) {
          const t = (doc as { type?: unknown }).type;
          return typeof t === 'string' && t.trim() ? t : null;
        }
        return null;
      })(),
      status: null,
      stage: null,
      createdAt: null,
      manager: o.manager,
      sourceLabel: 'Только договор',
      contractCount: o.contractCount,
      totalAmount: Number(o.totalAmount ?? 0),
      lastContractDate: o.lastContractDate,
      contractCustomer: o,
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        interactions: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { dueDate: 'asc' },
        },
        deals: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto) {
    await this.findOne(id);
    const { extendedProfile, dealValue, nextFollowUp, phone, phones, ...rest } = updateCustomerDto;

    const data: Prisma.CustomerUpdateInput = {
      ...rest,
      dealValue:
        dealValue !== undefined
          ? dealValue != null
            ? new Prisma.Decimal(dealValue)
            : null
          : undefined,
      nextFollowUp:
        nextFollowUp !== undefined ? (nextFollowUp ? new Date(nextFollowUp) : null) : undefined,
      extendedProfile:
        extendedProfile === undefined
          ? undefined
          : extendedProfile === null
            ? Prisma.DbNull
            : (extendedProfile as Prisma.InputJsonValue),
    };

    if (phone !== undefined || phones !== undefined) {
      const { phone: primary, phones: list } = this.normalizeCustomerPhones({
        phone: phone !== undefined ? phone : undefined,
        phones: phones !== undefined ? phones : undefined,
      });
      data.phone = primary;
      data.phones = list;
    }

    return this.prisma.customer.update({
      where: { id },
      data,
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.customer.delete({
      where: { id },
    });
  }

  async addInteraction(userId: string, createInteractionDto: CreateInteractionDto) {
    const customer = await this.findOne(createInteractionDto.customerId);

    const interaction = await this.prisma.interaction.create({
      data: {
        ...createInteractionDto,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update last contact date
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastContactAt: new Date() },
    });

    return interaction;
  }

  async getInteractions(customerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [interactions, total] = await Promise.all([
      this.prisma.interaction.findMany({
        where: { customerId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.interaction.count({ where: { customerId } }),
    ]);

    return {
      data: interactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Sales funnel statistics
  async getFunnelStats(managerId?: string) {
    const where: Prisma.CustomerWhereInput = managerId ? { managerId } : {};

    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

    const stats = await Promise.all(
      stages.map(async (stage) => {
        type CustomerStage =
          | 'NEW'
          | 'CONTACTED'
          | 'QUALIFIED'
          | 'PROPOSAL'
          | 'NEGOTIATION'
          | 'WON'
          | 'LOST';
        const [count, totalValue] = await Promise.all([
          this.prisma.customer.count({
            where: { ...where, stage: stage as CustomerStage },
          }),
          this.prisma.customer.aggregate({
            where: { ...where, stage: stage as CustomerStage },
            _sum: { dealValue: true },
          }),
        ]);

        return {
          stage,
          count,
          totalValue: totalValue._sum.dealValue || 0,
        };
      }),
    );

    return stats;
  }

  // Upcoming follow-ups
  async getUpcomingFollowUps(managerId?: string, days = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const where: Prisma.CustomerWhereInput = {
      nextFollowUp: {
        gte: new Date(),
        lte: endDate,
      },
    };

    if (managerId) {
      where.managerId = managerId;
    }

    return this.prisma.customer.findMany({
      where,
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { nextFollowUp: 'asc' },
    });
  }

  // Assign manager to customer
  async assignManager(customerId: string, managerId: string) {
    await this.findOne(customerId);
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { managerId },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }
}
