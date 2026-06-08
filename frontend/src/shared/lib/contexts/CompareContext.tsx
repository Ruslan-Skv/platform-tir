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
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const compareRef = useRef<string[]>([]);
  compareRef.current = compare;

  const prevHadTokenRef = useRef<boolean | null>(null);

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
        setCompare(products.map((p) => p.id));
        setCount(products.length);
        queryClient.setQueryData(COMPARE_PRODUCTS_QUERY_KEY, products);
      } catch {
        setCompare([]);
        setCount(0);
        queryClient.setQueryData(COMPARE_PRODUCTS_QUERY_KEY, []);
      }
    } else {
      if (prev === true) {
        compareApi.writeGuestCompareIds(compareRef.current);
      }
      const ids = compareApi.readGuestCompareIds();
      setCompare(ids);
      setCount(ids.length);
      if (ids.length === 0) {
        queryClient.setQueryData(COMPARE_PRODUCTS_QUERY_KEY, []);
      } else {
        try {
          const products = await compareApi.getCompare();
          queryClient.setQueryData(COMPARE_PRODUCTS_QUERY_KEY, products);
        } catch {
          queryClient.removeQueries({ queryKey: COMPARE_PRODUCTS_QUERY_KEY });
        }
      }
    }

    prevHadTokenRef.current = hasToken;
  }, [queryClient]);

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
      const newCount = await compareApi.getCompareCount();
      setCount(newCount);
    } catch {
      setCount(compareApi.hasSiteAuthToken() ? 0 : compareApi.readGuestCompareIds().length);
    }
  }, []);

  const addToCompare = useCallback(
    async (productId: string) => {
      await compareApi.addToCompare(productId);
      setCompare((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
      await refreshCount();
      await queryClient.invalidateQueries({ queryKey: COMPARE_PRODUCTS_QUERY_KEY });
    },
    [queryClient, refreshCount]
  );

  const removeFromCompare = useCallback(
    async (productId: string) => {
      await compareApi.removeFromCompare(productId);
      setCompare((prev) => prev.filter((id) => id !== productId));
      await refreshCount();
      queryClient.setQueryData(
        COMPARE_PRODUCTS_QUERY_KEY,
        (prev: Awaited<ReturnType<typeof compareApi.getCompare>> | undefined) =>
          prev?.filter((p) => p.id !== productId) ?? []
      );
    },
    [queryClient, refreshCount]
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
