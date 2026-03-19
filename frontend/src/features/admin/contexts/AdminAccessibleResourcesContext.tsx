'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getMyAccessibleResources } from '@/shared/api/admin-access';

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
  const [resourceIds, setResourceIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const ids = await getMyAccessibleResources();
      setResourceIds(new Set(ids));
    } catch {
      setResourceIds(new Set());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasAccess = useCallback(
    (resourceId: string | undefined) => {
      if (!resourceId) return true;
      if (isLoading) return true; // Пока грузим — показываем всё, чтобы не было мигания
      return resourceIds.has(resourceId);
    },
    [resourceIds, isLoading]
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
