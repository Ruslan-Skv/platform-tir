import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { OrderMailService } from '../../orders/order-mail.service';
import { Prisma } from '@prisma/client';

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  PENDING_REVIEW: 'На проверке',
  RETURNED_FOR_CORRECTION: 'На доработке у покупателя',
  APPROVED: 'Проверен',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  REFUNDED: 'Возврат',
};

const APPROVAL_VALID_MS = 60 * 60 * 1000; // 60 минут действия статуса «Заказ проверен»

@Injectable()
export class AdminOrdersService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private orderMailService: OrderMailService,
    private configService: ConfigService,
  ) {}

  async findAll(params?: {
    status?: string;
    paymentStatus?: string;
    userId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    minTotal?: number;
    maxTotal?: number;
    hasDelivery?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      status,
      paymentStatus,
      userId,
      search,
      dateFrom,
      dateTo,
      minTotal,
      maxTotal,
      hasDelivery,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params || {};

    const skip = (page - 1) * limit;
    let where: Prisma.OrderWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumOrderStatusFilter;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus as Prisma.EnumPaymentStatusFilter;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    if (minTotal !== undefined || maxTotal !== undefined) {
      where.total = {};
      if (minTotal !== undefined) {
        where.total.gte = new Prisma.Decimal(minTotal);
      }
      if (maxTotal !== undefined) {
        where.total.lte = new Prisma.Decimal(maxTotal);
      }
    }

    if (hasDelivery) {
      const deliveryOr = {
        OR: [{ shippingAddressId: { not: null } }, { shippingCost: { gt: 0 } }],
      };
      where = Object.keys(where).length > 0 ? { AND: [where, deliveryOr] } : deliveryOr;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  images: true,
                },
              },
            },
          },
          shippingAddress: true,
          shippingMethod: true,
          payments: {
            include: {
              method: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    let order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
                images: true,
              },
            },
            replacedFromProduct: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
        shippingAddress: true,
        shippingMethod: true,
        payments: {
          include: {
            method: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (
      order.status === 'APPROVED' &&
      order.approvedAt &&
      Date.now() - new Date(order.approvedAt).getTime() > APPROVAL_VALID_MS
    ) {
      await this.restoreStock(
        order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      );
      order = await this.prisma.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: 'Время на оформление заказа истекло (60 мин). Товары остаются в корзине.',
          approvedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  sku: true,
                  images: true,
                },
              },
              replacedFromProduct: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          shippingAddress: true,
          shippingMethod: true,
          payments: {
            include: { method: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    return order;
  }

  /** Вернуть остатки на склад при отмене заказа (истечение 60 мин или отмена покупателем). */
  private async restoreStock(items: Array<{ productId: string; quantity: number }>) {
    if (items.length === 0) return;
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        }),
      ),
    );
  }

  /** Удалить заказ (только для супер-админа). Каскадно удаляются позиции и платежи. */
  async deleteOrder(id: string): Promise<{ id: string }> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    await this.prisma.order.delete({ where: { id } });
    return { id };
  }

  /** Обновить только комментарий менеджера к пункту заказа (рекомендации по замене/количеству для покупателя). */
  async updateOrderItem(orderId: string, itemId: string, data: { managerComment?: string | null }) {
    const order = await this.findOne(orderId);
    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Пункт заказа не найден');
    }

    const managerComment =
      data.managerComment !== undefined ? data.managerComment || null : undefined;
    if (managerComment === undefined) {
      return this.findOne(orderId);
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { managerComment },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { adminEditedAt: new Date() },
    });

    const orderUserId = order.userId;
    if (orderUserId) {
      const productName = item.product?.name ?? 'товар';
      await this.usersService.createNotification(orderUserId, {
        type: 'order_comment',
        title: `Рекомендации по заказу ${order.orderNumber}`,
        message: `Менеджер оставил рекомендации по позиции «${productName}». Откройте корзину, чтобы ознакомиться и при необходимости внести изменения.`,
      });
    }

    return this.findOne(orderId);
  }

  /** Пересчитать итоги заказа по текущим пунктам. */
  private async recalculateOrderTotals(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const config = await this.getDeliveryConfig();
    const subtotal = order.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const tax = 0;
    const shippingCost = Number(order.shippingCost);
    const carryCost = order.carryCost != null ? Number(order.carryCost) : 0;
    const discount = Number(order.discount);
    const total =
      config.deliveryPaymentMode === 'ON_SITE'
        ? subtotal - discount
        : subtotal + shippingCost + carryCost - discount;

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        tax,
        total,
      },
    });
  }

  /** Обновить стоимость доставки, грузчиков, количество грузчиков и планируемую дату доставки (админ). */
  async updateOrderDelivery(
    orderId: string,
    data: {
      shippingCost?: number;
      carryCost?: number | null;
      moversCount?: number | null;
      plannedDeliveryDate?: string | null;
    },
  ) {
    await this.findOne(orderId);
    const updateData: Prisma.OrderUpdateInput = {};
    if (data.shippingCost !== undefined) {
      updateData.shippingCost = data.shippingCost;
    }
    if (data.carryCost !== undefined) {
      updateData.carryCost = data.carryCost;
    }
    if (data.moversCount !== undefined) {
      updateData.moversCount = data.moversCount;
    }
    if (data.plannedDeliveryDate !== undefined) {
      updateData.plannedDeliveryDate =
        data.plannedDeliveryDate && data.plannedDeliveryDate.trim()
          ? new Date(data.plannedDeliveryDate.trim())
          : null;
    }
    if (Object.keys(updateData).length === 0) {
      return this.findOne(orderId);
    }
    updateData.adminEditedAt = new Date();
    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
    await this.recalculateOrderTotals(orderId);
    return this.findOne(orderId);
  }

  /** Отправить заказ на доработку покупателю (с комментариями менеджера). */
  async sendBackToCustomer(orderId: string, comment?: string) {
    const order = await this.findOne(orderId);
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'RETURNED_FOR_CORRECTION',
        returnedForCorrectionAt: new Date(),
        returnedForCorrectionComment: comment || null,
      },
    });
    await this.usersService.createNotification(order.userId, {
      type: 'order_status',
      title: `Заказ ${order.orderNumber} отправлен на доработку`,
      message: comment || 'Менеджер оставил комментарии по заказу. Пожалуйста, внесите правки.',
    });
    return this.findOne(orderId);
  }

  /** Отправить заказ на email покупателя (после проверки). Генерирует ссылку для просмотра и оплаты. */
  async sendOrderToCustomerEmail(orderId: string): Promise<{ sent: boolean; error?: string }> {
    const order = await this.findOne(orderId);
    const email = order.user?.email || (order as { customerEmail?: string | null }).customerEmail;
    if (!email) {
      return { sent: false, error: 'У заказа не указан email покупателя' };
    }
    if (order.status !== 'APPROVED') {
      return { sent: false, error: 'Отправить можно только проверенный заказ (статус «Проверен»)' };
    }
    if ((order as { sentToEmailAt?: Date }).sentToEmailAt) {
      return { sent: false, error: 'Заказ уже был отправлен на email' };
    }
    const siteUrl = this.configService.get<string>('SITE_URL', 'http://localhost:3000');
    const token = this.orderMailService.generateOrderViewToken(orderId, email);
    const viewOrderUrl = `${siteUrl}/order/view?token=${token}`;
    const total = typeof order.total === 'string' ? parseFloat(order.total) : Number(order.total);
    const sent = await this.orderMailService.sendOrderToCustomer({
      orderNumber: order.orderNumber,
      customerEmail: email,
      total,
      itemsCount: order.items.length,
      viewOrderUrl,
    });
    if (!sent) {
      return { sent: false, error: 'Не удалось отправить письмо. Проверьте настройки SMTP.' };
    }
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        sentToEmailAt: new Date(),
        orderViewToken: token,
      },
    });
    return { sent: true };
  }

  /** Список товаров для подстановки при замене в заказе (поиск по имени/SKU). */
  async getProductsForReplacement(search?: string, limit = 50) {
    const where: Prisma.ProductWhereInput = { isActive: true };
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { sku: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    return this.prisma.product.findMany({
      where,
      select: { id: true, name: true, sku: true, price: true },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  /** Настройки расчёта доставки (населённые пункты, грузчики). */
  async getDeliveryConfig() {
    let config = await this.prisma.deliveryConfig.findFirst({
      include: {
        settlements: { orderBy: { order: 'asc' } },
      },
    });
    if (!config) {
      config = await this.prisma.deliveryConfig.create({
        data: {
          deliveryPriceMurmansk: 500,
          deliveryPricePerKmOutside: 50,
          deliveryPaymentMode: 'WITH_ORDER',
          moversPriceMurmansk: 300,
          moversPriceOutside: 400,
          moversKgPerPerson: 50,
          moversVolumePerPerson: 0.5,
        },
        include: {
          settlements: { orderBy: { order: 'asc' } },
        },
      });
    }
    return config;
  }

  /** Обновить настройки расчёта доставки. */
  async updateDeliveryConfig(data: {
    deliveryPricePerKmOutside?: number;
    deliveryPaymentMode?: 'WITH_ORDER' | 'ON_SITE';
    moversPriceMurmansk?: number;
    moversPriceOutside?: number;
    moversKgPerPerson?: number;
    moversVolumePerPerson?: number | null;
    settlements?: Array<{ id?: string; name: string; price: number; order?: number }>;
  }) {
    const config = await this.getDeliveryConfig();
    const updateData: Prisma.DeliveryConfigUpdateInput = {};
    if (data.deliveryPricePerKmOutside !== undefined)
      updateData.deliveryPricePerKmOutside = data.deliveryPricePerKmOutside;
    if (data.deliveryPaymentMode !== undefined)
      updateData.deliveryPaymentMode = data.deliveryPaymentMode;
    if (data.moversPriceMurmansk !== undefined)
      updateData.moversPriceMurmansk = data.moversPriceMurmansk;
    if (data.moversPriceOutside !== undefined)
      updateData.moversPriceOutside = data.moversPriceOutside;
    if (data.moversKgPerPerson !== undefined) updateData.moversKgPerPerson = data.moversKgPerPerson;
    if (data.moversVolumePerPerson !== undefined)
      updateData.moversVolumePerPerson = data.moversVolumePerPerson;

    if (data.settlements !== undefined) {
      await this.prisma.deliverySettlement.deleteMany({ where: { configId: config.id } });
      if (data.settlements.length > 0) {
        await this.prisma.deliverySettlement.createMany({
          data: data.settlements.map((s, i) => ({
            configId: config.id,
            name: s.name.trim(),
            price: s.price,
            order: s.order ?? i,
          })),
        });
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.deliveryConfig.update({
        where: { id: config.id },
        data: updateData,
      });
    }

    return this.prisma.deliveryConfig.findFirstOrThrow({
      where: { id: config.id },
      include: { settlements: { orderBy: { order: 'asc' } } },
    });
  }

  async updateStatus(id: string, status: string) {
    const order = await this.findOne(id);

    type OrderStatus =
      | 'PENDING'
      | 'PENDING_REVIEW'
      | 'RETURNED_FOR_CORRECTION'
      | 'APPROVED'
      | 'PROCESSING'
      | 'SHIPPED'
      | 'DELIVERED'
      | 'CANCELLED'
      | 'REFUNDED';
    const updateData: Prisma.OrderUpdateInput = { status: status as OrderStatus };

    switch (status) {
      case 'APPROVED':
        updateData.approvedAt = new Date();
        break;
      case 'SHIPPED':
        updateData.shippedAt = new Date();
        break;
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        break;
      case 'CANCELLED':
        updateData.cancelledAt = new Date();
        // Restore stock
        await this.restoreStock(order.items);
        break;
    }
    if (status !== 'APPROVED' && order.status === 'APPROVED') {
      updateData.approvedAt = null;
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Уведомление покупателю о этапе заказа
    const statusMessages: Record<string, { title: string; message: string }> = {
      APPROVED: {
        title: `Заказ ${order.orderNumber} проверен`,
        message:
          'Менеджер проверил заказ. Перейдите в корзину и оформите заказ в течение 60 минут.',
      },
      RETURNED_FOR_CORRECTION: {
        title: `Заказ ${order.orderNumber} отправлен на доработку`,
        message:
          'Менеджер оставил комментарии. Внесите изменения в корзине и снова отправьте заказ на проверку.',
      },
      PROCESSING: {
        title: `Заказ ${order.orderNumber} принят в обработку`,
        message: 'Заказ передан в обработку. Ожидайте подтверждения или связи с менеджером.',
      },
      SHIPPED: {
        title: `Заказ ${order.orderNumber} отправлен`,
        message: (updated as { trackingNumber?: string | null }).trackingNumber
          ? `Заказ передан в доставку. Трек-номер: ${(updated as { trackingNumber: string }).trackingNumber}`
          : 'Заказ передан в доставку.',
      },
      DELIVERED: {
        title: `Заказ ${order.orderNumber} доставлен`,
        message: 'Заказ доставлен. Спасибо за покупку!',
      },
      CANCELLED: {
        title: `Заказ ${order.orderNumber} отменён`,
        message: `Статус заказа: ${ORDER_STATUS_LABELS[status] ?? status}`,
      },
      REFUNDED: {
        title: `По заказу ${order.orderNumber} оформлен возврат`,
        message: `Статус заказа: ${ORDER_STATUS_LABELS[status] ?? status}`,
      },
    };
    const notification = statusMessages[status] ?? {
      title: `Статус заказа ${order.orderNumber} изменён`,
      message: `Новый статус: ${ORDER_STATUS_LABELS[status] ?? status}`,
    };
    await this.usersService.createNotification(order.userId, {
      type: 'order_status',
      title: notification.title,
      message: notification.message,
    });

    return updated;
  }

  async cancelOrder(id: string, reason?: string) {
    const order = await this.findOne(id);

    if (['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order with status ${order.status}`);
    }

    // Restore stock
    await this.restoreStock(order.items);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    await this.usersService.createNotification(order.userId, {
      type: 'order_status',
      title: `Заказ ${order.orderNumber} отменён`,
      message: reason ? `Причина: ${reason}` : 'Заказ отменён',
    });

    return updated;
  }

  async refundOrder(id: string, amount?: number, reason?: string) {
    const order = await this.findOne(id);

    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestException('Cannot refund unpaid order');
    }

    const refundAmount = amount ?? parseFloat(order.total.toString());

    // Restore stock if full refund
    if (!amount || amount === parseFloat(order.total.toString())) {
      await this.restoreStock(order.items);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        refundedAt: new Date(),
        refundAmount: new Prisma.Decimal(refundAmount),
        refundReason: reason,
      },
    });

    await this.usersService.createNotification(order.userId, {
      type: 'order_status',
      title: `Возврат по заказу ${order.orderNumber}`,
      message: reason ? `Причина: ${reason}` : 'Оформлен возврат средств',
    });

    return updated;
  }

  async updateTracking(id: string, trackingNumber: string) {
    return this.prisma.order.update({
      where: { id },
      data: { trackingNumber },
    });
  }

  async addNote(id: string, note: string) {
    const order = await this.findOne(id);
    const existingNotes = order.adminNotes || '';
    const newNote = `[${new Date().toISOString()}] ${note}`;

    return this.prisma.order.update({
      where: { id },
      data: {
        adminNotes: existingNotes ? `${existingNotes}\n${newNote}` : newNote,
      },
    });
  }

  // Payments
  async confirmPayment(orderId: string, paymentId: string, transactionId?: string) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        transactionId,
      },
    });

    return this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'PAID' },
    });
  }

  async refundPayment(paymentId: string, amount?: number, reason?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    const refundAmount = amount ?? parseFloat(payment.amount.toString());

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundedAt: new Date(),
        refundAmount: new Prisma.Decimal(refundAmount),
        refundReason: reason,
      },
    });
  }

  // Statistics
  async getStats(dateFrom?: string, dateTo?: string) {
    const where: Prisma.OrderWhereInput = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      revenue,
      avgOrderValue,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.order.count({ where: { ...where, status: 'PROCESSING' } }),
      this.prisma.order.count({ where: { ...where, status: 'SHIPPED' } }),
      this.prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.order.count({ where: { ...where, status: 'REFUNDED' } }),
      this.prisma.order.aggregate({
        where: { ...where, paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where,
        _avg: { total: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      refundedOrders,
      revenue: revenue._sum.total || 0,
      avgOrderValue: avgOrderValue._avg.total || 0,
    };
  }

  // Shipping Methods
  async getShippingMethods() {
    return this.prisma.shippingMethod.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async createShippingMethod(data: {
    name: string;
    code: string;
    description?: string;
    price: number;
    freeFromAmount?: number;
    minDeliveryDays?: number;
    maxDeliveryDays?: number;
    isActive?: boolean;
  }) {
    return this.prisma.shippingMethod.create({
      data: {
        ...data,
        price: new Prisma.Decimal(data.price),
        freeFromAmount: data.freeFromAmount ? new Prisma.Decimal(data.freeFromAmount) : null,
      },
    });
  }

  async updateShippingMethod(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      freeFromAmount: number;
      minDeliveryDays: number;
      maxDeliveryDays: number;
      isActive: boolean;
      order: number;
    }>,
  ) {
    const updateData: Prisma.ShippingMethodUpdateInput = {
      name: data.name,
      description: data.description,
      minDeliveryDays: data.minDeliveryDays,
      maxDeliveryDays: data.maxDeliveryDays,
      isActive: data.isActive,
      order: data.order,
    };
    if (data.price !== undefined) {
      updateData.price = new Prisma.Decimal(data.price);
    }
    if (data.freeFromAmount !== undefined) {
      updateData.freeFromAmount = new Prisma.Decimal(data.freeFromAmount);
    }

    return this.prisma.shippingMethod.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteShippingMethod(id: string) {
    return this.prisma.shippingMethod.delete({
      where: { id },
    });
  }

  // Payment Methods
  async getPaymentMethods() {
    return this.prisma.paymentMethod.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async createPaymentMethod(data: {
    name: string;
    code: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
  }) {
    return this.prisma.paymentMethod.create({
      data,
    });
  }

  async updatePaymentMethod(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      icon: string;
      isActive: boolean;
      order: number;
    }>,
  ) {
    return this.prisma.paymentMethod.update({
      where: { id },
      data,
    });
  }

  async deletePaymentMethod(id: string) {
    return this.prisma.paymentMethod.delete({
      where: { id },
    });
  }
}
