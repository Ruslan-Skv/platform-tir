import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AdminOrdersTrashService {
  constructor(private prisma: PrismaService) {}

  async deleteOrder(id: string): Promise<{ id: string }> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    if (order.deletedAt) {
      throw new BadRequestException('Заказ уже в корзине');
    }
    await this.prisma.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }

  async restoreOrder(id: string): Promise<{ id: string }> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    if (!order.deletedAt) {
      throw new BadRequestException('Заказ не в корзине');
    }
    await this.prisma.order.update({
      where: { id },
      data: { deletedAt: null },
    });
    return { id };
  }

  async deleteServiceOrder(id: string): Promise<{ id: string }> {
    const order = await this.prisma.serviceOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Заказ на услуги не найден');
    }
    if (order.deletedAt) {
      throw new BadRequestException('Заказ уже в корзине');
    }
    await this.prisma.serviceOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }

  async restoreServiceOrder(id: string): Promise<{ id: string }> {
    const order = await this.prisma.serviceOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Заказ на услуги не найден');
    }
    if (!order.deletedAt) {
      throw new BadRequestException('Заказ не в корзине');
    }
    await this.prisma.serviceOrder.update({
      where: { id },
      data: { deletedAt: null },
    });
    return { id };
  }

  async findTrash(params?: { search?: string; page?: number; limit?: number }) {
    const page = params?.page ?? 1;
    const limit = Math.min(Math.max(params?.limit ?? 25, 1), 100);
    const skip = (page - 1) * limit;
    const search = params?.search?.trim();

    const orderWhere: Prisma.OrderWhereInput = { deletedAt: { not: null } };
    const serviceWhere: Prisma.ServiceOrderWhereInput = { deletedAt: { not: null } };

    if (search) {
      orderWhere.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerFirstName: { contains: search, mode: 'insensitive' } },
        { customerLastName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
      serviceWhere.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
        { customerFirstName: { contains: search, mode: 'insensitive' } },
        { customerLastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, serviceOrders, ordersTotal, servicesTotal] = await Promise.all([
      this.prisma.order.findMany({
        where: orderWhere,
        orderBy: { deletedAt: 'desc' },
        take: 300,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          deletedAt: true,
          customerEmail: true,
          customerFirstName: true,
          customerLastName: true,
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.serviceOrder.findMany({
        where: serviceWhere,
        orderBy: { deletedAt: 'desc' },
        take: 300,
        select: {
          id: true,
          orderNumber: true,
          total: true,
          deletedAt: true,
          customerEmail: true,
          customerFirstName: true,
          customerLastName: true,
        },
      }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.serviceOrder.count({ where: serviceWhere }),
    ]);

    const merged = [
      ...orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderType: 'product' as const,
        total: o.total,
        deletedAt: o.deletedAt!.toISOString(),
        customerLabel:
          [o.customerFirstName, o.customerLastName].filter(Boolean).join(' ').trim() ||
          o.customerEmail ||
          [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ').trim() ||
          o.user?.email ||
          '—',
      })),
      ...serviceOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderType: 'service' as const,
        total: o.total,
        deletedAt: o.deletedAt!.toISOString(),
        customerLabel:
          [o.customerFirstName, o.customerLastName].filter(Boolean).join(' ').trim() ||
          o.customerEmail ||
          '—',
      })),
    ].sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt));

    const total = ordersTotal + servicesTotal;
    const data = merged.slice(skip, skip + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
