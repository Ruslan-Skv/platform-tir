'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as compareApi from '@/shared/api/compare';

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
  const [compare, setCompare] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const newCount = await compareApi.getCompareCount();
      setCount(newCount);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    refreshCount().catch(() => {});
  }, [refreshCount]);

  const addToCompare = useCallback(
    async (productId: string) => {
      try {
        await compareApi.addToCompare(productId);
        setCompare((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
        // Синхронизируем счетчик с сервером после успешной операции
        await refreshCount();
      } catch (error) {
        if (error instanceof Error && error.message === 'Необходима авторизация') {
          throw new Error('Войдите в систему, чтобы добавить товар в сравнение');
        }
        throw error;
      }
    },
    [refreshCount]
  );

  const removeFromCompare = useCallback(
    async (productId: string) => {
      try {
        await compareApi.removeFromCompare(productId);
        setCompare((prev) => prev.filter((id) => id !== productId));
        // Синхронизируем счетчик с сервером после успешной операции
        await refreshCount();
      } catch (error) {
        if (error instanceof Error && error.message === 'Необходима авторизация') {
          throw new Error('Войдите в систему, чтобы удалить товар из сравнения');
        }
        throw error;
      }
    },
    [refreshCount]
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
