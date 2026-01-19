import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async create(createCustomerDto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        dealValue: createCustomerDto.dealValue
          ? new Prisma.Decimal(createCustomerDto.dealValue)
          : null,
        nextFollowUp: createCustomerDto.nextFollowUp
          ? new Date(createCustomerDto.nextFollowUp)
          : null,
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
    page?: number;
    limit?: number;
  }) {
    const { status, stage, managerId, search, page = 1, limit = 20 } = params || {};
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

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
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
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...updateCustomerDto,
        dealValue:
          updateCustomerDto.dealValue !== undefined
            ? new Prisma.Decimal(updateCustomerDto.dealValue)
            : undefined,
        nextFollowUp: updateCustomerDto.nextFollowUp
          ? new Date(updateCustomerDto.nextFollowUp)
          : undefined,
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
