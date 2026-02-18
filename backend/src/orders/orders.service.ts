import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '@prisma/client';
import type { CalculateDeliveryDto } from './dto/calculate-delivery.dto';
import { DeliveryType } from './dto/calculate-delivery.dto';
import type { SubmitFromCartDto } from './dto/submit-from-cart.dto';
import { Prisma } from '@prisma/client';

/** Время действия статуса «Заказ проверен» (минуты). После истечения заказ возвращается в «На проверке». */
const APPROVAL_VALID_MINUTES = 60;
const APPROVAL_VALID_MS = APPROVAL_VALID_MINUTES * 60 * 1000;

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
   * Список населённых пунктов и режим оплаты доставки (для корзины).
   */
  async getDeliverySettlements(): Promise<{
    settlements: Array<{ name: string; price: number }>;
    deliveryPaymentMode: 'WITH_ORDER' | 'ON_SITE';
  }> {
    const config = await this.getDeliveryConfig();
    const mode = config.deliveryPaymentMode === 'ON_SITE' ? 'ON_SITE' : 'WITH_ORDER';
    return {
      settlements: (config.settlements ?? []).map((s) => ({
        name: s.name,
        price: Number(s.price),
      })),
      deliveryPaymentMode: mode,
    };
  }

  /**
   * Список активных способов доставки (для выбора в корзине).
   */
  async getShippingMethods() {
    return this.prisma.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Конфиг расчёта доставки (одна запись). Если нет — создаём с дефолтами.
   */
  private async getDeliveryConfig() {
    let config = await this.prisma.deliveryConfig.findFirst({
      include: { settlements: { orderBy: { order: 'asc' } } },
    });
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
        include: { settlements: { orderBy: { order: 'asc' } } },
      });
    }
    return config;
  }

  /**
   * Базовая стоимость доставки (из первого активного способа или 0). Используется при submit без формы доставки.
   */
  private async getBaseDeliveryCost(
    subtotal: number,
  ): Promise<{ cost: number; methodId: string | null }> {
    const method = await this.prisma.shippingMethod.findFirst({
      where: { isActive: true },
      orderBy: { order: 'asc' },
    });
    if (!method) return { cost: 0, methodId: null };
    const price = Number(method.price);
    const freeFrom = method.freeFromAmount != null ? Number(method.freeFromAmount) : null;
    const cost = freeFrom != null && subtotal >= freeFrom ? 0 : price;
    return { cost, methodId: method.id };
  }

  /**
   * Расчёт стоимости доставки по конфигу: lookup по населённому пункту, иначе за км; грузчики по массе и габаритам.
   */
  async calculateDelivery(
    userId: string,
    dto: CalculateDeliveryDto,
  ): Promise<{ deliveryCost: number; carryCost: number; totalShippingCost: number }> {
    const config = await this.getDeliveryConfig();
    const cityNorm = (dto.city || '').trim().toLowerCase();

    const settlement = config.settlements?.find(
      (s) => cityNorm && cityNorm.includes((s.name || '').trim().toLowerCase()),
    );
    const isInSettlementsList = !!settlement;
    const deliveryCost = settlement
      ? Number(settlement.price)
      : Math.max(0, dto.distanceKm ?? 0) * Number(config.deliveryPricePerKmOutside);

    let carryCost = 0;
    if (dto.deliveryType === DeliveryType.TO_APARTMENT) {
      const cartItems = await this.cartService.getCartItems(userId);
      const productIds = [
        ...new Set([
          ...cartItems.filter((i) => i.productId).map((i) => i.productId as string),
          ...cartItems
            .filter((i) => i.component && (i.component as { productId?: string }).productId)
            .map((i) => (i.component as { productId: string }).productId),
        ]),
      ].filter(Boolean);
      const products = productIds.length
        ? await this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, weight: true, width: true, height: true, length: true },
          })
        : [];
      let totalWeight = 0;
      let totalVolume = 0;
      for (const item of cartItems) {
        const qty = Math.max(1, Math.round(Number(item.quantity)));
        const productId =
          item.productId ?? (item.component as { productId?: string } | null)?.productId;
        const p = productId ? products.find((x) => x.id === productId) : null;
        const w = p?.weight != null ? Number(p.weight) : 20;
        const vol =
          p?.width != null && p?.height != null && p?.length != null
            ? Number(p.width) * Number(p.height) * Number(p.length) * 1e-6
            : 0.1;
        totalWeight += w * qty;
        totalVolume += vol * qty;
      }
      const kgPerPerson = Number(config.moversKgPerPerson) || 50;
      const volPerPerson =
        config.moversVolumePerPerson != null ? Number(config.moversVolumePerPerson) : null;
      const byWeight = kgPerPerson > 0 ? Math.ceil(totalWeight / kgPerPerson) : 0;
      const byVolume =
        volPerPerson != null && volPerPerson > 0 ? Math.ceil(totalVolume / volPerPerson) : 0;
      const moversCount = Math.max(1, byWeight, byVolume);
      const moversPrice = isInSettlementsList
        ? Number(config.moversPriceMurmansk)
        : Number(config.moversPriceOutside);
      carryCost = moversCount * moversPrice;
    }

    return {
      deliveryCost,
      carryCost,
      totalShippingCost: deliveryCost + carryCost,
    };
  }

  /**
   * Создать заказ из текущей корзины со статусом «На проверке».
   * При передаче deliveryAddress + deliveryType: создаётся адрес, считается доставка и подъём.
   * Иначе при указании shippingMethodId стоимость доставки включается по старой схеме (учёт freeFromAmount).
   */
  async submitFromCart(userId: string, dto?: SubmitFromCartDto) {
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
      const calc = await this.calculateDelivery(userId, {
        subtotal,
        city: addr.city,
        distanceKm: dto.distanceKm,
        deliveryType: dto.deliveryType,
        deliveryFloor: dto.deliveryFloor,
        deliveryHasElevator: dto.deliveryHasElevator,
      });
      shippingCost = calc.deliveryCost;
      carryCostFromCalc = calc.carryCost;
      const base = await this.getBaseDeliveryCost(subtotal);
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

    const config = await this.getDeliveryConfig();
    const tax = 0;
    const carryCost =
      shippingAddressId != null && typeof carryCostFromCalc === 'number' ? carryCostFromCalc : 0;
    const total =
      config.deliveryPaymentMode === 'ON_SITE' ? subtotal : subtotal + shippingCost + carryCost;
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        status: 'PENDING_REVIEW',
        shippingAddressId,
        shippingMethodId,
        deliveryType,
        deliveryFloor,
        deliveryHasElevator,
        preferredDeliveryTime,
        submittedForReviewAt: new Date(),
        subtotal,
        tax,
        shippingCost,
        carryCost: carryCost > 0 ? carryCost : null,
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
    await Promise.all([
      ...admins.map((a) =>
        this.usersService.createNotification(a.id, {
          type: 'new_order',
          title,
          message,
        }),
      ),
      this.usersService.createNotification(order.userId, {
        type: 'order_status',
        title: `Заказ ${order.orderNumber} отправлен на проверку`,
        message:
          'Заказ принят на проверку. Обычно проверка занимает около 15 минут. Вы получите уведомление, когда менеджер проверит заказ.',
      }),
    ]);

    return order;
  }

  /**
   * Добавить позицию из корзины в заказ на проверке (пока проверка не завершена).
   * Позиция удаляется из корзины. Админам уходит уведомление «В заказ добавлен новый товар».
   */
  async addCartItemToOrder(orderId: string, cartItemId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('Нельзя изменить чужой заказ');
    }
    if (order.status !== 'PENDING_REVIEW' && order.status !== 'RETURNED_FOR_CORRECTION') {
      throw new BadRequestException(
        'Добавить товар можно только в заказ в статусе «На проверке» или «На доработке»',
      );
    }

    const cartItem = await this.prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
      include: {
        product: true,
        component: { include: { product: true } },
      },
    });
    if (!cartItem) {
      throw new NotFoundException('Позиция в корзине не найдена');
    }

    let productId: string;
    let price: number;
    const qty = Math.max(1, Math.round(Number(cartItem.quantity)));

    if (cartItem.productId && cartItem.product) {
      productId = cartItem.product.id;
      price = parseFloat(cartItem.product.price.toString());
    } else if (cartItem.componentId && cartItem.component) {
      productId = cartItem.component.productId;
      price = parseFloat(cartItem.component.price.toString());
    } else {
      throw new BadRequestException('Невозможно добавить эту позицию в заказ');
    }

    await this.prisma.orderItem.create({
      data: {
        orderId,
        productId,
        quantity: qty,
        price,
        size: cartItem.size ?? null,
        openingSide: cartItem.openingSide ?? null,
        cardVariantId: cartItem.cardVariantId ?? null,
      },
    });

    await this.recalculateOrderTotals(orderId);

    const adminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    const admins = await this.prisma.user.findMany({
      where: { role: { in: adminRoles }, isActive: true },
      select: { id: true },
    });
    const title = 'В заказ добавлен новый товар';
    const message = `В заказ ${order.orderNumber} покупатель добавил новый товар.`;
    await Promise.all(
      admins.map((a) =>
        this.usersService.createNotification(a.id, {
          type: 'order_item_added',
          title,
          message,
        }),
      ),
    );

    return this.findOne(orderId, userId, undefined);
  }

  private async recalculateOrderTotals(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const config = await this.getDeliveryConfig();
    const subtotal = order.items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
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
        tax: 0,
        total,
      },
    });
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

    const now = Date.now();
    const expiryCancelReason =
      'Время на оформление заказа истекло (60 мин). Товары остаются в корзине.';
    for (const order of orders) {
      if (
        order.status === 'APPROVED' &&
        order.approvedAt &&
        now - new Date(order.approvedAt).getTime() > APPROVAL_VALID_MS
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
    const deliveryConfig = await this.getDeliveryConfig();
    const paymentMode = deliveryConfig.deliveryPaymentMode === 'ON_SITE' ? 'ON_SITE' : 'WITH_ORDER';
    return orders.map((order) => ({
      ...order,
      deliveryPaymentMode: paymentMode,
      ...(paymentMode === 'ON_SITE'
        ? { total: Number(order.subtotal) - Number(order.discount) }
        : {}),
    }));
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
          items: { include: { product: true } },
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

    const deliveryConfig = await this.getDeliveryConfig();
    const paymentMode = deliveryConfig.deliveryPaymentMode === 'ON_SITE' ? 'ON_SITE' : 'WITH_ORDER';
    return {
      ...order,
      deliveryPaymentMode: paymentMode,
      ...(paymentMode === 'ON_SITE'
        ? { total: Number(order.subtotal) - Number(order.discount) }
        : {}),
    };
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
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        'Отменить можно только заказ в статусе «На проверке», «На доработке» или «Заказ проверен»',
      );
    }
    await this.restoreStock(
      order.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
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
