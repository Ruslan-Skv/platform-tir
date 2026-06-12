'use client';

import { useState } from 'react';

import type { CartItem } from '@/shared/api/cart';
import { useApprovedOrderGuard } from '@/shared/lib/contexts/ApprovedOrderGuardContext';

type UseCartItemHandlersParams = {
  cart: CartItem[];
  updateCartItemQuantityById: (itemId: string, quantity: number) => Promise<void>;
  updateComponentQuantity: (componentId: string, quantity: number) => Promise<void>;
  removeCartItemById: (itemId: string) => Promise<void>;
  removeComponentFromCart: (componentId: string) => Promise<void>;
};

export function useCartItemHandlers({
  cart,
  updateCartItemQuantityById,
  updateComponentQuantity,
  removeCartItemById,
  removeComponentFromCart,
}: UseCartItemHandlersParams) {
  const guard = useApprovedOrderGuard();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const handleRemoveItem = async (itemId: string) => {
    const item = cart.find((c) => c.id === itemId);
    const needConfirm = item
      ? guard.hasApprovedOrder && guard.isCartItemInApprovedOrder(item)
      : false;
    const ok = await guard.confirmBeforeCartChange(async () => {
      const itemKey = `item-${itemId}`;
      setUpdatingItems((prev) => new Set(prev).add(itemKey));
      try {
        await removeCartItemById(itemId);
      } catch (err) {
        if (err instanceof Error) alert(err.message);
        else alert('Произошла ошибка при удалении товара');
      } finally {
        setUpdatingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
      }
    }, needConfirm);
    if (!ok && needConfirm) return;
  };

  const handleRemoveComponent = async (componentId: string) => {
    const item = cart.find((c) => c.componentId === componentId);
    const needConfirm = item
      ? guard.hasApprovedOrder && guard.isCartItemInApprovedOrder(item)
      : false;
    const ok = await guard.confirmBeforeCartChange(async () => {
      const itemKey = `component-${componentId}`;
      setUpdatingItems((prev) => new Set(prev).add(itemKey));
      try {
        await removeComponentFromCart(componentId);
      } catch (err) {
        if (err instanceof Error) alert(err.message);
        else alert('Произошла ошибка при удалении комплектующего');
      } finally {
        setUpdatingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
      }
    }, needConfirm);
    if (!ok && needConfirm) return;
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await handleRemoveItem(itemId);
      return;
    }

    const itemKey = `item-${itemId}`;
    setUpdatingItems((prev) => new Set(prev).add(itemKey));
    try {
      await updateCartItemQuantityById(itemId, newQuantity);
    } catch (err) {
      if (err instanceof Error) alert(err.message);
      else alert('Произошла ошибка при обновлении количества');
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleComponentQuantityChange = async (componentId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await handleRemoveComponent(componentId);
      return;
    }

    const itemKey = `component-${componentId}`;
    setUpdatingItems((prev) => new Set(prev).add(itemKey));
    try {
      await updateComponentQuantity(componentId, newQuantity);
    } catch (err) {
      if (err instanceof Error) alert(err.message);
      else alert('Произошла ошибка при обновлении количества');
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  return {
    updatingItems,
    handleQuantityChange,
    handleComponentQuantityChange,
    handleRemoveItem,
    handleRemoveComponent,
  };
}
