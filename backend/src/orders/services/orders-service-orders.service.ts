import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../../users/users.service';
import type { CreateServiceOrderDto } from '../dto/create-service-order.dto';
import { OrdersDeliveryService } from './orders-delivery.service';
import { serviceCatalogPriceWithMarkup } from '../../common/utils/service-catalog-price';
import {
  effectiveServiceCatalogMarkupPercent,
  loadServiceCatalogCategoryMarkupMap,
} from '../../common/utils/service-catalog-markup-effective';

@Injectable()
export class OrdersServiceOrdersService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private ordersDelivery: OrdersDeliveryService,
  ) {}

  /**
   * Проверить, может ли пользователь с данной ролью оформлять заказ услуг для клиента.
   * Использует rolesAllowedOrderForCustomer из DeliveryConfig (те же роли, что и для заказов товаров).
   */
  async canPlaceServiceOrder(role: string): Promise<boolean> {
    const deliveryConfig = await this.ordersDelivery.getDeliveryConfig();
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
      include: { category: { select: { name: true, priceMarkupPercent: true } } },
    });

    const markupMap = await loadServiceCatalogCategoryMarkupMap(this.prisma, [
      ...new Set(dbItems.map((i) => i.categoryId)),
    ]);

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
      const price = serviceCatalogPriceWithMarkup(
        item.price,
        effectiveServiceCatalogMarkupPercent(item.categoryId, markupMap),
      );
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
}
