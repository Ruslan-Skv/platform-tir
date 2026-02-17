import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
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
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params || {};

    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {};

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

  /** Обновить пункт заказа: комментарий менеджера и/или замена товара (с пометкой для покупателя). */
  async updateOrderItem(
    orderId: string,
    itemId: string,
    data: {
      managerComment?: string | null;
      productId?: string;
      quantity?: number;
      replacementNote?: string | null;
    },
  ) {
    const order = await this.findOne(orderId);
    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Пункт заказа не найден');
    }

    const updateData: Prisma.OrderItemUpdateInput = {};
    if (data.managerComment !== undefined) {
      updateData.managerComment = data.managerComment || null;
    }
    if (data.replacementNote !== undefined) {
      updateData.replacementNote = data.replacementNote || null;
    }
    if (data.quantity !== undefined && data.quantity >= 1) {
      updateData.quantity = data.quantity;
    }

    if (data.productId && data.productId !== item.productId) {
      const newProduct = await this.prisma.product.findUnique({
        where: { id: data.productId },
      });
      if (!newProduct) {
        throw new BadRequestException('Товар не найден');
      }
      updateData.replacedFromProduct = { connect: { id: item.productId } };
      updateData.product = { connect: { id: data.productId } };
      updateData.price = newProduct.price;
      if (!updateData.replacementNote && typeof data.replacementNote !== 'string') {
        updateData.replacementNote = `Менеджер заменил товар на: ${newProduct.name}`;
      }
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
    });

    await this.recalculateOrderTotals(orderId);
    return this.findOne(orderId);
  }

  /** Пересчитать итоги заказа по текущим пунктам. */
  private async recalculateOrderTotals(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const subtotal = order.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const tax = 0;
    const shippingCost = Number(order.shippingCost);
    const total = subtotal + shippingCost - Number(order.discount);

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        tax,
        total,
      },
    });
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

  /** Настройки расчёта доставки (Мурманск / за городом, грузчики). */
  async getDeliveryConfig() {
    let config = await this.prisma.deliveryConfig.findFirst();
    if (!config) {
      config = await this.prisma.deliveryConfig.create({
        data: {
          deliveryPriceMurmansk: 500,
          deliveryPricePerKmOutside: 50,
          moversPriceMurmansk: 300,
          moversPriceOutside: 400,
          moversKgPerPerson: 50,
          moversVolumePerPerson: 0.5,
        },
      });
    }
    return config;
  }

  /** Обновить настройки расчёта доставки. */
  async updateDeliveryConfig(data: {
    deliveryPriceMurmansk?: number;
    deliveryPricePerKmOutside?: number;
    moversPriceMurmansk?: number;
    moversPriceOutside?: number;
    moversKgPerPerson?: number;
    moversVolumePerPerson?: number | null;
  }) {
    const config = await this.getDeliveryConfig();
    const updateData: Prisma.DeliveryConfigUpdateInput = {};
    if (data.deliveryPriceMurmansk !== undefined)
      updateData.deliveryPriceMurmansk = data.deliveryPriceMurmansk;
    if (data.deliveryPricePerKmOutside !== undefined)
      updateData.deliveryPricePerKmOutside = data.deliveryPricePerKmOutside;
    if (data.moversPriceMurmansk !== undefined)
      updateData.moversPriceMurmansk = data.moversPriceMurmansk;
    if (data.moversPriceOutside !== undefined)
      updateData.moversPriceOutside = data.moversPriceOutside;
    if (data.moversKgPerPerson !== undefined) updateData.moversKgPerPerson = data.moversKgPerPerson;
    if (data.moversVolumePerPerson !== undefined)
      updateData.moversVolumePerPerson = data.moversVolumePerPerson;
    return this.prisma.deliveryConfig.update({
      where: { id: config.id },
      data: updateData,
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

    // Уведомление в историю пользователя
    await this.usersService.createNotification(order.userId, {
      type: 'order_status',
      title: `Статус заказа ${order.orderNumber} изменён`,
      message: `Новый статус: ${ORDER_STATUS_LABELS[status] ?? status}`,
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
