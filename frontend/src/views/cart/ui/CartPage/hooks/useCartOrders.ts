'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { CartServiceItem } from '@/shared/api/cart';
import { type UserOrder, getApprovalRemainingMs, getUserOrders } from '@/shared/api/user-orders';
import { apiFetch } from '@/shared/lib/api-fetch';
import {
  getRestoredServiceOrderIds,
  markServiceOrderRestored,
} from '@/views/cart/lib/cart-service-order-restore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type UseCartOrdersParams = {
  cartLength: number;
  cartServiceItems: CartServiceItem[];
  addServiceToCart: (
    categoryId: string,
    payload: { rooms: { name: string; items: { itemId: string; quantity: number }[] }[] }
  ) => Promise<void>;
};

export function useCartOrders({
  cartLength,
  cartServiceItems,
  addServiceToCart,
}: UseCartOrdersParams) {
  const [userOrders, setUserOrders] = useState<UserOrder[] | null>(null);
  const [, setTick] = useState(0);
  const restoringServiceOrdersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (cartLength === 0) return;
    const loadOrders = async () => {
      try {
        const orders = await getUserOrders();
        setUserOrders(orders);
      } catch {
        setUserOrders([]);
      }
    };
    loadOrders();
  }, [cartLength]);

  useEffect(() => {
    if (!userOrders?.length) return;
    const cancelledOrders = userOrders.filter(
      (order) => order.status === 'CANCELLED' && (order.orderServiceItems?.length ?? 0) > 0
    );
    if (cancelledOrders.length === 0) return;
    const restoredIds = getRestoredServiceOrderIds();

    const restoreOrderServices = async (order: UserOrder) => {
      if (restoredIds.has(order.id) || restoringServiceOrdersRef.current.has(order.id)) return;
      restoringServiceOrdersRef.current.add(order.id);
      try {
        const byCategory = new Map<
          string,
          { categoryName: string; rooms: Map<string, Map<string, number>> }
        >();
        for (const item of order.orderServiceItems ?? []) {
          const slug = item.serviceCatalogItem?.category?.slug;
          if (!slug) continue;
          const categoryName = item.categoryName || 'Услуги';
          const roomName = item.roomName || 'Помещение';
          const category = byCategory.get(slug) ?? {
            categoryName,
            rooms: new Map<string, Map<string, number>>(),
          };
          const room = category.rooms.get(roomName) ?? new Map<string, number>();
          const currentQty = room.get(item.serviceCatalogItemId) ?? 0;
          room.set(item.serviceCatalogItemId, currentQty + item.quantity);
          category.rooms.set(roomName, room);
          byCategory.set(slug, category);
        }

        if (byCategory.size === 0) return;

        for (const [slug, category] of byCategory.entries()) {
          const alreadyInCart = cartServiceItems.some(
            (cartItem) =>
              cartItem.category?.slug === slug || cartItem.category?.name === category.categoryName
          );
          if (alreadyInCart) continue;
          const res = await apiFetch(
            `${API_URL}/service-catalog/categories/${encodeURIComponent(slug)}`
          );
          if (!res.ok) continue;
          const data = (await res.json()) as { id: string };
          const rooms = Array.from(category.rooms.entries()).map(([name, itemsMap]) => ({
            name,
            items: Array.from(itemsMap.entries()).map(([itemId, quantity]) => ({
              itemId,
              quantity,
            })),
          }));
          await addServiceToCart(data.id, { rooms });
        }

        markServiceOrderRestored(order.id);
      } finally {
        restoringServiceOrdersRef.current.delete(order.id);
      }
    };

    cancelledOrders.forEach((order) => {
      void restoreOrderServices(order);
    });
  }, [userOrders, cartServiceItems, addServiceToCart]);

  const sortedOrders = useMemo(() => {
    if (!userOrders?.length) return [];
    return [...userOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [userOrders]);

  const pendingReviewOrder = sortedOrders.find((o) => o.status === 'PENDING_REVIEW') ?? null;
  const approvedOrder = sortedOrders.find((o) => o.status === 'APPROVED') ?? null;
  const returnedForCorrectionOrder =
    sortedOrders.find((o) => o.status === 'RETURNED_FOR_CORRECTION') ?? null;

  const approvalRemainingMs = approvedOrder
    ? getApprovalRemainingMs(approvedOrder.approvedAt ?? null, approvedOrder.approvalValidMinutes)
    : 0;
  const approvalExpired = approvedOrder && approvalRemainingMs <= 0;

  const pendingOrderHasDelivery =
    !!pendingReviewOrder &&
    (!!pendingReviewOrder.shippingAddress || !!pendingReviewOrder.deliveryType);

  const approvedOrderHasDelivery =
    !!approvedOrder &&
    !approvalExpired &&
    (!!approvedOrder.shippingAddress || !!approvedOrder.deliveryType);

  const returnedOrderHasDelivery =
    !!returnedForCorrectionOrder &&
    (!!returnedForCorrectionOrder.shippingAddress || !!returnedForCorrectionOrder.deliveryType);

  const orderWithDelivery =
    pendingReviewOrder?.id && pendingOrderHasDelivery
      ? pendingReviewOrder
      : approvedOrderHasDelivery
        ? approvedOrder!
        : returnedOrderHasDelivery
          ? returnedForCorrectionOrder!
          : null;

  useEffect(() => {
    if (approvalExpired && userOrders) {
      getUserOrders().then(setUserOrders);
    }
  }, [approvalExpired, userOrders]);

  return {
    userOrders,
    setUserOrders,
    pendingReviewOrder,
    approvedOrder,
    returnedForCorrectionOrder,
    approvalRemainingMs,
    pendingOrderHasDelivery,
    approvedOrderHasDelivery,
    returnedOrderHasDelivery,
    orderWithDelivery,
  };
}
