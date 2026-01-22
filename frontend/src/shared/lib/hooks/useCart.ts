'use client';

import { useCallback, useEffect, useState } from 'react';

import * as cartApi from '@/shared/api/cart';
import type { CartItem } from '@/shared/api/cart';

interface UseCartReturn {
  cart: CartItem[];
  count: number;
  isLoading: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshCount: () => Promise<void>;
  getTotalPrice: () => number;
}

export function useCart(): UseCartReturn {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Загружаем количество товаров в корзине при монтировании
  useEffect(() => {
    refreshCount().catch(() => {
      // Игнорируем ошибки при загрузке (пользователь может быть не авторизован)
    });
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const newCount = await cartApi.getCartCount();
      setCount(newCount);
    } catch (error) {
      // Если пользователь не авторизован, устанавливаем 0
      setCount(0);
    }
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await cartApi.getCart();
      setCart(items);
      // Обновляем количество на основе реальных данных
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
      setCount(totalQuantity);
    } catch (error) {
      // Если пользователь не авторизован, очищаем корзину
      setCart([]);
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    try {
      const newItem = await cartApi.addToCart(productId, quantity);
      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => item.productId === productId);
        if (existingIndex >= 0) {
          // Обновляем существующий элемент
          const updated = [...prev];
          updated[existingIndex] = newItem;
          return updated;
        }
        // Добавляем новый элемент
        return [...prev, newItem];
      });
      setCount((prev) => prev + quantity);
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы добавить товар в корзину');
      }
      throw error;
    }
  }, []);

  const removeFromCartInternal = useCallback(async (productId: string) => {
    try {
      await cartApi.removeFromCart(productId);
      setCart((prev) => {
        const item = prev.find((i) => i.productId === productId);
        if (item) {
          setCount((prevCount) => Math.max(0, prevCount - item.quantity));
        }
        return prev.filter((item) => item.productId !== productId);
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы удалить товар из корзины');
      }
      throw error;
    }
  }, []);

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      try {
        if (quantity <= 0) {
          await removeFromCartInternal(productId);
          return;
        }

        const updatedItem = await cartApi.updateCartItemQuantity(productId, quantity);
        setCart((prev) => {
          const existingIndex = prev.findIndex((item) => item.productId === productId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            const oldQuantity = updated[existingIndex].quantity;
            updated[existingIndex] = updatedItem;
            setCount((prev) => prev - oldQuantity + quantity);
            return updated;
          }
          return prev;
        });
      } catch (error) {
        if (error instanceof Error && error.message === 'Необходима авторизация') {
          throw new Error('Войдите в систему, чтобы обновить корзину');
        }
        throw error;
      }
    },
    [removeFromCartInternal]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      await removeFromCartInternal(productId);
    },
    [removeFromCartInternal]
  );

  const clearCart = useCallback(async () => {
    try {
      await cartApi.clearCart();
      setCart([]);
      setCount(0);
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы очистить корзину');
      }
      throw error;
    }
  }, []);

  const getTotalPrice = useCallback((): number => {
    return cart.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  }, [cart]);

  return {
    cart,
    count,
    isLoading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
    refreshCount,
    getTotalPrice,
  };
}
