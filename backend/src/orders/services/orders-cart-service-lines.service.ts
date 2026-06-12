import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { CartService } from '../../cart/cart.service';
import { serviceCatalogPriceWithMarkup } from '../../common/utils/service-catalog-price';
import {
  effectiveServiceCatalogMarkupPercent,
  loadServiceCatalogCategoryMarkupMap,
} from '../../common/utils/service-catalog-markup-effective';

@Injectable()
export class OrdersCartServiceLinesService {
  constructor(private prisma: PrismaService) {}

  async buildServiceLinesFromCartAndClear(
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
      include: { category: { select: { name: true, priceMarkupPercent: true } } },
    });
    const markupMap = await loadServiceCatalogCategoryMarkupMap(this.prisma, [
      ...new Set(dbItems.map((i) => i.categoryId)),
    ]);
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
      const price = serviceCatalogPriceWithMarkup(
        item.price,
        effectiveServiceCatalogMarkupPercent(item.categoryId, markupMap),
      );
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

    for (const line of allLines) {
      const item = idToItem.get(line.itemId);
      if (!item) continue;
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
}
