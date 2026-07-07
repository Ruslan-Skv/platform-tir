'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as cartApi from '@/shared/api/cart';
import type { CartItem, CartServiceItem } from '@/shared/api/cart';
import { type UserOrder, getUserOrders } from '@/shared/api/user-orders';
import { AuthRequiredForCartError, emitCartAuthRequired } from '@/shared/lib/cart-auth-required';

interface CartContextValue {
  cart: CartItem[];
  cartServiceItems: CartServiceItem[];
  count: number;
  isLoading: boolean;
  addServiceToCart: (
    categoryId: string,
    payload:
      | { items: { itemId: string; quantity: number }[] }
      | { rooms: { name: string; items: { itemId: string; quantity: number }[] }[] }
  ) => Promise<void>;
  removeCartServiceItemById: (itemId: string) => Promise<void>;
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
  refreshCart: (options?: { silent?: boolean }) => Promise<void>;
  refreshCount: () => Promise<void>;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartServiceItems, setCartServiceItems] = useState<CartServiceItem[]>([]);
  const [serviceOrderCategoryKeys, setServiceOrderCategoryKeys] = useState<string[]>([]);
  const [detachedServiceCategoryKeys, setDetachedServiceCategoryKeys] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastTokenRef = React.useRef<string | null>(null);
  const refreshInFlightRef = React.useRef<Promise<void> | null>(null);

  const getOrderServiceCategoryKeys = useCallback((orders: UserOrder[]): string[] => {
    const activeStatuses = new Set(['PENDING_REVIEW', 'RETURNED_FOR_CORRECTION', 'APPROVED']);
    const keys = new Set<string>();
    for (const order of orders) {
      if (!activeStatuses.has(order.status)) continue;
      for (const item of order.orderServiceItems ?? []) {
        const slug = item.serviceCatalogItem?.category?.slug;
        const name = item.categoryName;
        const key = slug ? `slug:${slug}` : name ? `name:${name}` : null;
        if (key) keys.add(key);
      }
    }
    return [...keys];
  }, []);

  const getDetachedServiceCategoryKeys = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.sessionStorage.getItem('detached_service_categories');
      const entries: Array<{ categorySlug?: string; categoryName?: string }> = raw
        ? JSON.parse(raw)
        : [];
      const keys = new Set<string>();
      for (const entry of entries) {
        if (entry.categorySlug) keys.add(`slug:${entry.categorySlug}`);
        if (entry.categoryName) keys.add(`name:${entry.categoryName}`);
      }
      return [...keys];
    } catch {
      return [];
    }
  }, []);

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('user_token') || localStorage.getItem('admin_token');
  }, []);

  const refreshCart = useCallback(
    async (options?: { silent?: boolean }) => {
      if (refreshInFlightRef.current) {
        return refreshInFlightRef.current;
      }

      const task = (async () => {
        const silent = options?.silent ?? false;
        try {
          if (!silent) {
            setIsLoading(true);
          }
          const [items, serviceItems, orders] = await Promise.all([
            cartApi.getCart(),
            cartApi.getCartServiceItems().catch(() => []),
            getUserOrders().catch(() => []),
          ]);
          setCart(items);
          setCartServiceItems(serviceItems);
          setServiceOrderCategoryKeys(getOrderServiceCategoryKeys(orders));
          setDetachedServiceCategoryKeys(getDetachedServiceCategoryKeys());
        } catch {
          setCart([]);
          setCartServiceItems([]);
          setServiceOrderCategoryKeys([]);
          setDetachedServiceCategoryKeys([]);
        } finally {
          if (!silent) {
            setIsLoading(false);
          }
        }
      })();

      refreshInFlightRef.current = task;
      try {
        await task;
      } finally {
        refreshInFlightRef.current = null;
      }
    },
    [getOrderServiceCategoryKeys, getDetachedServiceCategoryKeys]
  );

  // Счётчик: товары/комплектующие + каждая категория услуг (1 за категорию)
  const count = useMemo(() => {
    const productCount = cart.reduce((sum, item) => {
      if (item.product || item.component) return sum + item.quantity;
      return sum;
    }, 0);
    const serviceCategoryKeys = new Set<string>();
    cartServiceItems.forEach((item) => {
      const slug = item.category?.slug;
      const id = item.serviceCatalogCategoryId || item.category?.id;
      const name = item.category?.name;
      const key = slug ? `slug:${slug}` : id ? `id:${id}` : name ? `name:${name}` : null;
      if (key) serviceCategoryKeys.add(key);
    });
    serviceOrderCategoryKeys.forEach((key) => serviceCategoryKeys.add(key));
    detachedServiceCategoryKeys.forEach((key) => serviceCategoryKeys.delete(key));
    const serviceCategoryCount = serviceCategoryKeys.size;
    return Math.round(productCount) + serviceCategoryCount;
  }, [cart, cartServiceItems, serviceOrderCategoryKeys, detachedServiceCategoryKeys]);

  const refreshCount = useCallback(async () => {
    // Обновляем корзину, счетчик обновится автоматически
    await refreshCart();
  }, [refreshCart]);

  // Синхронизация корзины при смене токена (логин/логаут/смена аккаунта)
  useEffect(() => {
    const syncCart = async () => {
      const token = getAuthToken();
      if (!token) {
        setCart([]);
        lastTokenRef.current = null;
        setServiceOrderCategoryKeys([]);
        return;
      }
      if (lastTokenRef.current && lastTokenRef.current !== token) {
        setCart([]);
        setServiceOrderCategoryKeys([]);
      }
      lastTokenRef.current = token;
      await refreshCart();
    };

    const handler = () => {
      syncCart().catch(() => {
        // Игнорируем ошибки при загрузке (пользователь может быть не авторизован)
      });
    };

    handler();
    window.addEventListener('auth-token-changed', handler);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && getAuthToken()) {
        refreshCart({ silent: true }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('auth-token-changed', handler);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [getAuthToken, refreshCart]);

  useEffect(() => {
    const handleDetachedChange = () => {
      setDetachedServiceCategoryKeys(getDetachedServiceCategoryKeys());
    };
    handleDetachedChange();
    window.addEventListener('cart-service-detached', handleDetachedChange);
    window.addEventListener('cart-service-restored', handleDetachedChange);
    return () => {
      window.removeEventListener('cart-service-detached', handleDetachedChange);
      window.removeEventListener('cart-service-restored', handleDetachedChange);
    };
  }, [getDetachedServiceCategoryKeys]);

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
          emitCartAuthRequired('add_product');
          throw new AuthRequiredForCartError('add_product');
        }
        throw error;
      }
    },
    [refreshCart]
  );

  const addServiceToCart = useCallback(
    async (
      categoryId: string,
      payload:
        | { items: { itemId: string; quantity: number }[] }
        | { rooms: { name: string; items: { itemId: string; quantity: number }[] }[] }
    ) => {
      try {
        await cartApi.addServiceToCart(categoryId, payload);
        await refreshCart();
      } catch (error) {
        if (error instanceof cartApi.CartDuplicateError) {
          await refreshCart();
          return;
        }
        if (error instanceof Error && error.message === 'Необходима авторизация') {
          emitCartAuthRequired('add_service');
          throw new AuthRequiredForCartError('add_service');
        }
        throw error;
      }
    },
    [refreshCart]
  );

  const removeCartServiceItemById = useCallback(
    async (itemId: string) => {
      try {
        await cartApi.removeCartServiceItemById(itemId);
        await refreshCart();
      } catch (error) {
        if (error instanceof Error && error.message === 'Необходима авторизация') {
          throw new Error('Войдите в систему');
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
          emitCartAuthRequired('add_component');
          throw new AuthRequiredForCartError('add_component');
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
      setCartServiceItems([]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы очистить корзину');
      }
      throw error;
    }
  }, []);

  const getTotalPrice = useCallback((): number => {
    const productTotal = cart.reduce((total, item) => {
      if (item.product) {
        return total + item.product.price * item.quantity;
      }
      if (item.component) {
        return total + item.component.price * item.quantity;
      }
      return total;
    }, 0);
    const serviceTotal = cartServiceItems.reduce(
      (sum, item) => sum + (item.total != null && item.total > 0 ? item.total : 0),
      0
    );
    return productTotal + serviceTotal;
  }, [cart, cartServiceItems]);

  const value: CartContextValue = {
    cart,
    cartServiceItems,
    count,
    isLoading,
    addServiceToCart,
    removeCartServiceItemById,
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
