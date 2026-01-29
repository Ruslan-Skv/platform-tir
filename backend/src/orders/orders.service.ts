import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    // Calculate totals
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: createOrderDto.items.map((item) => item.productId) },
      },
    });

    const subtotal = createOrderDto.items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + parseFloat(product?.price.toString() || '0') * item.quantity;
    }, 0);

    const tax = subtotal * 0.2; // 20% VAT
    const shippingCost = createOrderDto.shippingCost || 0;
    const total = subtotal + tax + shippingCost;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create order with items
    return this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        shippingAddressId: createOrderDto.shippingAddressId,
        subtotal,
        tax,
        shippingCost,
        total,
        items: {
          create: createOrderDto.items.map((item) => {
            const product = products.find((p) => p.id === item.productId);
            return {
              productId: item.productId,
              quantity: item.quantity,
              price: product?.price || 0,
              size: item.size || null,
              openingSide: item.openingSide || null,
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
        user: {
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

  async findAll(userId?: string, role?: string) {
    const where: Prisma.OrderWhereInput = {};
    const canSeeAllOrders = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!canSeeAllOrders && userId) {
      where.userId = userId;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const canSeeAnyOrder = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!canSeeAnyOrder && order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: updateOrderDto,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        shippingAddress: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.order.delete({
      where: { id },
    });
  }
}
