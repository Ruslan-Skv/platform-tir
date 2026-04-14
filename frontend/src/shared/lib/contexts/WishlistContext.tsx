'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

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

  const wishlistRef = useRef<string[]>([]);
  wishlistRef.current = wishlist;

  const prevHadTokenRef = useRef<boolean | null>(null);

  const reloadWishlistFromStorageOrApi = useCallback(async () => {
    const hasToken = wishlistApi.hasSiteAuthToken();
    const prev = prevHadTokenRef.current;

    if (hasToken) {
      const guestIds = wishlistApi.readGuestWishlistIds();
      if (guestIds.length > 0) {
        wishlistApi.clearGuestWishlistIds();
        for (const id of guestIds) {
          try {
            await wishlistApi.addToWishlist(id);
          } catch {
            /* дубликат или сеть */
          }
        }
      }
      try {
        const products = await wishlistApi.getWishlist();
        setWishlist(products.map((p) => p.id));
        setCount(products.length);
      } catch {
        setWishlist([]);
        setCount(0);
      }
    } else {
      if (prev === true) {
        wishlistApi.writeGuestWishlistIds(wishlistRef.current);
      }
      const ids = wishlistApi.readGuestWishlistIds();
      setWishlist(ids);
      setCount(ids.length);
    }

    prevHadTokenRef.current = hasToken;
  }, []);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setIsLoading(true);
      try {
        await reloadWishlistFromStorageOrApi();
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [reloadWishlistFromStorageOrApi]);

  useEffect(() => {
    const onAuthOrStorage = () => {
      void reloadWishlistFromStorageOrApi();
    };
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'user_token' ||
        e.key === 'user_data' ||
        e.key === 'admin_token' ||
        e.key === 'admin_user' ||
        e.key === wishlistApi.GUEST_WISHLIST_STORAGE_KEY
      ) {
        onAuthOrStorage();
      }
    };
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('auth-token-changed', onAuthOrStorage);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('auth-token-changed', onAuthOrStorage);
      window.removeEventListener('storage', onStorage);
    };
  }, [reloadWishlistFromStorageOrApi]);

  const refreshCount = useCallback(async () => {
    try {
      const newCount = await wishlistApi.getWishlistCount();
      setCount(newCount);
    } catch {
      setCount(wishlistApi.hasSiteAuthToken() ? 0 : wishlistApi.readGuestWishlistIds().length);
    }
  }, []);

  const addToWishlist = useCallback(
    async (productId: string) => {
      await wishlistApi.addToWishlist(productId);
      setWishlist((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
      await refreshCount();
    },
    [refreshCount]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      await wishlistApi.removeFromWishlist(productId);
      setWishlist((prev) => prev.filter((id) => id !== productId));
      await refreshCount();
    },
    [refreshCount]
  );

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
