import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CartService } from '../../cart/cart.service';
import type { SubmitFromCartDto } from '../dto/submit-from-cart.dto';
import { DEFAULT_APPROVAL_VALID_MINUTES, OrdersDeliveryService } from './orders-delivery.service';
import { OrdersCartServiceLinesService } from './orders-cart-service-lines.service';
import type { CartProductLine, CartServiceLine } from './orders-cart-submit-shared';
import { OrdersCartSubmitFlowsService } from './orders-cart-submit-flows.service';

@Injectable()
export class OrdersCartSubmitService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private ordersDelivery: OrdersDeliveryService,
    private serviceLines: OrdersCartServiceLinesService,
    private flows: OrdersCartSubmitFlowsService,
  ) {}

  /**
   * Создать заказ из текущей корзины со статусом «На проверке».
   */
  async submitFromCart(userId: string, dto?: SubmitFromCartDto, role?: string): Promise<object> {
    const [cartItemsRaw, cartServiceItems] = await Promise.all([
      this.cartService.getCartItems(userId),
      this.cartService.getCartServiceItems(userId),
    ]);
    if (!cartItemsRaw.length && !cartServiceItems.length) {
      throw new BadRequestException('Корзина пуста');
    }

    let cartItems = cartItemsRaw;
    if (dto?.cartItemIds?.length) {
      const idsSet = new Set(dto.cartItemIds);
      cartItems = cartItems.filter((item) => idsSet.has(item.id));
    }

    const { orderItems, subtotal: productsSubtotal } = this.parseProductCartLines(cartItems);
    const hasProductItems = orderItems.length > 0;
    const hasServiceItems = cartServiceItems.length > 0;
    if (!hasProductItems && !hasServiceItems) {
      throw new BadRequestException('В корзине нет позиций для заказа');
    }

    let serviceLines: CartServiceLine[] = [];
    let servicesSubtotal = 0;
    if (hasServiceItems) {
      const built = await this.serviceLines.buildServiceLinesFromCartAndClear(cartServiceItems);
      serviceLines = built.lines;
      servicesSubtotal = built.subtotal;
    }
    const subtotal = productsSubtotal + servicesSubtotal;

    if (!hasProductItems && hasServiceItems) {
      if (!serviceLines.length) {
        throw new BadRequestException('Не удалось сформировать позиции услуг');
      }
      return this.flows.createServicesOnlyOrder(userId, role, serviceLines, servicesSubtotal);
    }

    const delivery = await this.resolveDelivery(userId, dto, cartItems, subtotal);
    const { activeOrders, approvedNotExpired, approvedValid } =
      await this.loadOrderConstraints(userId);

    const pendingReviewOrder = activeOrders.find((o) => o.status === 'PENDING_REVIEW');
    if (
      pendingReviewOrder &&
      dto?.addToPendingReview === true &&
      (dto?.cartItemIds?.length || serviceLines.length > 0)
    ) {
      const hasServiceLines = serviceLines.length > 0;
      return this.flows.appendToExistingOrder({
        orderId: pendingReviewOrder.id,
        orderNumber: pendingReviewOrder.orderNumber,
        userId,
        orderItems,
        serviceLines,
        addedSubtotal: subtotal,
        existingSubtotal: parseFloat(pendingReviewOrder.subtotal.toString()),
        existingShipping: parseFloat(pendingReviewOrder.shippingCost.toString()),
        existingCarry: pendingReviewOrder.carryCost
          ? parseFloat(pendingReviewOrder.carryCost.toString())
          : 0,
        orderUpdate: { submittedForReviewAt: new Date() },
        adminTitle: hasServiceLines
          ? 'В заказ на проверке добавлены товары/услуги'
          : 'В заказ на проверке добавлены новые товары',
        adminMessage: hasServiceLines
          ? `В заказ ${pendingReviewOrder.orderNumber} покупатель добавил новые товары/услуги. Заказ обновлён и снова ожидает проверки.`
          : `В заказ ${pendingReviewOrder.orderNumber} покупатель добавил новые товары. Заказ обновлён и снова ожидает проверки.`,
        customerTitle: `Заказ ${pendingReviewOrder.orderNumber} обновлён`,
        customerMessage:
          'Новые товары добавлены к заказу на проверке. Менеджер проверит обновлённый список.',
        eventType: 'add_to_review',
        cartItemIdsToClear: dto?.cartItemIds,
      });
    }

    if (pendingReviewOrder) {
      throw new BadRequestException(
        'У вас уже есть заказ на проверке. Дождитесь обработки или отмените его в корзине.',
      );
    }

    const wantsAddToApproved =
      dto?.addToApproved === true ||
      (dto?.cartItemIds && dto.cartItemIds.length > 0) ||
      serviceLines.length > 0;
    if (approvedValid && approvedNotExpired && wantsAddToApproved) {
      if (!dto?.cartItemIds?.length && serviceLines.length === 0) {
        throw new BadRequestException(
          'Для добавления к проверенному заказу необходимо указать позиции корзины (cartItemIds).',
        );
      }
      return this.flows.appendToExistingOrder({
        orderId: approvedNotExpired.id,
        orderNumber: approvedNotExpired.orderNumber,
        userId,
        orderItems,
        serviceLines,
        addedSubtotal: subtotal,
        existingSubtotal: parseFloat(approvedNotExpired.subtotal.toString()),
        existingShipping: parseFloat(approvedNotExpired.shippingCost.toString()),
        existingCarry: approvedNotExpired.carryCost
          ? parseFloat(approvedNotExpired.carryCost.toString())
          : 0,
        orderUpdate: {
          status: 'PENDING_REVIEW',
          approvedAt: null,
          submittedForReviewAt: new Date(),
        },
        adminTitle: 'В проверенный заказ добавлены новые товары',
        adminMessage: `В заказ ${approvedNotExpired.orderNumber} покупатель добавил новые товары. Заказ снова на проверке.`,
        customerTitle: `Новые товары добавлены к заказу ${approvedNotExpired.orderNumber}`,
        customerMessage:
          'Новые товары добавлены к вашему заказу. Заказ снова отправлен на проверку менеджеру.',
        eventType: 'add_to_approved',
      });
    }

    if (approvedValid) {
      throw new BadRequestException(
        'У вас уже есть проверенный заказ. Оформите его или отмените в корзине, чтобы отправить новые товары отдельно.',
      );
    }

    const returnedOrder = activeOrders.find((o) => o.status === 'RETURNED_FOR_CORRECTION');
    if (returnedOrder) {
      return this.flows.resubmitReturnedOrder(
        userId,
        returnedOrder.id,
        orderItems,
        serviceLines,
        delivery,
      );
    }

    return this.flows.createNewProductOrder(userId, role, orderItems, serviceLines, delivery);
  }

  private parseProductCartLines(cartItems: Awaited<ReturnType<CartService['getCartItems']>>): {
    orderItems: CartProductLine[];
    subtotal: number;
  } {
    const orderItems: CartProductLine[] = [];
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

    return { orderItems, subtotal };
  }

  private async resolveDelivery(
    userId: string,
    dto: SubmitFromCartDto | undefined,
    cartItems: Awaited<ReturnType<CartService['getCartItems']>>,
    subtotal: number,
  ) {
    let shippingCost = 0;
    let carryCostFromCalc: number | undefined;
    let shippingMethodId: string | null = null;
    let shippingAddressId: string | null = null;
    let deliveryType: string | null = null;
    let deliveryFloor: number | null = null;
    let deliveryHasElevator: boolean | null = null;
    let preferredDeliveryTime: string | null = null;

    if (dto?.deliveryAddress && dto?.deliveryType != null) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, phone: true },
      });
      if (!user) throw new ForbiddenException('Пользователь не найден');
      const addr = dto.deliveryAddress;
      const addressRecord = await this.prisma.address.create({
        data: {
          userId,
          street: addr.street,
          city: addr.city,
          postalCode: (addr.postalCode?.trim() || '—').slice(0, 20),
          region: addr.region ?? null,
          country: addr.country ?? 'RU',
          firstName: addr.firstName ?? user.firstName ?? '',
          lastName: addr.lastName ?? user.lastName ?? '',
          phone: (addr.phone ?? user.phone ?? '').trim() || 'не указан',
        },
      });
      shippingAddressId = addressRecord.id;
      const calc = await this.ordersDelivery.calculateDelivery(
        userId,
        {
          subtotal,
          city: addr.city,
          distanceKm: dto.distanceKm,
          deliveryType: dto.deliveryType,
          deliveryFloor: dto.deliveryFloor,
          deliveryHasElevator: dto.deliveryHasElevator,
        },
        cartItems,
      );
      shippingCost = calc.deliveryCost;
      carryCostFromCalc = calc.carryCost;
      const base = await this.ordersDelivery.getBaseDeliveryCost(subtotal);
      shippingMethodId = base.methodId;
      deliveryType = dto.deliveryType;
      deliveryFloor = dto.deliveryFloor ?? null;
      deliveryHasElevator = dto.deliveryHasElevator ?? null;
      preferredDeliveryTime = dto.preferredDeliveryTime?.trim() || null;
    } else if (dto?.shippingMethodId) {
      const method = await this.prisma.shippingMethod.findFirst({
        where: { id: dto.shippingMethodId, isActive: true },
      });
      if (method) {
        shippingMethodId = method.id;
        const price = Number(method.price);
        const freeFrom = method.freeFromAmount != null ? Number(method.freeFromAmount) : null;
        shippingCost = freeFrom != null && subtotal >= freeFrom ? 0 : price;
      }
    }

    const config = await this.ordersDelivery.getDeliveryConfig();
    const tax = 0;
    const carryCost =
      shippingAddressId != null && typeof carryCostFromCalc === 'number' ? carryCostFromCalc : 0;
    const total =
      config.deliveryPaymentMode === 'ON_SITE' ? subtotal : subtotal + shippingCost + carryCost;

    return {
      subtotal,
      shippingCost,
      carryCost,
      shippingMethodId,
      shippingAddressId,
      deliveryType,
      deliveryFloor,
      deliveryHasElevator,
      preferredDeliveryTime,
      tax,
      total,
    };
  }

  private async loadOrderConstraints(userId: string) {
    const config = await this.ordersDelivery.getDeliveryConfig();
    const [activeOrders, approvedNotExpired] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          userId,
          status: { in: ['PENDING_REVIEW', 'RETURNED_FOR_CORRECTION'] },
        },
      }),
      this.prisma.order.findFirst({
        where: {
          userId,
          status: 'APPROVED',
          approvedAt: { not: null },
        },
      }),
    ]);

    const approvalValidMs =
      ((config as { approvalValidMinutes?: number }).approvalValidMinutes ??
        DEFAULT_APPROVAL_VALID_MINUTES) *
      60 *
      1000;
    const approvedValid =
      approvedNotExpired?.approvedAt &&
      Date.now() - new Date(approvedNotExpired.approvedAt).getTime() < approvalValidMs;

    return { activeOrders, approvedNotExpired, approvedValid: Boolean(approvedValid) };
  }
}
