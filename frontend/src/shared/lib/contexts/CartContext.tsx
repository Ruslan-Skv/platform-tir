'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as cartApi from '@/shared/api/cart';
import type { CartItem } from '@/shared/api/cart';

interface CartContextValue {
  cart: CartItem[];
  count: number;
  isLoading: boolean;
  addToCart: (
    productId: string,
    quantity?: number,
    size?: string,
    openingSide?: string,
    cardVariantId?: string
  ) => Promise<void>;
  addComponentToCart: (componentId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  updateCartItemQuantityById: (itemId: string, quantity: number) => Promise<void>;
  updateComponentQuantity: (componentId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  removeCartItemById: (itemId: string) => Promise<void>;
  removeComponentFromCart: (componentId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshCount: () => Promise<void>;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const items = await cartApi.getCart();
      setCart(items);
    } catch (error) {
      // Если пользователь не авторизован, очищаем корзину
      setCart([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Вычисляем счетчик на основе корзины (товары и комплектующие с валидными данными)
  const count = useMemo(() => {
    return cart.reduce((sum, item) => {
      // Учитываем товары и комплектующие с валидными данными
      if (item.product || item.component) {
        return sum + item.quantity;
      }
      return sum;
    }, 0);
  }, [cart]);

  const refreshCount = useCallback(async () => {
    // Обновляем корзину, счетчик обновится автоматически
    await refreshCart();
  }, [refreshCart]);

  // Загружаем количество товаров в корзине при монтировании
  useEffect(() => {
    refreshCart().catch(() => {
      // Игнорируем ошибки при загрузке (пользователь может быть не авторизован)
    });
  }, [refreshCart]);

  const addToCart = useCallback(
    async (
      productId: string,
      quantity: number = 1,
      size?: string,
      openingSide?: string,
      cardVariantId?: string
    ) => {
      try {
        const newItem = await cartApi.addToCart(
          productId,
          quantity,
          size,
          openingSide,
          cardVariantId
        );
        setCart((prev) => {
          const existingIndex = prev.findIndex(
            (item) =>
              item.productId != null &&
              item.componentId == null &&
              String(item.productId) === String(productId) &&
              item.size === (size || null) &&
              item.openingSide === (openingSide || null) &&
              (item.cardVariantId ?? null) === (cardVariantId ?? null)
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = newItem;
            return updated;
          }
          return [...prev, newItem];
        });
        // Обновляем корзину с сервера для синхронизации
        await refreshCart();
      } catch (error) {
        if (error instanceof Error && error.message === 'Необходима авторизация') {
          throw new Error('Войдите в систему, чтобы добавить товар в корзину');
        }
        throw error;
      }
    },
    [refreshCart]
  );

  const addComponentToCart = useCallback(
    async (componentId: string, quantity: number = 1) => {
      try {
        const newItem = await cartApi.addComponentToCart(componentId, quantity);
        setCart((prev) => {
          // Для комплектующих ищем по componentId (где componentId не null и совпадает, а productId null)
          const existingIndex = prev.findIndex(
            (item) =>
              item.componentId !== null &&
              item.productId === null &&
              String(item.componentId) === String(componentId)
          );
          if (existingIndex >= 0) {
            // Обновляем существующий элемент
            const updated = [...prev];
            updated[existingIndex] = newItem;
            return updated;
          }
          // Добавляем новый элемент
          return [...prev, newItem];
        });
        // Обновляем корзину с сервера для синхронизации
        await refreshCart();
      } catch (error) {
        if (error instanceof Error && error.message === 'Необходима авторизация') {
          throw new Error('Войдите в систему, чтобы добавить комплектующее в корзину');
        }
        throw error;
      }
    },
    [refreshCart]
  );

  const removeFromCartInternal = useCallback(async (productId: string) => {
    try {
      await cartApi.removeFromCart(productId);
      setCart((prev) =>
        prev.filter((item) => item.productId === null || item.productId !== productId)
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы удалить товар из корзины');
      }
      throw error;
    }
  }, []);

  const removeCartItemById = useCallback(async (itemId: string) => {
    try {
      await cartApi.removeCartItemById(itemId);
      setCart((prev) => prev.filter((item) => item.id !== itemId));
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
          // Ищем только среди товаров (productId !== null) с приведением типов
          const existingIndex = prev.findIndex(
            (item) =>
              item.productId !== null &&
              item.componentId === null &&
              String(item.productId) === String(productId)
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = updatedItem;
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

  const updateCartItemQuantityById = useCallback(
    async (itemId: string, quantity: number) => {
      try {
        if (quantity <= 0) {
          await removeCartItemById(itemId);
          return;
        }

        const updatedItem = await cartApi.updateCartItemQuantityById(itemId, quantity);
        setCart((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === itemId);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = updatedItem;
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
    [removeCartItemById]
  );

  const removeFromCart = useCallback(
    async (productId: string) => {
      await removeFromCartInternal(productId);
    },
    [removeFromCartInternal]
  );

  const removeComponentFromCartInternal = useCallback(async (componentId: string) => {
    try {
      await cartApi.removeComponentFromCart(componentId);
      setCart((prev) =>
        prev.filter((item) => item.componentId === null || item.componentId !== componentId)
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы удалить комплектующее из корзины');
      }
      throw error;
    }
  }, []);

  const removeComponentFromCart = useCallback(
    async (componentId: string) => {
      await removeComponentFromCartInternal(componentId);
    },
    [removeComponentFromCartInternal]
  );

  const updateComponentQuantity = useCallback(
    async (componentId: string, quantity: number) => {
      try {
        if (quantity <= 0) {
          await removeComponentFromCartInternal(componentId);
          return;
        }

        const updatedItem = await cartApi.updateComponentQuantity(componentId, quantity);
        setCart((prev) => {
          // Ищем только среди комплектующих (componentId !== null) с приведением типов
          const existingIndex = prev.findIndex(
            (item) =>
              item.componentId !== null &&
              item.productId === null &&
              String(item.componentId) === String(componentId)
          );
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = updatedItem;
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
    [removeComponentFromCartInternal]
  );

  const clearCart = useCallback(async () => {
    try {
      await cartApi.clearCart();
      setCart([]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы очистить корзину');
      }
      throw error;
    }
  }, []);

  const getTotalPrice = useCallback((): number => {
    return cart.reduce((total, item) => {
      if (item.product) {
        return total + item.product.price * item.quantity;
      }
      if (item.component) {
        return total + item.component.price * item.quantity;
      }
      return total;
    }, 0);
  }, [cart]);

  const value: CartContextValue = {
    cart,
    count,
    isLoading,
    addToCart,
    addComponentToCart,
    updateQuantity,
    updateCartItemQuantityById,
    updateComponentQuantity,
    removeFromCart,
    removeCartItemById,
    removeComponentFromCart,
    clearCart,
    refreshCart,
    refreshCount,
    getTotalPrice,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
