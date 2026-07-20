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

import { useQueryClient } from '@tanstack/react-query';

import * as compareApi from '@/shared/api/compare';
import { COMPARE_PRODUCTS_QUERY_KEY } from '@/shared/lib/hooks/useCompareProducts';

interface CompareContextValue {
  compare: string[];
  count: number;
  isLoading: boolean;
  isChecking: boolean;
  addToCompare: (productId: string) => Promise<void>;
  removeFromCompare: (productId: string) => Promise<void>;
  toggleCompare: (productId: string) => Promise<void>;
  isInCompare: (productId: string) => boolean;
  checkInCompare: (productId: string) => Promise<boolean>;
  refreshCount: () => Promise<void>;
}

const CompareContext = createContext<CompareContextValue | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [compare, setCompare] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const compareRef = useRef<string[]>([]);
  compareRef.current = compare;

  const prevHadTokenRef = useRef<boolean | null>(null);

  /** Счётчик всегда = число id в локальном списке (без рассинхрона с /compare/count). */
  const count = compare.length;

  const applyResolvedProducts = useCallback(
    (products: Awaited<ReturnType<typeof compareApi.getCompare>>) => {
      const ids = products.map((p) => p.id);
      setCompare(ids);
      if (!compareApi.hasSiteAuthToken()) {
        compareApi.writeGuestCompareIds(ids);
      }
      queryClient.setQueryData(COMPARE_PRODUCTS_QUERY_KEY, products);
    },
    [queryClient]
  );

  const reloadCompareFromStorageOrApi = useCallback(async () => {
    const hasToken = compareApi.hasSiteAuthToken();
    const prev = prevHadTokenRef.current;

    if (hasToken) {
      const guestIds = compareApi.readGuestCompareIds();
      if (guestIds.length > 0) {
        compareApi.clearGuestCompareIds();
        for (const id of guestIds) {
          try {
            await compareApi.addToCompare(id);
          } catch {
            /* дубликат, лимит или сеть */
          }
        }
      }
      try {
        const products = await compareApi.getCompare();
        applyResolvedProducts(products);
      } catch {
        setCompare([]);
        queryClient.setQueryData(COMPARE_PRODUCTS_QUERY_KEY, []);
      }
    } else {
      if (prev === true) {
        compareApi.writeGuestCompareIds(compareRef.current);
      }
      const ids = compareApi.readGuestCompareIds();
      if (ids.length === 0) {
        setCompare([]);
        queryClient.setQueryData(COMPARE_PRODUCTS_QUERY_KEY, []);
      } else {
        try {
          const products = await compareApi.getCompare();
          // Только реально загруженные товары — убираем битые id из storage и счётчика
          applyResolvedProducts(products);
        } catch {
          setCompare(ids);
          queryClient.removeQueries({ queryKey: COMPARE_PRODUCTS_QUERY_KEY });
        }
      }
    }

    prevHadTokenRef.current = hasToken;
  }, [applyResolvedProducts, queryClient]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setIsLoading(true);
      try {
        await reloadCompareFromStorageOrApi();
      } finally {
        if (alive) setIsLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, [reloadCompareFromStorageOrApi]);

  useEffect(() => {
    const onAuthOrStorage = () => {
      void reloadCompareFromStorageOrApi();
    };
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === 'user_token' ||
        e.key === 'user_data' ||
        e.key === 'admin_token' ||
        e.key === 'admin_user' ||
        e.key === compareApi.GUEST_COMPARE_STORAGE_KEY
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
  }, [reloadCompareFromStorageOrApi]);

  const refreshCount = useCallback(async () => {
    try {
      const products = await compareApi.getCompare();
      applyResolvedProducts(products);
    } catch {
      if (compareApi.hasSiteAuthToken()) {
        setCompare([]);
        queryClient.setQueryData(COMPARE_PRODUCTS_QUERY_KEY, []);
      } else {
        setCompare(compareApi.readGuestCompareIds());
      }
    }
  }, [applyResolvedProducts, queryClient]);

  const addToCompare = useCallback(
    async (productId: string) => {
      await compareApi.addToCompare(productId);
      setCompare((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
      await queryClient.invalidateQueries({ queryKey: COMPARE_PRODUCTS_QUERY_KEY });
    },
    [queryClient]
  );

  const removeFromCompare = useCallback(
    async (productId: string) => {
      await compareApi.removeFromCompare(productId);
      setCompare((prev) => prev.filter((id) => id !== productId));
      queryClient.setQueryData(
        COMPARE_PRODUCTS_QUERY_KEY,
        (prev: Awaited<ReturnType<typeof compareApi.getCompare>> | undefined) =>
          prev?.filter((p) => p.id !== productId) ?? []
      );
    },
    [queryClient]
  );

  const toggleCompare = useCallback(
    async (productId: string) => {
      const inList = compare.includes(productId);
      if (inList) {
        await removeFromCompare(productId);
      } else {
        await addToCompare(productId);
      }
    },
    [compare, addToCompare, removeFromCompare]
  );

  const isInCompare = useCallback((productId: string) => compare.includes(productId), [compare]);

  const checkInCompare = useCallback(
    async (productId: string): Promise<boolean> => {
      setIsChecking(true);
      try {
        const result = await compareApi.checkInCompare(productId);
        if (result && !compare.includes(productId)) {
          setCompare((prev) => [...prev, productId]);
        } else if (!result && compare.includes(productId)) {
          setCompare((prev) => prev.filter((id) => id !== productId));
        }
        return result;
      } catch {
        return false;
      } finally {
        setIsChecking(false);
      }
    },
    [compare]
  );

  const value = useMemo<CompareContextValue>(
    () => ({
      compare,
      count,
      isLoading,
      isChecking,
      addToCompare,
      removeFromCompare,
      toggleCompare,
      isInCompare,
      checkInCompare,
      refreshCount,
    }),
    [
      compare,
      count,
      isLoading,
      isChecking,
      addToCompare,
      removeFromCompare,
      toggleCompare,
      isInCompare,
      checkInCompare,
      refreshCount,
    ]
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (ctx === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return ctx;
}
