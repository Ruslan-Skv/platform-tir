import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '@prisma/client';
import type { CalculateDeliveryDto } from './dto/calculate-delivery.dto';
import type { SubmitFromCartDto } from './dto/submit-from-cart.dto';
import type { SubmitFromCartForCustomerDto } from './dto/submit-from-cart-for-customer.dto';
import type { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { OrderMailService } from './services/order-mail.service';
import {
  DEFAULT_APPROVAL_VALID_MINUTES,
  OrdersDeliveryService,
} from './services/orders-delivery.service';
import { OrdersCartCheckoutService } from './services/orders-cart-checkout.service';
import { OrdersServiceOrdersService } from './services/orders-service-orders.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private orderMailService: OrderMailService,
    private configService: ConfigService,
    private ordersDelivery: OrdersDeliveryService,
    private ordersServiceOrders: OrdersServiceOrdersService,
    private ordersCartCheckout: OrdersCartCheckoutService,
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

  getDeliverySettlements() {
    return this.ordersDelivery.getDeliverySettlements();
  }

  getShippingMethods() {
    return this.ordersDelivery.getShippingMethods();
  }

  calculateDelivery(
    userId: string,
    dto: CalculateDeliveryDto,
    optionalCartItems?: Awaited<ReturnType<CartService['getCartItems']>>,
  ) {
    return this.ordersDelivery.calculateDelivery(userId, dto, optionalCartItems);
  }

  submitFromCart(userId: string, dto?: SubmitFromCartDto, role?: string) {
    return this.ordersCartCheckout.submitFromCart(userId, dto, role);
  }

  submitFromCartForCustomer(
    managerId: string,
    managerRole: string,
    dto: SubmitFromCartForCustomerDto,
  ) {
    return this.ordersCartCheckout.submitFromCartForCustomer(managerId, managerRole, dto);
  }

  async addCartItemToOrder(orderId: string, cartItemId: string, userId: string) {
    await this.ordersCartCheckout.addCartItemToOrder(orderId, cartItemId, userId);
    return this.findOne(orderId, userId, undefined);
  }

  async findAll(userId?: string, role?: string) {
    const where: Prisma.OrderWhereInput = {};
    const canSeeAllOrders = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!canSeeAllOrders && userId) {
      where.userId = userId;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        orderServiceItems: {
          include: {
            serviceCatalogItem: {
              select: {
                id: true,
                category: { select: { slug: true } },
              },
            },
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

    const deliveryConfig = await this.ordersDelivery.getDeliveryConfig();
    const approvalValidMinutes =
      (deliveryConfig as { approvalValidMinutes?: number }).approvalValidMinutes ??
      DEFAULT_APPROVAL_VALID_MINUTES;
    const approvalValidMs = approvalValidMinutes * 60 * 1000;
    const expiryCancelReason = `Время на оформление заказа истекло (${approvalValidMinutes} мин). Товары остаются в корзине.`;
    const now = Date.now();
    for (const order of orders) {
      if (
        order.status === 'APPROVED' &&
        order.approvedAt &&
        now - new Date(order.approvedAt).getTime() > approvalValidMs
      ) {
        await this.restoreStock(
          order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        );
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancelReason: expiryCancelReason,
            approvedAt: null,
          },
        });
        (order as { status: string; approvedAt: Date | null }).status = 'CANCELLED';
        (order as { approvedAt: Date | null }).approvedAt = null;
      }
    }
    const paymentMode = deliveryConfig.deliveryPaymentMode === 'ON_SITE' ? 'ON_SITE' : 'WITH_ORDER';
    return orders.map((order) => ({
      ...order,
      deliveryPaymentMode: paymentMode,
      approvalValidMinutes,
      ...(paymentMode === 'ON_SITE'
        ? { total: Number(order.subtotal) - Number(order.discount) }
        : {}),
    }));
  }

  /** Получить заказ по токену из письма (публичный доступ). */
  async findOneByViewToken(token: string) {
    const payload = this.orderMailService.verifyOrderViewToken(token);
    if (!payload) {
      throw new NotFoundException('Ссылка недействительна или истекла');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        items: { include: { product: true } },
        orderServiceItems: {
          include: {
            serviceCatalogItem: {
              select: {
                id: true,
                category: { select: { slug: true } },
              },
            },
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
      throw new NotFoundException('Заказ не найден');
    }
    const customerEmail = (order as { customerEmail?: string | null }).customerEmail ?? '';
    const orderEmail = order.createdByManagerId
      ? customerEmail.toLowerCase()
      : (order.user?.email ?? customerEmail).toLowerCase();
    const payloadEmail = payload.email.toLowerCase();
    if (orderEmail !== payloadEmail) {
      throw new ForbiddenException('Ссылка не соответствует заказу');
    }
    const deliveryConfig = await this.ordersDelivery.getDeliveryConfig();
    const paymentMode = deliveryConfig.deliveryPaymentMode === 'ON_SITE' ? 'ON_SITE' : 'WITH_ORDER';
    const approvalValidMinutes =
      (deliveryConfig as { approvalValidMinutes?: number }).approvalValidMinutes ??
      DEFAULT_APPROVAL_VALID_MINUTES;
    return {
      ...order,
      deliveryPaymentMode: paymentMode,
      approvalValidMinutes,
      ...(paymentMode === 'ON_SITE'
        ? { total: Number(order.subtotal) - Number(order.discount) }
        : {}),
    };
  }

  /**
   * Отправить заказ на email клиента (только для менеджеров). Альтернатива кнопке в админке —
   * когда у менеджера открыта ссылка на просмотр заказа, он может отправить заказ клиенту одним кликом.
   */
  async resendOrderToCustomerEmail(
    token: string,
    userRole?: string,
  ): Promise<{ sent: boolean; error?: string }> {
    const canSend = userRole && (await this.canPlaceServiceOrder(userRole));
    if (!canSend) {
      return { sent: false, error: 'Отправка заказа на email доступна только менеджерам' };
    }
    const payload = this.orderMailService.verifyOrderViewToken(token);
    if (!payload) {
      return { sent: false, error: 'Ссылка недействительна или истекла' };
    }
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: {
        items: true,
        orderServiceItems: true,
        user: { select: { email: true } },
      },
    });
    if (!order) {
      return { sent: false, error: 'Заказ не найден' };
    }
    const customerEmail = (order as { customerEmail?: string | null }).customerEmail ?? '';
    const orderEmail = order.createdByManagerId
      ? customerEmail.toLowerCase()
      : (order.user?.email ?? customerEmail).toLowerCase();
    const payloadEmail = payload.email.toLowerCase();
    if (orderEmail !== payloadEmail) {
      return { sent: false, error: 'Ссылка не соответствует заказу' };
    }
    if (order.status !== 'APPROVED') {
      return { sent: false, error: 'Отправить можно только проверенный заказ (статус «Проверен»)' };
    }
    const siteUrl = this.configService.get<string>('SITE_URL', 'http://localhost:3000');
    const newToken = this.orderMailService.generateOrderViewToken(order.id, payload.email);
    const viewOrderUrl = `${siteUrl}/order/view?token=${newToken}`;
    const total = typeof order.total === 'string' ? parseFloat(order.total) : Number(order.total);
    const itemsCount =
      order.items.length +
      (Array.isArray((order as { orderServiceItems?: unknown[] }).orderServiceItems)
        ? (order as { orderServiceItems: unknown[] }).orderServiceItems.length
        : 0);
    const sent = await this.orderMailService.sendOrderToCustomer({
      orderNumber: order.orderNumber,
      customerEmail: payload.email,
      total,
      itemsCount,
      viewOrderUrl,
    });
    if (!sent) {
      return { sent: false, error: 'Не удалось отправить письмо. Попробуйте позже.' };
    }
    await this.prisma.order.update({
      where: { id: order.id },
      data: { sentToEmailAt: new Date(), orderViewToken: newToken },
    });
    return { sent: true };
  }

  async findOne(id: string, userId?: string, role?: string) {
    let order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        orderServiceItems: {
          include: {
            serviceCatalogItem: {
              select: {
                id: true,
                category: { select: { slug: true } },
              },
            },
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

    const deliveryConfig = await this.ordersDelivery.getDeliveryConfig();
    const approvalValidMinutes =
      (deliveryConfig as { approvalValidMinutes?: number }).approvalValidMinutes ??
      DEFAULT_APPROVAL_VALID_MINUTES;
    const approvalValidMs = approvalValidMinutes * 60 * 1000;
    if (
      order.status === 'APPROVED' &&
      order.approvedAt &&
      Date.now() - new Date(order.approvedAt).getTime() > approvalValidMs
    ) {
      await this.restoreStock(
        order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      );
      order = await this.prisma.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: `Время на оформление заказа истекло (${approvalValidMinutes} мин). Товары остаются в корзине.`,
          approvedAt: null,
        },
        include: {
          items: { include: { product: true } },
          orderServiceItems: {
            include: {
              serviceCatalogItem: {
                select: {
                  id: true,
                  category: { select: { slug: true } },
                },
              },
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

    const paymentMode = deliveryConfig.deliveryPaymentMode === 'ON_SITE' ? 'ON_SITE' : 'WITH_ORDER';
    return {
      ...order,
      deliveryPaymentMode: paymentMode,
      approvalValidMinutes,
      ...(paymentMode === 'ON_SITE'
        ? { total: Number(order.subtotal) - Number(order.discount) }
        : {}),
    };
  }

  canPlaceServiceOrder(role: string) {
    return this.ordersServiceOrders.canPlaceServiceOrder(role);
  }

  createServiceOrder(managerId: string, managerRole: string, dto: CreateServiceOrderDto) {
    return this.ordersServiceOrders.createServiceOrder(managerId, managerRole, dto);
  }

  updateServiceOrderCustomer(
    serviceOrderId: string,
    data: {
      customerEmail?: string | null;
      customerFirstName?: string | null;
      customerLastName?: string | null;
      customerPhone?: string | null;
    },
  ) {
    return this.ordersServiceOrders.updateServiceOrderCustomer(serviceOrderId, data);
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
   * Отменить заказ покупателем (PENDING_REVIEW, RETURNED_FOR_CORRECTION или APPROVED — чтобы изменить состав и переоформить).
   * После отмены покупатель может снова отправить корзину на проверку или продолжить покупки.
   */
  async cancelByCustomer(orderId: string, userId: string) {
    const order = await this.findOne(orderId, userId, undefined);
    if (order.userId !== userId) {
      throw new ForbiddenException('Нельзя отменить чужой заказ');
    }
    const allowedStatuses = ['PENDING_REVIEW', 'RETURNED_FOR_CORRECTION', 'APPROVED'];
    if (!allowedStatuses.includes(order.status ?? '')) {
      throw new BadRequestException(
        'Отменить можно только заказ в статусе «На проверке», «На доработке» или «Заказ проверен»',
      );
    }
    await this.restoreStock(
      (order.items ?? []).map((i) => ({ productId: i.productId, quantity: i.quantity })),
    );

    const cancelReason =
      order.status === 'APPROVED'
        ? 'Отменено покупателем (изменение состава заказа — полное переоформление)'
        : 'Отменено покупателем (отказ от проверки)';

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason,
        approvedAt: order.status === 'APPROVED' ? null : undefined,
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

    await this.prisma.orderEvent.create({
      data: {
        orderId,
        type: 'cancelled',
        actor: 'customer',
        userId,
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

  private async restoreStock(items: Array<{ productId: string | null; quantity: number }>) {
    const rows = items.filter(
      (i): i is { productId: string; quantity: number } => i.productId != null,
    );
    if (!rows.length) return;
    await this.prisma.$transaction(
      rows.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        }),
      ),
    );
  }
}
