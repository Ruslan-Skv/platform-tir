import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CartService } from '../../cart/cart.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '@prisma/client';
import type { SubmitFromCartForCustomerDto } from '../dto/submit-from-cart-for-customer.dto';
import { OrdersDeliveryService } from './orders-delivery.service';
import { OrdersCartServiceLinesService } from './orders-cart-service-lines.service';
import {
  resolveCartComponentLabel,
  resolveCartComponentPrice,
} from '../../cart/cart-component-resolve.util';

@Injectable()
export class OrdersCartSubmitForCustomerService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private usersService: UsersService,
    private ordersDelivery: OrdersDeliveryService,
    private serviceLines: OrdersCartServiceLinesService,
  ) {}

  /**
   * Менеджер: оформить заказ из своей корзины для покупателя по email.
   * Создаёт заказ на проверке, привязанный к покупателю (существующему пользователю или гостю).
   */
  async submitFromCartForCustomer(
    managerId: string,
    managerRole: string,
    dto: SubmitFromCartForCustomerDto,
  ): Promise<object> {
    const deliveryConfig = await this.ordersDelivery.getDeliveryConfig();
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
      componentId: string | null;
      componentLabel: string | null;
      quantity: number;
      price: number;
      size: string | null;
      openingSide: string | null;
      cardVariantId: string | null;
    }> = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const qty = Math.max(0.5, Number(item.quantity) || 1);
      if (item.productId && item.product) {
        const price = parseFloat(item.product.price.toString());
        orderItems.push({
          productId: item.product.id,
          componentId: null,
          componentLabel: null,
          quantity: qty,
          price,
          size: item.size ?? null,
          openingSide: item.openingSide ?? null,
          cardVariantId: item.cardVariantId ?? null,
        });
        subtotal += price * qty;
      } else if (item.componentId && item.component) {
        const price = resolveCartComponentPrice(item.component);
        orderItems.push({
          productId: item.component.productId,
          componentId: item.component.id,
          componentLabel: resolveCartComponentLabel(item.component),
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
      const built = await this.serviceLines.buildServiceLinesFromCartAndClear(cartServiceItems);
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
      const calc = await this.ordersDelivery.calculateDelivery(managerId, {
        subtotal,
        city: addr.city,
        distanceKm: dto.distanceKm,
        deliveryType: dto.deliveryType,
        deliveryFloor: dto.deliveryFloor,
        deliveryHasElevator: dto.deliveryHasElevator,
      });
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
            componentId: oi.componentId,
            componentLabel: oi.componentLabel,
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
}
