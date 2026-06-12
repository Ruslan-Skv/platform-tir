import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import {
  CartProductLine,
  CartServiceLine,
  ORDER_ADMIN_ROLES,
  ORDER_SUBMIT_RESPONSE_INCLUDE,
  fetchOrderSubmitResponse,
  isOrderManagerRole,
  mapServiceLinesForCreate,
  mergeCartProductLinesIntoOrder,
  replaceServiceLinesOnOrder,
} from './orders-cart-submit-shared';

export type SubmitDeliveryFields = {
  shippingCost: number;
  carryCost: number;
  shippingMethodId: string | null;
  shippingAddressId: string | null;
  deliveryType: string | null;
  deliveryFloor: number | null;
  deliveryHasElevator: boolean | null;
  preferredDeliveryTime: string | null;
  tax: number;
  total: number;
};

@Injectable()
export class OrdersCartSubmitFlowsService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  async createServicesOnlyOrder(
    userId: string,
    role: string | undefined,
    serviceLines: CartServiceLine[],
    servicesSubtotal: number,
  ) {
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const managerRole = isOrderManagerRole(role);

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        createdByManagerId: managerRole ? userId : null,
        processedByManagerId: managerRole ? userId : null,
        status: 'PENDING_REVIEW',
        subtotal: servicesSubtotal,
        tax: 0,
        shippingCost: 0,
        carryCost: null,
        total: servicesSubtotal,
        submittedForReviewAt: new Date(),
        orderServiceItems: { create: mapServiceLinesForCreate(serviceLines) },
      },
      include: ORDER_SUBMIT_RESPONSE_INCLUDE,
    });

    await this.notifyAdmins(
      'Новый заказ на проверку',
      `Заказ ${order.orderNumber} ожидает проверки.`,
    );
    if (!managerRole) {
      await this.usersService.createNotification(userId, {
        type: 'order_status',
        title: `Заказ ${order.orderNumber} отправлен на проверку`,
        message: 'Заказ принят на проверку. Обычно проверка занимает около 15 минут.',
      });
    }
    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'submitted_for_review',
        actor: managerRole ? 'manager' : 'customer',
        userId: managerRole ? userId : order.userId,
      },
    });
    return order;
  }

  async appendToExistingOrder(args: {
    orderId: string;
    orderNumber: string;
    userId: string;
    orderItems: CartProductLine[];
    serviceLines: CartServiceLine[];
    addedSubtotal: number;
    existingSubtotal: number;
    existingShipping: number;
    existingCarry: number;
    orderUpdate: Prisma.OrderUpdateInput;
    adminTitle: string;
    adminMessage: string;
    customerTitle: string;
    customerMessage: string;
    eventType: string;
    cartItemIdsToClear?: string[];
  }) {
    const {
      orderId,
      userId,
      orderItems,
      serviceLines,
      addedSubtotal,
      existingSubtotal,
      existingShipping,
      existingCarry,
      orderUpdate,
      adminTitle,
      adminMessage,
      customerTitle,
      customerMessage,
      eventType,
      cartItemIdsToClear,
    } = args;

    await mergeCartProductLinesIntoOrder(this.prisma, orderId, orderItems);
    await replaceServiceLinesOnOrder(this.prisma, orderId, serviceLines);

    if (cartItemIdsToClear?.length) {
      await this.prisma.cartItem.deleteMany({
        where: { id: { in: cartItemIdsToClear }, userId },
      });
    }

    const newSubtotal = existingSubtotal + addedSubtotal;
    const newTotal = newSubtotal + existingShipping + existingCarry;

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        ...orderUpdate,
        subtotal: newSubtotal,
        total: newTotal,
      },
    });

    await this.notifyAdmins(adminTitle, adminMessage);
    await this.usersService.createNotification(userId, {
      type: 'order_status',
      title: customerTitle,
      message: customerMessage,
    });
    await this.prisma.orderEvent.create({
      data: { orderId, type: eventType, actor: 'customer', userId },
    });

    return fetchOrderSubmitResponse(this.prisma, orderId);
  }

  async resubmitReturnedOrder(
    userId: string,
    returnedOrderId: string,
    orderItems: CartProductLine[],
    serviceLines: CartServiceLine[],
    delivery: SubmitDeliveryFields & { subtotal: number },
  ) {
    const returnedOrder = await this.prisma.order.findUniqueOrThrow({
      where: { id: returnedOrderId },
    });

    await this.prisma.$transaction([
      this.prisma.orderItem.deleteMany({ where: { orderId: returnedOrderId } }),
      this.prisma.orderServiceItem.deleteMany({ where: { orderId: returnedOrderId } }),
      this.prisma.order.update({
        where: { id: returnedOrderId },
        data: {
          status: 'PENDING_REVIEW',
          submittedForReviewAt: new Date(),
          returnedForCorrectionAt: null,
          returnedForCorrectionComment: null,
          shippingAddressId: delivery.shippingAddressId,
          shippingMethodId: delivery.shippingMethodId,
          deliveryType: delivery.deliveryType,
          deliveryFloor: delivery.deliveryFloor,
          deliveryHasElevator: delivery.deliveryHasElevator,
          preferredDeliveryTime: delivery.preferredDeliveryTime,
          subtotal: delivery.subtotal,
          tax: delivery.tax,
          shippingCost: delivery.shippingCost,
          carryCost: delivery.carryCost > 0 ? delivery.carryCost : null,
          total: delivery.total,
        },
      }),
    ]);

    await this.prisma.orderItem.createMany({
      data: orderItems.map((oi) => ({
        orderId: returnedOrderId,
        productId: oi.productId,
        quantity: oi.quantity,
        price: oi.price,
        size: oi.size,
        openingSide: oi.openingSide,
        cardVariantId: oi.cardVariantId,
      })),
    });
    if (serviceLines.length > 0) {
      await this.prisma.orderServiceItem.createMany({
        data: serviceLines.map((l) => ({
          orderId: returnedOrderId,
          serviceCatalogItemId: l.serviceCatalogItemId,
          name: l.name,
          categoryName: l.categoryName,
          roomName: l.roomName ?? null,
          unit: l.unit,
          quantity: l.quantity,
          price: l.price,
          amount: l.amount,
        })),
      });
    }

    await this.notifyAdmins(
      'Заказ повторно отправлен на проверку',
      `Заказ ${returnedOrder.orderNumber} повторно отправлен на проверку после доработки.`,
    );
    await this.usersService.createNotification(userId, {
      type: 'order_status',
      title: `Заказ ${returnedOrder.orderNumber} повторно отправлен на проверку`,
      message: 'Заказ после доработки принят на проверку. Обычно проверка занимает около 15 минут.',
    });
    await this.prisma.orderEvent.create({
      data: {
        orderId: returnedOrderId,
        type: 'submitted_for_review',
        actor: 'customer',
        userId,
      },
    });

    return fetchOrderSubmitResponse(this.prisma, returnedOrderId);
  }

  async createNewProductOrder(
    userId: string,
    role: string | undefined,
    orderItems: CartProductLine[],
    serviceLines: CartServiceLine[],
    delivery: SubmitDeliveryFields & { subtotal: number },
  ) {
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const managerRole = isOrderManagerRole(role);

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        createdByManagerId: managerRole ? userId : null,
        processedByManagerId: managerRole ? userId : null,
        status: 'PENDING_REVIEW',
        shippingAddressId: delivery.shippingAddressId,
        shippingMethodId: delivery.shippingMethodId,
        deliveryType: delivery.deliveryType,
        deliveryFloor: delivery.deliveryFloor,
        deliveryHasElevator: delivery.deliveryHasElevator,
        preferredDeliveryTime: delivery.preferredDeliveryTime,
        submittedForReviewAt: new Date(),
        subtotal: delivery.subtotal,
        tax: delivery.tax,
        shippingCost: delivery.shippingCost,
        carryCost: delivery.carryCost > 0 ? delivery.carryCost : null,
        total: delivery.total,
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
        ...(serviceLines.length > 0 && {
          orderServiceItems: { create: mapServiceLinesForCreate(serviceLines) },
        }),
      },
      include: ORDER_SUBMIT_RESPONSE_INCLUDE,
    });

    await this.notifyAdmins(
      'Новый заказ на проверку',
      `Заказ ${order.orderNumber} ожидает проверки.`,
    );
    if (!managerRole) {
      await this.usersService.createNotification(order.userId, {
        type: 'order_status',
        title: `Заказ ${order.orderNumber} отправлен на проверку`,
        message:
          'Заказ принят на проверку. Обычно проверка занимает около 15 минут. Вы получите уведомление, когда менеджер проверит заказ.',
      });
    }
    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'submitted_for_review',
        actor: managerRole ? 'manager' : 'customer',
        userId: managerRole ? userId : order.userId,
      },
    });
    return order;
  }

  private async notifyAdmins(title: string, message: string) {
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ORDER_ADMIN_ROLES }, isActive: true },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) =>
        this.usersService.createNotification(a.id, {
          type: 'new_order',
          title,
          message,
        }),
      ),
    );
  }
}
