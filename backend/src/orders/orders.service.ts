import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Prisma } from '@prisma/client';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private usersService: UsersService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: createOrderDto.items.map((item) => item.productId) },
      },
    });

    const subtotal = createOrderDto.items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + parseFloat(product?.price.toString() || '0') * item.quantity;
    }, 0);

    const tax = 0;
    const shippingCost = createOrderDto.shippingCost || 0;
    const total = subtotal + shippingCost;

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PENDING',
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

  /**
   * Создать заказ из текущей корзины со статусом «На проверке».
   * Адрес доставки не указывается — его выберут после согласования.
   */
  async submitFromCart(userId: string) {
    const cartItems = await this.cartService.getCartItems(userId);
    if (!cartItems.length) {
      throw new BadRequestException('Корзина пуста');
    }

    const orderItems: Array<{
      productId: string;
      quantity: number;
      price: number;
      size: string | null;
      openingSide: string | null;
      cardVariantId: string | null;
    }> = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const qty = Math.max(1, Math.round(Number(item.quantity)));
      if (item.productId && item.product) {
        const price = parseFloat(item.product.price.toString());
        orderItems.push({
          productId: item.product.id,
          quantity: qty,
          price,
          size: item.size ?? null,
          openingSide: item.openingSide ?? null,
          cardVariantId: item.cardVariantId ?? null,
        });
        subtotal += price * qty;
      } else if (item.componentId && item.component) {
        const price = parseFloat(item.component.price.toString());
        orderItems.push({
          productId: item.component.productId,
          quantity: qty,
          price,
          size: null,
          openingSide: null,
          cardVariantId: null,
        });
        subtotal += price * qty;
      }
    }

    if (orderItems.length === 0) {
      throw new BadRequestException('В корзине нет позиций для заказа');
    }

    const tax = 0;
    const shippingCost = 0;
    const total = subtotal + shippingCost;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PENDING_REVIEW',
        shippingAddressId: null,
        subtotal,
        tax,
        shippingCost,
        total,
        items: {
          create: orderItems.map((oi) => ({
            productId: oi.productId,
            quantity: oi.quantity,
            price: oi.price,
            size: oi.size,
            openingSide: oi.openingSide,
            cardVariantId: oi.cardVariantId,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
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

    const adminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    const admins = await this.prisma.user.findMany({
      where: { role: { in: adminRoles }, isActive: true },
      select: { id: true },
    });
    const title = 'Новый заказ на проверку';
    const message = `Заказ ${order.orderNumber} ожидает проверки.`;
    await Promise.all(
      admins.map((a) =>
        this.usersService.createNotification(a.id, {
          type: 'new_order',
          title,
          message,
        }),
      ),
    );

    return order;
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

  /**
   * Отменить проверку заказа покупателем (только PENDING_REVIEW или RETURNED_FOR_CORRECTION).
   * После отмены покупатель может снова отправить корзину на проверку или продолжить покупки.
   */
  async cancelByCustomer(orderId: string, userId: string) {
    const order = await this.findOne(orderId, userId, undefined);
    if (order.userId !== userId) {
      throw new ForbiddenException('Нельзя отменить чужой заказ');
    }
    if (order.status !== 'PENDING_REVIEW' && order.status !== 'RETURNED_FOR_CORRECTION') {
      throw new BadRequestException(
        'Отменить проверку можно только у заказа в статусе «На проверке» или «На доработке»',
      );
    }
    await this.restoreStock(
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    );

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: 'Отменено покупателем (отказ от проверки)',
      },
      include: {
        items: { include: { product: true } },
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

    const adminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    const admins = await this.prisma.user.findMany({
      where: { role: { in: adminRoles }, isActive: true },
      select: { id: true },
    });
    const title = 'Проверка заказа отменена покупателем';
    const message = `Покупатель отменил проверку заказа ${order.orderNumber}.`;
    await Promise.all(
      admins.map((a) =>
        this.usersService.createNotification(a.id, {
          type: 'order_cancelled_by_customer',
          title,
          message,
        }),
      ),
    );

    return updated;
  }

  private async restoreStock(items: Array<{ productId: string; quantity: number }>) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        }),
      ),
    );
  }
}
