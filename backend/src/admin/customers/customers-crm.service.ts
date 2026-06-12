import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CreateInteractionDto } from './dto/create-interaction.dto';

@Injectable()
export class CustomersCrmService {
  constructor(private prisma: PrismaService) {}

  private async assertCustomerExists(id: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }
    if (customer.deletedAt) {
      throw new NotFoundException('Карточка клиента находится в корзине');
    }
    return customer;
  }

  async addInteraction(userId: string, createInteractionDto: CreateInteractionDto) {
    await this.assertCustomerExists(createInteractionDto.customerId);

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
      where: { id: createInteractionDto.customerId },
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
    await this.assertCustomerExists(customerId);
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
