'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as wishlistApi from '@/shared/api/wishlist';

interface WishlistContextValue {
  wishlist: string[];
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

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const newCount = await wishlistApi.getWishlistCount();
      setCount(newCount);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    refreshCount().catch(() => {});
  }, [refreshCount]);

  const addToWishlist = useCallback(async (productId: string) => {
    try {
      await wishlistApi.addToWishlist(productId);
      setWishlist((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
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
      const inList = wishlist.includes(productId);
      if (inList) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId);
      }
    },
    [wishlist, addToWishlist, removeFromWishlist]
  );

  const isInWishlist = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

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

  const value = useMemo<WishlistContextValue>(
    () => ({
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
    }),
    [
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
    ]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (ctx === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return ctx;
}
