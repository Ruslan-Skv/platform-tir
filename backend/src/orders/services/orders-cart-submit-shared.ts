import { UserRole } from '@prisma/client';

import type { PrismaService } from '../../database/prisma.service';

export type CartProductLine = {
  productId: string;
  quantity: number;
  price: number;
  size: string | null;
  openingSide: string | null;
  cardVariantId: string | null;
};

export type CartServiceLine = {
  serviceCatalogItemId: string;
  name: string;
  categoryName: string;
  roomName?: string | null;
  unit: string;
  quantity: number;
  price: number;
  amount: number;
};

export const ORDER_ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export const ORDER_SUBMIT_RESPONSE_INCLUDE = {
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
} as const;

const MANAGER_SUBMIT_ROLES = new Set<UserRole>([
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
]);

export function isOrderManagerRole(role?: string): boolean {
  return MANAGER_SUBMIT_ROLES.has((role ?? '') as UserRole);
}

function orderItemMergeKey(oi: {
  productId: string;
  size: string | null;
  openingSide: string | null;
}): string {
  return `${oi.productId}|${oi.size ?? ''}|${oi.openingSide ?? ''}`;
}

export async function mergeCartProductLinesIntoOrder(
  prisma: PrismaService,
  orderId: string,
  orderItems: CartProductLine[],
): Promise<void> {
  const existingItems = await prisma.orderItem.findMany({
    where: { orderId },
  });

  type Group = CartProductLine;
  const grouped = new Map<string, Group>();
  for (const oi of orderItems) {
    const k = orderItemMergeKey(oi);
    const cur = grouped.get(k);
    if (!cur) {
      grouped.set(k, { ...oi });
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
      await prisma.orderItem.update({
        where: { id: existing.id },
        data: { quantity: newQty, price: newPrice },
      });
      usedExistingIds.add(existing.id);
    } else {
      await prisma.orderItem.create({
        data: {
          orderId,
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
}

export async function replaceServiceLinesOnOrder(
  prisma: PrismaService,
  orderId: string,
  serviceLines: CartServiceLine[],
): Promise<void> {
  if (serviceLines.length === 0) return;

  const serviceCategoriesToReplace = [
    ...new Set(serviceLines.map((l) => l.categoryName).filter(Boolean)),
  ];
  if (serviceCategoriesToReplace.length > 0) {
    await prisma.orderServiceItem.deleteMany({
      where: {
        orderId,
        categoryName: { in: serviceCategoriesToReplace },
      },
    });
  }
  await prisma.orderServiceItem.createMany({
    data: serviceLines.map((l) => ({
      orderId,
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

export function mapServiceLinesForCreate(serviceLines: CartServiceLine[]) {
  return serviceLines.map((l) => ({
    serviceCatalogItemId: l.serviceCatalogItemId,
    name: l.name,
    categoryName: l.categoryName,
    roomName: l.roomName ?? null,
    unit: l.unit,
    quantity: l.quantity,
    price: l.price,
    amount: l.amount,
  }));
}

export async function fetchOrderSubmitResponse(prisma: PrismaService, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: ORDER_SUBMIT_RESPONSE_INCLUDE,
  });
  return order!;
}
