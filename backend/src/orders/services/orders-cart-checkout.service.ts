import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '@prisma/client';
import type { SubmitFromCartDto } from '../dto/submit-from-cart.dto';
import type { SubmitFromCartForCustomerDto } from '../dto/submit-from-cart-for-customer.dto';
import { OrdersDeliveryService } from './orders-delivery.service';
import { OrdersCartSubmitService } from './orders-cart-submit.service';
import { OrdersCartSubmitForCustomerService } from './orders-cart-submit-for-customer.service';

@Injectable()
export class OrdersCartCheckoutService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private ordersDelivery: OrdersDeliveryService,
    private cartSubmit: OrdersCartSubmitService,
    private cartSubmitForCustomer: OrdersCartSubmitForCustomerService,
  ) {}

  submitFromCart(userId: string, dto?: SubmitFromCartDto, role?: string) {
    return this.cartSubmit.submitFromCart(userId, dto, role);
  }

  submitFromCartForCustomer(
    managerId: string,
    managerRole: string,
    dto: SubmitFromCartForCustomerDto,
  ) {
    return this.cartSubmitForCustomer.submitFromCartForCustomer(managerId, managerRole, dto);
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
  }

  private async recalculateOrderTotals(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return;

    const config = await this.ordersDelivery.getDeliveryConfig();
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
}
