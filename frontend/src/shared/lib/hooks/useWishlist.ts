'use client';

import { useCallback, useEffect, useState } from 'react';

import * as wishlistApi from '@/shared/api/wishlist';

interface UseWishlistReturn {
  wishlist: string[]; // массив ID товаров в избранном
  count: number;
  isLoading: boolean;
  isChecking: boolean;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  checkInWishlist: (productId: string) => Promise<boolean>;
  refreshCount: () => Promise<void>;
}

export function useWishlist(): UseWishlistReturn {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Загружаем количество избранных товаров при монтировании
  useEffect(() => {
    refreshCount().catch(() => {
      // Игнорируем ошибки при загрузке (пользователь может быть не авторизован)
    });
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const newCount = await wishlistApi.getWishlistCount();
      setCount(newCount);
    } catch (error) {
      // Если пользователь не авторизован, устанавливаем 0
      setCount(0);
    }
  }, []);

  const addToWishlist = useCallback(async (productId: string) => {
    try {
      await wishlistApi.addToWishlist(productId);
      setWishlist((prev) => [...prev, productId]);
      setCount((prev) => prev + 1);
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы добавить товар в избранное');
      }
      throw error;
    }
  }, []);

  const removeFromWishlist = useCallback(async (productId: string) => {
    try {
      await wishlistApi.removeFromWishlist(productId);
      setWishlist((prev) => prev.filter((id) => id !== productId));
      setCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы удалить товар из избранного');
      }
      throw error;
    }
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      const isInWishlist = wishlist.includes(productId);
      if (isInWishlist) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    },
    [wishlist, addToWishlist, removeFromWishlist]
  );

  const isInWishlist = useCallback(
    (productId: string): boolean => {
      return wishlist.includes(productId);
    },
    [wishlist]
  );

  const checkInWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      setIsChecking(true);
      try {
        const result = await wishlistApi.checkInWishlist(productId);
        if (result && !wishlist.includes(productId)) {
          setWishlist((prev) => [...prev, productId]);
        } else if (!result && wishlist.includes(productId)) {
          setWishlist((prev) => prev.filter((id) => id !== productId));
        }
        return result;
      } catch {
        return false;
      } finally {
        setIsChecking(false);
      }
    },
    [wishlist]
  );

  return {
    wishlist,
    count,
    isLoading,
    isChecking,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    checkInWishlist,
    refreshCount,
  };
}
