'use client';

import { useCallback, useEffect, useState } from 'react';

import * as compareApi from '@/shared/api/compare';

interface UseCompareReturn {
  compare: string[]; // массив ID товаров в сравнении
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

export function useCompare(): UseCompareReturn {
  const [compare, setCompare] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Загружаем количество товаров в сравнении при монтировании
  useEffect(() => {
    refreshCount().catch(() => {
      // Игнорируем ошибки при загрузке (пользователь может быть не авторизован)
    });
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const newCount = await compareApi.getCompareCount();
      setCount(newCount);
    } catch (error) {
      // Если пользователь не авторизован, устанавливаем 0
      setCount(0);
    }
  }, []);

  const addToCompare = useCallback(async (productId: string) => {
    try {
      await compareApi.addToCompare(productId);
      setCompare((prev) => [...prev, productId]);
      setCount((prev) => prev + 1);
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы добавить товар в сравнение');
      }
      throw error;
    }
  }, []);

  const removeFromCompare = useCallback(async (productId: string) => {
    try {
      await compareApi.removeFromCompare(productId);
      setCompare((prev) => prev.filter((id) => id !== productId));
      setCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      if (error instanceof Error && error.message === 'Необходима авторизация') {
        throw new Error('Войдите в систему, чтобы удалить товар из сравнения');
      }
      throw error;
    }
  }, []);

  const toggleCompare = useCallback(
    async (productId: string) => {
      const isInCompare = compare.includes(productId);
      if (isInCompare) {
        await removeFromCompare(productId);
      } else {
        await addToCompare(productId);
      }
    },
    [compare, addToCompare, removeFromCompare]
  );

  const isInCompare = useCallback(
    (productId: string): boolean => {
      return compare.includes(productId);
    },
    [compare]
  );

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

  return {
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
  };
}
