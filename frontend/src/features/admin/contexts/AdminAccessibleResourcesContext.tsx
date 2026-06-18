'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { getMyAccessibleResources } from '@/shared/api/admin-access';

const STORAGE_KEY_PREFIX = 'admin-accessible-resources:';

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function readCachedResourceIds(userId: string | undefined): Set<string> {
  if (typeof window === 'undefined' || !userId) return new Set();
  try {
    const raw = sessionStorage.getItem(getStorageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

function writeCachedResourceIds(userId: string, ids: string[]): void {
  try {
    sessionStorage.setItem(getStorageKey(userId), JSON.stringify(ids));
  } catch {
    // ignore quota / private mode
  }
}

interface AdminAccessibleResourcesState {
  resourceIds: Set<string>;
  isLoading: boolean;
  hasAccess: (resourceId: string | undefined) => boolean;
  refresh: () => Promise<void>;
}

const defaultValue: AdminAccessibleResourcesState = {
  resourceIds: new Set(),
  isLoading: true,
  hasAccess: () => false,
  refresh: async () => {},
};

const AdminAccessibleResourcesContext = createContext<AdminAccessibleResourcesState>(defaultValue);

export function AdminAccessibleResourcesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [resourceIds, setResourceIds] = useState<Set<string>>(() => readCachedResourceIds(userId));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setResourceIds(readCachedResourceIds(userId));
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) {
      setResourceIds(new Set());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const ids = await getMyAccessibleResources();
      const next = new Set(ids);
      setResourceIds(next);
      writeCachedResourceIds(userId, ids);
    } catch {
      setResourceIds((prev) => (prev.size > 0 ? prev : new Set()));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasAccess = useCallback(
    (resourceId: string | undefined) => {
      if (!resourceId) return true;
      if (user?.role === 'SUPER_ADMIN') return true;
      return resourceIds.has(resourceId);
    },
    [resourceIds, user?.role]
  );

  const value: AdminAccessibleResourcesState = {
    resourceIds,
    isLoading,
    hasAccess,
    refresh: load,
  };

  return (
    <AdminAccessibleResourcesContext.Provider value={value}>
      {children}
    </AdminAccessibleResourcesContext.Provider>
  );
}

export function useAdminAccessibleResources() {
  const ctx = useContext(AdminAccessibleResourcesContext);
  if (!ctx) {
    throw new Error(
      'useAdminAccessibleResources must be used within AdminAccessibleResourcesProvider'
    );
  }
  return ctx;
}
