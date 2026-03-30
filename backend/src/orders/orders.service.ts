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
import { DeliveryType } from './dto/calculate-delivery.dto';
import type { SubmitFromCartDto } from './dto/submit-from-cart.dto';
import type { SubmitFromCartForCustomerDto } from './dto/submit-from-cart-for-customer.dto';
import type { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { OrderMailService } from './order-mail.service';
import { Prisma } from '@prisma/client';

const DEFAULT_APPROVAL_VALID_MINUTES = 60;

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private usersService: UsersService,
    private orderMailService: OrderMailService,
    private configService: ConfigService,
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
    approvalValidMinutes: number;
  }> {
    const config = await this.getDeliveryConfig();
    const mode = config.deliveryPaymentMode === 'ON_SITE' ? 'ON_SITE' : 'WITH_ORDER';
    const approvalValidMinutes =
      (config as { approvalValidMinutes?: number }).approvalValidMinutes ??
      DEFAULT_APPROVAL_VALID_MINUTES;
    return {
      settlements: (config.settlements ?? []).map((s) => ({
        name: s.name,
        price: Number(s.price),
      })),
      deliveryPaymentMode: mode,
      approvalValidMinutes,
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
          approvalValidMinutes: DEFAULT_APPROVAL_VALID_MINUTES,
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
   * @param optionalCartItems — при указании используются эти позиции вместо корзины (для расчёта при submit с cartItemIds).
   */
  async calculateDelivery(
    userId: string,
    dto: CalculateDeliveryDto,
    optionalCartItems?: Awaited<ReturnType<CartService['getCartItems']>>,
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
    // Доставка «до квартиры»: добавляется стоимость подъёма (грузчики) по конфигу (moversPriceMurmansk / moversPriceOutside).
    // Итоговая надбавка = moversCount * цена за грузчика; при настройке 3000 ₽ за грузчика и одном грузчике получается +3000 ₽.
    if (dto.deliveryType === DeliveryType.TO_APARTMENT) {
      const cartItems = optionalCartItems ?? (await this.cartService.getCartItems(userId));
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
   * Построить позиции услуг из корзины и очистить корзину услуг.
   * Возвращает строки для добавления в Order (orderServiceItems).
   */
  private async buildServiceLinesFromCartAndClear(
    cartServiceItems: Awaited<ReturnType<CartService['getCartServiceItems']>>,
  ): Promise<{
    lines: Array<{
      serviceCatalogItemId: string;
      name: string;
      categoryName: string;
      roomName?: string | null;
      unit: string;
      quantity: number;
      price: number;
      amount: number;
    }>;
    subtotal: number;
  }> {
    if (!cartServiceItems.length) return { lines: [], subtotal: 0 };

    type LineItem = { itemId: string; quantity: number; roomName?: string | null };
    const allLines: { itemId: string; quantity: number; roomName?: string | null }[] = [];
    for (const csi of cartServiceItems) {
      const raw = csi.items as
        | LineItem[]
        | { rooms?: Array<{ name?: string; items: LineItem[] }> }
        | null;
      const rooms = Array.isArray(raw)
        ? [{ name: null, items: raw }]
        : (raw?.rooms ?? []).map((room) => ({
            name: room?.name ?? null,
            items: Array.isArray(room.items) ? room.items : [],
          }));
      for (const room of rooms) {
        const items = Array.isArray(room.items) ? room.items : [];
        for (const li of items) {
          if (li?.itemId && typeof li.quantity === 'number' && li.quantity > 0) {
            allLines.push({
              itemId: li.itemId,
              quantity: li.quantity,
              roomName: room.name ?? li.roomName ?? null,
            });
          }
        }
      }
    }
    if (!allLines.length) return { lines: [], subtotal: 0 };

    const itemIds = [...new Set(allLines.map((l) => l.itemId))];
    const dbItems = await this.prisma.serviceCatalogItem.findMany({
      where: { id: { in: itemIds }, isActive: true },
      include: { category: { select: { name: true } } },
    });
    const idToItem = new Map(dbItems.map((i) => [i.id, i]));

    const lines: Array<{
      serviceCatalogItemId: string;
      name: string;
      categoryName: string;
      roomName?: string | null;
      unit: string;
      quantity: number;
      price: number;
      amount: number;
    }> = [];
    let subtotal = 0;

    for (const line of allLines) {
      const item = idToItem.get(line.itemId);
      if (!item) continue;
      const qty = Math.max(0.01, Number(line.quantity));
      const price = parseFloat(item.price.toString());
      const amount = price * qty;
      subtotal += amount;
      lines.push({
        serviceCatalogItemId: item.id,
        name: item.name,
        categoryName: item.category.name,
        roomName: line.roomName ?? null,
        unit: item.unit,
        quantity: qty,
        price,
        amount,
      });
    }

    for (const csi of cartServiceItems) {
      await this.prisma.cartServiceItem.delete({ where: { id: csi.id } }).catch(() => {});
    }
    return { lines, subtotal };
  }

  /**
   * Создать заказ на услуги из позиций корзины услуг и удалить их из корзины.
   * @deprecated Используется только для submitFromCartForCustomer (только услуги). Для корзины — Order + orderServiceItems.
   */
  private async createServiceOrderFromCartServiceItems(
    cartServiceItems: Awaited<ReturnType<CartService['getCartServiceItems']>>,
    customerUserId: string,
    customerEmail: string,
    customerFirstName?: string | null,
    customerLastName?: string | null,
    customerPhone?: string | null,
    createdByManagerId?: string | null,
  ) {
    if (!cartServiceItems.length) return null;

    type LineItem = { itemId: string; quantity: number };
    const allLines: { itemId: string; quantity: number }[] = [];
    for (const csi of cartServiceItems) {
      const items = csi.items as unknown as LineItem[];
      if (Array.isArray(items)) {
        for (const li of items) {
          if (li?.itemId && typeof li.quantity === 'number' && li.quantity > 0) {
            allLines.push({ itemId: li.itemId, quantity: li.quantity });
          }
        }
      }
    }
    if (!allLines.length) return null;

    const itemIds = [...new Set(allLines.map((l) => l.itemId))];
    const dbItems = await this.prisma.serviceCatalogItem.findMany({
      where: { id: { in: itemIds }, isActive: true },
      include: { category: { select: { name: true } } },
    });
    const idToItem = new Map(dbItems.map((i) => [i.id, i]));

    let total = 0;
    const orderLines: Array<{
      serviceCatalogItemId: string;
      name: string;
      categoryName: string;
      unit: string;
      quantity: number;
      price: number;
      amount: number;
    }> = [];

    for (const line of allLines) {
      const item = idToItem.get(line.itemId);
      if (!item) continue;
      const qty = Math.max(0.01, Number(line.quantity));
      const price = parseFloat(item.price.toString());
      const amount = price * qty;
      total += amount;
      orderLines.push({
        serviceCatalogItemId: item.id,
        name: item.name,
        categoryName: item.category.name,
        unit: item.unit,
        quantity: qty,
        price,
        amount,
      });
    }
    if (!orderLines.length) return null;

    const orderNumber = `SRV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const so = await this.prisma.serviceOrder.create({
      data: {
        orderNumber,
        userId: customerUserId,
        createdByManagerId: createdByManagerId ?? null,
        customerEmail: customerEmail.trim().toLowerCase(),
        customerFirstName: customerFirstName?.trim() || null,
        customerLastName: customerLastName?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
        total,
        status: 'PENDING',
        items: {
          create: orderLines.map((l) => ({
            serviceCatalogItemId: l.serviceCatalogItemId,
            name: l.name,
            categoryName: l.categoryName,
            unit: l.unit,
            quantity: l.quantity,
            price: l.price,
            amount: l.amount,
          })),
        },
      },
      include: {
        items: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    for (const csi of cartServiceItems) {
      await this.prisma.cartServiceItem.delete({ where: { id: csi.id } }).catch(() => {});
    }
    return so;
  }

  /**
   * Создать заказ из текущей корзины со статусом «На проверке».
   * При передаче deliveryAddress + deliveryType: создаётся адрес, считается доставка и подъём.
   * Иначе при указании shippingMethodId стоимость доставки включается по старой схеме (учёт freeFromAmount).
   * Услуги из корзины оформляются в отдельный ServiceOrder.
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

    const hasProductItems = orderItems.length > 0;
    const hasServiceItems = cartServiceItems.length > 0;
    if (!hasProductItems && !hasServiceItems) {
      throw new BadRequestException('В корзине нет позиций для заказа');
    }

    let serviceLines: Array<{
      serviceCatalogItemId: string;
      name: string;
      categoryName: string;
      roomName?: string | null;
      unit: string;
      quantity: number;
      price: number;
      amount: number;
    }> = [];
    let servicesSubtotal = 0;
    if (hasServiceItems) {
      const built = await this.buildServiceLinesFromCartAndClear(cartServiceItems);
      serviceLines = built.lines;
      servicesSubtotal = built.subtotal;
      subtotal += servicesSubtotal;
    }

    // Только услуги — создаём один Order с orderServiceItems (как и товары+услуги)
    if (!hasProductItems && hasServiceItems) {
      if (!serviceLines.length)
        throw new BadRequestException('Не удалось сформировать позиции услуг');

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const isManagerRole = [
        'SUPER_ADMIN',
        'ADMIN',
        'MANAGER',
        'CONTENT_MANAGER',
        'MODERATOR',
        'SUPPORT',
      ].includes((role ?? '') as UserRole);

      const order = await this.prisma.order.create({
        data: {
          orderNumber,
          userId,
          createdByManagerId: isManagerRole ? userId : null,
          processedByManagerId: isManagerRole ? userId : null,
          status: 'PENDING_REVIEW',
          subtotal: servicesSubtotal,
          tax: 0,
          shippingCost: 0,
          carryCost: null,
          total: servicesSubtotal,
          submittedForReviewAt: new Date(),
          orderServiceItems: {
            create: serviceLines.map((l) => ({
              serviceCatalogItemId: l.serviceCatalogItemId,
              name: l.name,
              categoryName: l.categoryName,
              roomName: l.roomName ?? null,
              unit: l.unit,
              quantity: l.quantity,
              price: l.price,
              amount: l.amount,
            })),
          },
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
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });

      const adminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
      const admins = await this.prisma.user.findMany({
        where: { role: { in: adminRoles }, isActive: true },
        select: { id: true },
      });
      await Promise.all(
        admins.map((a) =>
          this.usersService.createNotification(a.id, {
            type: 'new_order',
            title: 'Новый заказ на проверку',
            message: `Заказ ${order.orderNumber} ожидает проверки.`,
          }),
        ),
      );
      if (!isManagerRole) {
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
          actor: isManagerRole ? 'manager' : 'customer',
          userId: isManagerRole ? userId : order.userId,
        },
      });
      return order;
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
      const calc = await this.calculateDelivery(
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

    const activeOrders = await this.prisma.order.findMany({
      where: {
        userId,
        status: { in: ['PENDING_REVIEW', 'RETURNED_FOR_CORRECTION'] },
      },
    });
    const approvedNotExpired = await this.prisma.order.findFirst({
      where: {
        userId,
        status: 'APPROVED',
        approvedAt: { not: null },
      },
    });
    const approvalValidMs =
      ((config as { approvalValidMinutes?: number }).approvalValidMinutes ??
        DEFAULT_APPROVAL_VALID_MINUTES) *
      60 *
      1000;
    const approvedValid =
      approvedNotExpired?.approvedAt &&
      Date.now() - new Date(approvedNotExpired.approvedAt).getTime() < approvalValidMs;

    const pendingReviewOrder = activeOrders.find((o) => o.status === 'PENDING_REVIEW');

    // Добавить новые товары/услуги к заказу, который уже на проверке (addToPendingReview + cartItemIds/услуги).
    // Объединяем с существующими позициями по (productId, size, openingSide), чтобы не дублировать строки.
    if (
      pendingReviewOrder &&
      dto?.addToPendingReview === true &&
      (dto?.cartItemIds?.length || serviceLines.length > 0)
    ) {
      const existingSubtotal = parseFloat(pendingReviewOrder.subtotal.toString());
      const existingShipping = parseFloat(pendingReviewOrder.shippingCost.toString());
      const existingCarry = pendingReviewOrder.carryCost
        ? parseFloat(pendingReviewOrder.carryCost.toString())
        : 0;

      const existingItems = await this.prisma.orderItem.findMany({
        where: { orderId: pendingReviewOrder.id },
      });

      const key = (oi: { productId: string; size: string | null; openingSide: string | null }) =>
        `${oi.productId}|${oi.size ?? ''}|${oi.openingSide ?? ''}`;
      type Group = {
        productId: string;
        quantity: number;
        price: number;
        size: string | null;
        openingSide: string | null;
        cardVariantId: string | null;
      };
      const grouped = new Map<string, Group>();
      for (const oi of orderItems) {
        const k = key(oi);
        const cur = grouped.get(k);
        if (!cur) {
          grouped.set(k, {
            productId: oi.productId,
            quantity: oi.quantity,
            price: oi.price,
            size: oi.size,
            openingSide: oi.openingSide,
            cardVariantId: oi.cardVariantId,
          });
        } else {
          const totalQty = cur.quantity + oi.quantity;
          cur.price = (cur.price * cur.quantity + oi.price * oi.quantity) / totalQty;
          cur.quantity = totalQty;
        }
      }

      const usedExistingIds = new Set<string>();
      for (const [k, g] of grouped) {
        const [productId] = k.split('|');
        const existing = existingItems.find(
          (e) =>
            !usedExistingIds.has(e.id) &&
            e.productId === productId &&
            (e.size ?? '') === (g.size ?? '') &&
            (e.openingSide ?? '') === (g.openingSide ?? ''),
        );
        if (existing) {
          const oldQty = existing.quantity;
          const newQty = oldQty + g.quantity;
          const newPrice =
            (parseFloat(existing.price.toString()) * oldQty + g.price * g.quantity) / newQty;
          await this.prisma.orderItem.update({
            where: { id: existing.id },
            data: { quantity: newQty, price: newPrice },
          });
          usedExistingIds.add(existing.id);
        } else {
          await this.prisma.orderItem.create({
            data: {
              orderId: pendingReviewOrder.id,
              productId: g.productId,
              quantity: g.quantity,
              price: g.price,
              size: g.size,
              openingSide: g.openingSide,
              cardVariantId: g.cardVariantId,
            },
          });
        }
      }

      if (serviceLines.length > 0) {
        const serviceCategoriesToReplace = [
          ...new Set(serviceLines.map((l) => l.categoryName).filter(Boolean)),
        ];
        if (serviceCategoriesToReplace.length > 0) {
          await this.prisma.orderServiceItem.deleteMany({
            where: {
              orderId: pendingReviewOrder.id,
              categoryName: { in: serviceCategoriesToReplace },
            },
          });
        }
        await this.prisma.orderServiceItem.createMany({
          data: serviceLines.map((l) => ({
            orderId: pendingReviewOrder.id,
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

      if (dto?.cartItemIds?.length) {
        await this.prisma.cartItem.deleteMany({
          where: { id: { in: dto.cartItemIds }, userId },
        });
      }

      const newSubtotal = existingSubtotal + subtotal;
      const newTotal = newSubtotal + existingShipping + existingCarry;

      await this.prisma.order.update({
        where: { id: pendingReviewOrder.id },
        data: {
          submittedForReviewAt: new Date(),
          subtotal: newSubtotal,
          total: newTotal,
        },
      });

      const adminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
      const admins = await this.prisma.user.findMany({
        where: { role: { in: adminRoles }, isActive: true },
        select: { id: true },
      });
      const hasServiceLines = serviceLines.length > 0;
      await Promise.all([
        ...admins.map((a) =>
          this.usersService.createNotification(a.id, {
            type: 'new_order',
            title: hasServiceLines
              ? 'В заказ на проверке добавлены товары/услуги'
              : 'В заказ на проверке добавлены новые товары',
            message: hasServiceLines
              ? `В заказ ${pendingReviewOrder.orderNumber} покупатель добавил новые товары/услуги. Заказ обновлён и снова ожидает проверки.`
              : `В заказ ${pendingReviewOrder.orderNumber} покупатель добавил новые товары. Заказ обновлён и снова ожидает проверки.`,
          }),
        ),
        this.usersService.createNotification(userId, {
          type: 'order_status',
          title: `Заказ ${pendingReviewOrder.orderNumber} обновлён`,
          message:
            'Новые товары добавлены к заказу на проверке. Менеджер проверит обновлённый список.',
        }),
      ]);

      await this.prisma.orderEvent.create({
        data: {
          orderId: pendingReviewOrder.id,
          type: 'add_to_review',
          actor: 'customer',
          userId,
        },
      });

      const order = await this.prisma.order.findUnique({
        where: { id: pendingReviewOrder.id },
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
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });
      return order!;
    }

    if (pendingReviewOrder) {
      throw new BadRequestException(
        'У вас уже есть заказ на проверке. Дождитесь обработки или отмените его в корзине.',
      );
    }

    // Добавить новые товары к проверенному заказу (addToApproved или cartItemIds).
    // Объединяем с существующими позициями по (productId, size, openingSide).
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
      const approvedOrder = approvedNotExpired;
      const existingSubtotal = parseFloat(approvedOrder.subtotal.toString());
      const existingShipping = parseFloat(approvedOrder.shippingCost.toString());
      const existingCarry = approvedOrder.carryCost
        ? parseFloat(approvedOrder.carryCost.toString())
        : 0;

      const existingItems = await this.prisma.orderItem.findMany({
        where: { orderId: approvedOrder.id },
      });
      const key = (oi: { productId: string; size: string | null; openingSide: string | null }) =>
        `${oi.productId}|${oi.size ?? ''}|${oi.openingSide ?? ''}`;
      type Group = {
        productId: string;
        quantity: number;
        price: number;
        size: string | null;
        openingSide: string | null;
        cardVariantId: string | null;
      };
      const grouped = new Map<string, Group>();
      for (const oi of orderItems) {
        const k = key(oi);
        const cur = grouped.get(k);
        if (!cur) {
          grouped.set(k, {
            productId: oi.productId,
            quantity: oi.quantity,
            price: oi.price,
            size: oi.size,
            openingSide: oi.openingSide,
            cardVariantId: oi.cardVariantId,
          });
        } else {
          const totalQty = cur.quantity + oi.quantity;
          cur.price = (cur.price * cur.quantity + oi.price * oi.quantity) / totalQty;
          cur.quantity = totalQty;
        }
      }
      const usedExistingIds = new Set<string>();
      for (const [k, g] of grouped) {
        const [productId] = k.split('|');
        const existing = existingItems.find(
          (e) =>
            !usedExistingIds.has(e.id) &&
            e.productId === productId &&
            (e.size ?? '') === (g.size ?? '') &&
            (e.openingSide ?? '') === (g.openingSide ?? ''),
        );
        if (existing) {
          const oldQty = existing.quantity;
          const newQty = oldQty + g.quantity;
          const newPrice =
            (parseFloat(existing.price.toString()) * oldQty + g.price * g.quantity) / newQty;
          await this.prisma.orderItem.update({
            where: { id: existing.id },
            data: { quantity: newQty, price: newPrice },
          });
          usedExistingIds.add(existing.id);
        } else {
          await this.prisma.orderItem.create({
            data: {
              orderId: approvedOrder.id,
              productId: g.productId,
              quantity: g.quantity,
              price: g.price,
              size: g.size,
              openingSide: g.openingSide,
              cardVariantId: g.cardVariantId,
            },
          });
        }
      }

      if (serviceLines.length > 0) {
        const serviceCategoriesToReplace = [
          ...new Set(serviceLines.map((l) => l.categoryName).filter(Boolean)),
        ];
        if (serviceCategoriesToReplace.length > 0) {
          await this.prisma.orderServiceItem.deleteMany({
            where: {
              orderId: approvedOrder.id,
              categoryName: { in: serviceCategoriesToReplace },
            },
          });
        }
        await this.prisma.orderServiceItem.createMany({
          data: serviceLines.map((l) => ({
            orderId: approvedOrder.id,
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

      const newSubtotal = existingSubtotal + subtotal;
      const newTotal = newSubtotal + existingShipping + existingCarry;

      await this.prisma.order.update({
        where: { id: approvedOrder.id },
        data: {
          status: 'PENDING_REVIEW',
          approvedAt: null,
          submittedForReviewAt: new Date(),
          subtotal: newSubtotal,
          total: newTotal,
        },
      });

      const adminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
      const admins = await this.prisma.user.findMany({
        where: { role: { in: adminRoles }, isActive: true },
        select: { id: true },
      });
      await Promise.all([
        ...admins.map((a) =>
          this.usersService.createNotification(a.id, {
            type: 'new_order',
            title: 'В проверенный заказ добавлены новые товары',
            message: `В заказ ${approvedOrder.orderNumber} покупатель добавил новые товары. Заказ снова на проверке.`,
          }),
        ),
        this.usersService.createNotification(userId, {
          type: 'order_status',
          title: `Новые товары добавлены к заказу ${approvedOrder.orderNumber}`,
          message:
            'Новые товары добавлены к вашему заказу. Заказ снова отправлен на проверку менеджеру.',
        }),
      ]);

      await this.prisma.orderEvent.create({
        data: {
          orderId: approvedOrder.id,
          type: 'add_to_approved',
          actor: 'customer',
          userId,
        },
      });

      const order = await this.prisma.order.findUnique({
        where: { id: approvedOrder.id },
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
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });
      return order!;
    }

    if (approvedValid) {
      throw new BadRequestException(
        'У вас уже есть проверенный заказ. Оформите его или отмените в корзине, чтобы отправить новые товары отдельно.',
      );
    }

    const returnedOrder = activeOrders.find((o) => o.status === 'RETURNED_FOR_CORRECTION');
    if (returnedOrder) {
      await this.prisma.$transaction([
        this.prisma.orderItem.deleteMany({ where: { orderId: returnedOrder.id } }),
        this.prisma.orderServiceItem.deleteMany({ where: { orderId: returnedOrder.id } }),
        this.prisma.order.update({
          where: { id: returnedOrder.id },
          data: {
            status: 'PENDING_REVIEW',
            submittedForReviewAt: new Date(),
            returnedForCorrectionAt: null,
            returnedForCorrectionComment: null,
            shippingAddressId,
            shippingMethodId,
            deliveryType,
            deliveryFloor,
            deliveryHasElevator,
            preferredDeliveryTime,
            subtotal,
            tax,
            shippingCost,
            carryCost: carryCost > 0 ? carryCost : null,
            total,
          },
        }),
      ]);
      await this.prisma.orderItem.createMany({
        data: orderItems.map((oi) => ({
          orderId: returnedOrder.id,
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
            orderId: returnedOrder.id,
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
      const adminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
      const admins = await this.prisma.user.findMany({
        where: { role: { in: adminRoles }, isActive: true },
        select: { id: true },
      });
      await Promise.all([
        ...admins.map((a) =>
          this.usersService.createNotification(a.id, {
            type: 'new_order',
            title: 'Заказ повторно отправлен на проверку',
            message: `Заказ ${returnedOrder.orderNumber} повторно отправлен на проверку после доработки.`,
          }),
        ),
        this.usersService.createNotification(userId, {
          type: 'order_status',
          title: `Заказ ${returnedOrder.orderNumber} повторно отправлен на проверку`,
          message:
            'Заказ после доработки принят на проверку. Обычно проверка занимает около 15 минут.',
        }),
      ]);

      await this.prisma.orderEvent.create({
        data: {
          orderId: returnedOrder.id,
          type: 'submitted_for_review',
          actor: 'customer',
          userId,
        },
      });

      const order = await this.prisma.order.findUnique({
        where: { id: returnedOrder.id },
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
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });
      return order!;
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const isManagerRole = [
      'SUPER_ADMIN',
      'ADMIN',
      'MANAGER',
      'CONTENT_MANAGER',
      'MODERATOR',
      'SUPPORT',
    ].includes((role ?? '') as UserRole);

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        createdByManagerId: isManagerRole ? userId : null,
        processedByManagerId: isManagerRole ? userId : null,
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
        ...(serviceLines.length > 0 && {
          orderServiceItems: {
            create: serviceLines.map((l) => ({
              serviceCatalogItemId: l.serviceCatalogItemId,
              name: l.name,
              categoryName: l.categoryName,
              roomName: l.roomName ?? null,
              unit: l.unit,
              quantity: l.quantity,
              price: l.price,
              amount: l.amount,
            })),
          },
        }),
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

    const adminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    const admins = await this.prisma.user.findMany({
      where: { role: { in: adminRoles }, isActive: true },
      select: { id: true },
    });
    const title = 'Новый заказ на проверку';
    const message = `Заказ ${order.orderNumber} ожидает проверки.`;
    const notifyCustomer = !isManagerRole;
    await Promise.all([
      ...admins.map((a) =>
        this.usersService.createNotification(a.id, {
          type: 'new_order',
          title,
          message,
        }),
      ),
      ...(notifyCustomer
        ? [
            this.usersService.createNotification(order.userId, {
              type: 'order_status',
              title: `Заказ ${order.orderNumber} отправлен на проверку`,
              message:
                'Заказ принят на проверку. Обычно проверка занимает около 15 минут. Вы получите уведомление, когда менеджер проверит заказ.',
            }),
          ]
        : []),
    ]);

    await this.prisma.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'submitted_for_review',
        actor: isManagerRole ? 'manager' : 'customer',
        userId: isManagerRole ? userId : order.userId,
      },
    });

    return order;
  }

  /**
   * Менеджер: оформить заказ из своей корзины для покупателя по email.
   * Создаёт заказ на проверке, привязанный к покупателю (существующему пользователю или гостю).
   */
  async submitFromCartForCustomer(
    managerId: string,
    managerRole: string,
    dto: SubmitFromCartForCustomerDto,
  ): Promise<object> {
    const deliveryConfig = await this.getDeliveryConfig();
    const raw = deliveryConfig as unknown as { rolesAllowedOrderForCustomer?: unknown };
    const allowedRoles: string[] =
      Array.isArray(raw.rolesAllowedOrderForCustomer) && raw.rolesAllowedOrderForCustomer.length > 0
        ? (raw.rolesAllowedOrderForCustomer as string[])
        : ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    if (!allowedRoles.includes(managerRole)) {
      throw new ForbiddenException(
        'Вашей роли не разрешено оформлять заказ для клиента. Обратитесь к администратору.',
      );
    }

    const [cartItems, cartServiceItems] = await Promise.all([
      this.cartService.getCartItems(managerId),
      this.cartService.getCartServiceItems(managerId),
    ]);
    if (!cartItems.length && !cartServiceItems.length) {
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

    const hasProductItems = orderItems.length > 0;
    const hasServiceItems = cartServiceItems.length > 0;
    if (!hasProductItems && !hasServiceItems) {
      throw new BadRequestException('В корзине нет позиций для заказа');
    }

    let serviceLines: Array<{
      serviceCatalogItemId: string;
      name: string;
      categoryName: string;
      roomName?: string | null;
      unit: string;
      quantity: number;
      price: number;
      amount: number;
    }> = [];
    let servicesSubtotal = 0;
    if (hasServiceItems) {
      const built = await this.buildServiceLinesFromCartAndClear(cartServiceItems);
      serviceLines = built.lines;
      servicesSubtotal = built.subtotal;
      subtotal += servicesSubtotal;
    }

    // Только услуги — создаём Order с orderServiceItems для клиента
    if (!hasProductItems && hasServiceItems) {
      let customerUser = await this.usersService.findByEmail(dto.customerEmail);
      if (!customerUser) {
        customerUser = await this.usersService.createGuestUser(
          dto.customerEmail,
          dto.customerFirstName,
          dto.customerLastName,
        );
      }
      if (!serviceLines.length) throw new BadRequestException('Не удалось создать заказ на услуги');

      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const order = await this.prisma.order.create({
        data: {
          orderNumber,
          userId: customerUser.id,
          createdByManagerId: managerId,
          customerEmail: dto.customerEmail.trim().toLowerCase(),
          customerFirstName: dto.customerFirstName?.trim() || null,
          customerMiddleName: dto.customerMiddleName?.trim() || null,
          customerLastName: dto.customerLastName?.trim() || null,
          status: 'PENDING_REVIEW',
          subtotal: servicesSubtotal,
          tax: 0,
          shippingCost: 0,
          carryCost: null,
          total: servicesSubtotal,
          submittedForReviewAt: new Date(),
          orderServiceItems: {
            create: serviceLines.map((l) => ({
              serviceCatalogItemId: l.serviceCatalogItemId,
              name: l.name,
              categoryName: l.categoryName,
              roomName: l.roomName ?? null,
              unit: l.unit,
              quantity: l.quantity,
              price: l.price,
              amount: l.amount,
            })),
          },
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
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
      return order;
    }

    let customerUser = await this.usersService.findByEmail(dto.customerEmail);
    if (customerUser && (customerUser as { isGuest?: boolean }).isGuest) {
      // Гость уже есть — используем
    } else if (customerUser && !(customerUser as { isGuest?: boolean }).isGuest) {
      // Покупатель зарегистрирован — используем
    } else if (!customerUser) {
      customerUser = await this.usersService.createGuestUser(
        dto.customerEmail,
        dto.customerFirstName,
        dto.customerLastName,
      );
    }

    const customerId = customerUser.id;
    const customerEmail = dto.customerEmail.trim().toLowerCase();

    let shippingCost = 0;
    let carryCostFromCalc: number | undefined;
    let shippingMethodId: string | null = null;
    let shippingAddressId: string | null = null;
    let deliveryType: string | null = null;
    let deliveryFloor: number | null = null;
    let deliveryHasElevator: boolean | null = null;
    let preferredDeliveryTime: string | null = null;

    if (dto?.deliveryAddress && dto?.deliveryType != null) {
      const addr = dto.deliveryAddress;
      const addressRecord = await this.prisma.address.create({
        data: {
          userId: customerId,
          street: addr.street,
          city: addr.city,
          postalCode: (addr.postalCode?.trim() || '—').slice(0, 20),
          region: addr.region ?? null,
          country: addr.country ?? 'RU',
          firstName: addr.firstName ?? dto.customerFirstName ?? customerUser.firstName ?? '',
          lastName: addr.lastName ?? dto.customerLastName ?? customerUser.lastName ?? '',
          phone: (addr.phone ?? '').trim() || 'не указан',
        },
      });
      shippingAddressId = addressRecord.id;
      const calc = await this.calculateDelivery(managerId, {
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
        userId: customerId,
        createdByManagerId: managerId,
        processedByManagerId: managerId,
        customerEmail,
        customerPhone: dto.customerPhone?.trim() || null,
        customerFirstName: dto.customerFirstName?.trim() || null,
        customerMiddleName: dto.customerMiddleName?.trim() || null,
        customerLastName: dto.customerLastName?.trim() || null,
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
        ...(serviceLines.length > 0 && {
          orderServiceItems: {
            create: serviceLines.map((l) => ({
              serviceCatalogItemId: l.serviceCatalogItemId,
              name: l.name,
              categoryName: l.categoryName,
              roomName: l.roomName ?? null,
              unit: l.unit,
              quantity: l.quantity,
              price: l.price,
              amount: l.amount,
            })),
          },
        }),
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
        orderId: order.id,
        type: 'submitted_for_review',
        actor: 'manager',
        userId: managerId,
      },
    });

    await this.cartService.clearCart(managerId);

    const adminRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    const admins = await this.prisma.user.findMany({
      where: { role: { in: adminRoles }, isActive: true },
      select: { id: true },
    });
    const title = 'Новый заказ на проверку (оформлен менеджером для покупателя)';
    const message = `Заказ ${order.orderNumber} для ${customerEmail} ожидает проверки.`;
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

    const deliveryConfig = await this.getDeliveryConfig();
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
    const deliveryConfig = await this.getDeliveryConfig();
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

    const deliveryConfig = await this.getDeliveryConfig();
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

  /**
   * Проверить, может ли пользователь с данной ролью оформлять заказ услуг для клиента.
   * Использует rolesAllowedOrderForCustomer из DeliveryConfig (те же роли, что и для заказов товаров).
   */
  async canPlaceServiceOrder(role: string): Promise<boolean> {
    const deliveryConfig = await this.getDeliveryConfig();
    const raw = deliveryConfig as unknown as { rolesAllowedOrderForCustomer?: unknown };
    const allowedRoles: string[] =
      Array.isArray(raw.rolesAllowedOrderForCustomer) && raw.rolesAllowedOrderForCustomer.length > 0
        ? (raw.rolesAllowedOrderForCustomer as string[])
        : ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];
    return allowedRoles.includes(role);
  }

  /**
   * Создать заказ на услуги (менеджер для клиента).
   */
  async createServiceOrder(managerId: string, managerRole: string, dto: CreateServiceOrderDto) {
    const canPlace = await this.canPlaceServiceOrder(managerRole);
    if (!canPlace) {
      throw new ForbiddenException(
        'Вашей роли не разрешено оформлять заказ услуг для клиента. Обратитесь к администратору.',
      );
    }

    if (!dto.items?.length) {
      throw new BadRequestException('Добавьте позиции для оформления заказа');
    }

    const itemIds = dto.items.map((i) => i.itemId);
    const dbItems = await this.prisma.serviceCatalogItem.findMany({
      where: { id: { in: itemIds }, isActive: true },
      include: { category: { select: { name: true } } },
    });

    const idToItem = new Map(dbItems.map((i) => [i.id, i]));
    let total = 0;
    const orderLines: Array<{
      serviceCatalogItemId: string;
      name: string;
      categoryName: string;
      unit: string;
      quantity: number;
      price: number;
      amount: number;
    }> = [];

    for (const line of dto.items) {
      const item = idToItem.get(line.itemId);
      if (!item) {
        throw new BadRequestException(`Вид работ с ID ${line.itemId} не найден`);
      }
      const qty = Math.max(0.01, Number(line.quantity));
      const price = parseFloat(item.price.toString());
      const amount = price * qty;
      total += amount;
      orderLines.push({
        serviceCatalogItemId: item.id,
        name: item.name,
        categoryName: item.category.name,
        unit: item.unit,
        quantity: qty,
        price,
        amount,
      });
    }

    let customerUser = await this.usersService.findByEmail(dto.customerEmail);
    if (!customerUser) {
      customerUser = await this.usersService.createGuestUser(
        dto.customerEmail,
        dto.customerFirstName,
        dto.customerLastName,
      );
    }

    const orderNumber = `SRV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return this.prisma.serviceOrder.create({
      data: {
        orderNumber,
        userId: customerUser.id,
        createdByManagerId: managerId,
        customerEmail: dto.customerEmail.trim().toLowerCase(),
        customerFirstName: dto.customerFirstName?.trim() || null,
        customerLastName: dto.customerLastName?.trim() || null,
        customerPhone: dto.customerPhone?.trim() || null,
        total,
        status: 'PENDING',
        customerNotes: dto.customerNotes?.trim() || null,
        items: {
          create: orderLines.map((l) => ({
            serviceCatalogItemId: l.serviceCatalogItemId,
            name: l.name,
            categoryName: l.categoryName,
            unit: l.unit,
            quantity: l.quantity,
            price: l.price,
            amount: l.amount,
          })),
        },
      },
      include: {
        items: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        createdByManager: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateServiceOrderCustomer(
    serviceOrderId: string,
    data: {
      customerEmail?: string | null;
      customerFirstName?: string | null;
      customerLastName?: string | null;
      customerPhone?: string | null;
    },
  ) {
    const existing = await this.prisma.serviceOrder.findUnique({
      where: { id: serviceOrderId },
    });
    if (!existing) {
      throw new NotFoundException('Заказ на услуги не найден');
    }
    const updateData: Record<string, unknown> = {};
    if (data.customerEmail !== undefined) {
      updateData.customerEmail = data.customerEmail?.trim()?.toLowerCase() || null;
    }
    if (data.customerFirstName !== undefined) {
      updateData.customerFirstName = data.customerFirstName?.trim() || null;
    }
    if (data.customerLastName !== undefined) {
      updateData.customerLastName = data.customerLastName?.trim() || null;
    }
    if (data.customerPhone !== undefined) {
      updateData.customerPhone = data.customerPhone?.trim() || null;
    }
    if (Object.keys(updateData).length === 0) return existing;
    return this.prisma.serviceOrder.update({
      where: { id: serviceOrderId },
      data: updateData,
      include: {
        items: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        createdByManager: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
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
