import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { OrderMailService } from '../../orders/services/order-mail.service';
import { AdminOrdersQueryService } from './admin-orders-query.service';
import { AdminOrdersDeliverySettingsService } from './admin-orders-delivery-settings.service';

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

@Injectable()
export class AdminOrdersMutationsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private orderMailService: OrderMailService,
    private configService: ConfigService,
    private query: AdminOrdersQueryService,
    private deliverySettings: AdminOrdersDeliverySettingsService,
  ) {}

  private async recordOrderEvent(
    orderId: string,
    type: string,
    actor: 'customer' | 'manager',
    userId?: string | null,
  ): Promise<void> {
    await this.prisma.orderEvent.create({
      data: {
        orderId,
        type,
        actor,
        userId: userId ?? null,
      },
    });
  }

  /** Вернуть остатки на склад при отмене заказа (истечение 60 мин или отмена покупателем). */

  async deleteOrder(id: string): Promise<{ id: string }> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    await this.prisma.order.delete({ where: { id } });
    return { id };
  }

  /** Обновить только комментарий менеджера к пункту заказа (рекомендации по замене/количеству для покупателя). */
  async updateOrderItem(
    orderId: string,
    itemId: string,
    data: { managerComment?: string | null },
    managerId?: string,
  ) {
    const order = await this.query.findOne(orderId);
    const item = order.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Пункт заказа не найден');
    }

    const managerComment =
      data.managerComment !== undefined ? data.managerComment || null : undefined;
    if (managerComment === undefined) {
      return this.query.findOne(orderId);
    }

    await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { managerComment },
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: { adminEditedAt: new Date() },
    });

    await this.recordOrderEvent(orderId, 'item_comment_edited', 'manager', managerId);

    const orderUserId = order.userId;
    if (orderUserId) {
      const productName = item.product?.name ?? 'товар';
      await this.usersService.createNotification(orderUserId, {
        type: 'order_comment',
        title: `Рекомендации по заказу ${order.orderNumber}`,
        message: `Менеджер оставил рекомендации по позиции «${productName}». Откройте корзину, чтобы ознакомиться и при необходимости внести изменения.`,
      });
    }

    return this.query.findOne(orderId);
  }

  /** Пересчитать итоги заказа по текущим пунктам. */
  private async recalculateOrderTotals(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, orderServiceItems: true },
    });
    if (!order) return;

    const config = await this.deliverySettings.getDeliveryConfig();
    const itemsSubtotal = order.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
    const servicesSubtotal = (order.orderServiceItems ?? []).reduce(
      (sum, i) => sum + Number(i.amount),
      0,
    );
    const subtotal = itemsSubtotal + servicesSubtotal;
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
    managerId?: string,
  ) {
    await this.query.findOne(orderId);
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
      return this.query.findOne(orderId);
    }
    updateData.adminEditedAt = new Date();
    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
    await this.recordOrderEvent(orderId, 'delivery_edited', 'manager', managerId);
    await this.recalculateOrderTotals(orderId);
    return this.query.findOne(orderId);
  }

  /** Отправить заказ на доработку покупателю (с комментариями менеджера). */
  async sendBackToCustomer(orderId: string, comment?: string, managerId?: string) {
    const order = await this.query.findOne(orderId);
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'RETURNED_FOR_CORRECTION',
        returnedForCorrectionAt: new Date(),
        returnedForCorrectionComment: comment || null,
        ...(managerId ? { processedByManager: { connect: { id: managerId } } } : {}),
      },
    });
    await this.recordOrderEvent(orderId, 'returned_for_correction', 'manager', managerId);
    await this.usersService.createNotification(order.userId, {
      type: 'order_status',
      title: `Заказ ${order.orderNumber} отправлен на доработку`,
      message: comment || 'Менеджер оставил комментарии по заказу. Пожалуйста, внесите правки.',
    });
    return this.query.findOne(orderId);
  }

  /** Отправить заказ на email покупателя (после проверки). Генерирует ссылку для просмотра и оплаты. */
  async sendOrderToCustomerEmail(
    orderId: string,
    managerId: string,
  ): Promise<{ sent: boolean; error?: string }> {
    const order = await this.query.findOne(orderId);
    const customerEmail = (order as { customerEmail?: string | null }).customerEmail;
    const email = order.createdByManagerId ? customerEmail : order.user?.email || customerEmail;
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
      itemsCount:
        order.items.length +
        (Array.isArray((order as { orderServiceItems?: unknown[] }).orderServiceItems)
          ? (order as { orderServiceItems: unknown[] }).orderServiceItems.length
          : 0),
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
        processedByManager: { connect: { id: managerId } },
      },
    });
    await this.recordOrderEvent(orderId, 'sent_to_email', 'manager', managerId);
    return { sent: true };
  }

  /** Обновить данные покупателя (email/телефон/имя/фамилия) для заказа. */
  async updateOrderCustomer(
    orderId: string,
    data: {
      customerEmail?: string | null;
      customerPhone?: string | null;
      customerFirstName?: string | null;
      customerMiddleName?: string | null;
      customerLastName?: string | null;
    },
    managerId?: string,
  ) {
    await this.query.findOne(orderId);
    const updateData: Prisma.OrderUpdateInput = {};
    if (data.customerEmail !== undefined) {
      updateData.customerEmail = data.customerEmail?.trim().toLowerCase() || null;
    }
    if (data.customerPhone !== undefined) {
      updateData.customerPhone = data.customerPhone?.trim() || null;
    }
    if (data.customerFirstName !== undefined) {
      updateData.customerFirstName = data.customerFirstName?.trim() || null;
    }
    if (data.customerMiddleName !== undefined) {
      updateData.customerMiddleName = data.customerMiddleName?.trim() || null;
    }
    if (data.customerLastName !== undefined) {
      updateData.customerLastName = data.customerLastName?.trim() || null;
    }
    if (Object.keys(updateData).length === 0) {
      return this.query.findOne(orderId);
    }
    await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
    await this.recordOrderEvent(orderId, 'customer_edited', 'manager', managerId);
    return this.query.findOne(orderId);
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

  async updateStatus(id: string, status: string, managerId?: string) {
    const order = await this.query.findOne(id);

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
        if (managerId) {
          updateData.processedByManager = { connect: { id: managerId } };
        }
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
        await this.query.restoreStock(order.items);
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

    const statusEventType: Record<string, string> = {
      APPROVED: 'approved',
      SHIPPED: 'shipped',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    };
    if (statusEventType[status]) {
      await this.recordOrderEvent(id, statusEventType[status], 'manager', managerId);
    }

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
    const order = await this.query.findOne(id);

    if (['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order with status ${order.status}`);
    }

    // Restore stock
    await this.query.restoreStock(order.items);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    await this.recordOrderEvent(id, 'cancelled', 'manager', undefined);

    await this.usersService.createNotification(order.userId, {
      type: 'order_status',
      title: `Заказ ${order.orderNumber} отменён`,
      message: reason ? `Причина: ${reason}` : 'Заказ отменён',
    });

    return updated;
  }

  async refundOrder(id: string, amount?: number, reason?: string) {
    const order = await this.query.findOne(id);

    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestException('Cannot refund unpaid order');
    }

    const refundAmount = amount ?? parseFloat(order.total.toString());

    // Restore stock if full refund
    if (!amount || amount === parseFloat(order.total.toString())) {
      await this.query.restoreStock(order.items);
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

    await this.recordOrderEvent(id, 'refunded', 'manager', undefined);

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
    const order = await this.query.findOne(id);
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
}
