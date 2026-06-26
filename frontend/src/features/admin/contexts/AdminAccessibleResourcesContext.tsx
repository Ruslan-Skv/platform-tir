'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import { type MyAccessibleResourceItem, getMyAccessibleResources } from '@/shared/api/admin-access';

const STORAGE_KEY_PREFIX = 'admin-accessible-resources:';

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function readCachedAdminAccessibleResources(
  userId: string | undefined
): MyAccessibleResourceItem[] {
  return readCachedResources(userId);
}

export function createHasAccessChecker(
  resourceIds: Set<string>,
  role: string | undefined
): (resourceId: string | undefined) => boolean {
  return (resourceId: string | undefined) => {
    if (!resourceId) return true;
    if (role === 'SUPER_ADMIN') return true;
    return resourceIds.has(resourceId);
  };
}

function readCachedResources(userId: string | undefined): MyAccessibleResourceItem[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = sessionStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MyAccessibleResourceItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCachedResources(userId: string, resources: MyAccessibleResourceItem[]): void {
  try {
    sessionStorage.setItem(getStorageKey(userId), JSON.stringify(resources));
  } catch {
    // ignore quota / private mode
  }
}

export type AdminResourcePermissionLevel = 'VIEW' | 'PARTICIPATE' | 'EDIT';

interface AdminAccessibleResourcesState {
  resources: MyAccessibleResourceItem[];
  resourceIds: Set<string>;
  isLoading: boolean;
  hasAccess: (resourceId: string | undefined) => boolean;
  canView: (resourceId: string | undefined) => boolean;
  canParticipate: (resourceId: string | undefined) => boolean;
  canEdit: (resourceId: string | undefined) => boolean;
  getPermission: (resourceId: string | undefined) => AdminResourcePermissionLevel | null;
  refresh: () => Promise<void>;
}

const defaultValue: AdminAccessibleResourcesState = {
  resources: [],
  resourceIds: new Set(),
  isLoading: true,
  hasAccess: () => false,
  canView: () => false,
  canParticipate: () => false,
  canEdit: () => false,
  getPermission: () => null,
  refresh: async () => {},
};

const AdminAccessibleResourcesContext = createContext<AdminAccessibleResourcesState>(defaultValue);

export function AdminAccessibleResourcesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;

  const [resources, setResources] = useState<MyAccessibleResourceItem[]>(() =>
    readCachedResources(userId)
  );
  const [isLoading, setIsLoading] = useState(() => {
    if (!userId) return false;
    return readCachedResources(userId).length === 0;
  });

  useEffect(() => {
    if (!userId) return;
    const cached = readCachedResources(userId);
    if (cached.length > 0) {
      setResources(cached);
    }
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const cached = readCachedResources(userId);
    const hasCache = cached.length > 0;
    if (isSuperAdmin || hasCache) {
      if (hasCache) {
        setResources(cached);
      }
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      const next = await getMyAccessibleResources();
      setResources(next);
      writeCachedResources(userId, next);
    } catch {
      setResources((prev) => (prev.length > 0 ? prev : hasCache ? cached : []));
    } finally {
      setIsLoading(false);
    }
  }, [userId, user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  const permissionById = useMemo(() => {
    const map = new Map<string, AdminResourcePermissionLevel>();
    for (const item of resources) {
      map.set(item.id, item.permission);
    }
    return map;
  }, [resources]);

  const resourceIds = useMemo(() => new Set(resources.map((r) => r.id)), [resources]);

  const getPermission = useCallback(
    (resourceId: string | undefined): AdminResourcePermissionLevel | null => {
      if (!resourceId) return 'EDIT';
      if (user?.role === 'SUPER_ADMIN') return 'EDIT';
      return permissionById.get(resourceId) ?? null;
    },
    [permissionById, user?.role]
  );

  const hasAccess = useCallback(
    (resourceId: string | undefined) => {
      if (!resourceId) return true;
      if (user?.role === 'SUPER_ADMIN') return true;
      return resourceIds.has(resourceId);
    },
    [resourceIds, user?.role]
  );

  const canView = useCallback(
    (resourceId: string | undefined) => {
      const permission = getPermission(resourceId);
      return permission === 'VIEW' || permission === 'PARTICIPATE' || permission === 'EDIT';
    },
    [getPermission]
  );

  const canParticipate = useCallback(
    (resourceId: string | undefined) => {
      const permission = getPermission(resourceId);
      return permission === 'PARTICIPATE' || permission === 'EDIT';
    },
    [getPermission]
  );

  const canEdit = useCallback(
    (resourceId: string | undefined) => getPermission(resourceId) === 'EDIT',
    [getPermission]
  );

  const value: AdminAccessibleResourcesState = {
    resources,
    resourceIds,
    isLoading,
    hasAccess,
    canView,
    canParticipate,
    canEdit,
    getPermission,
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

export function useAdminResourcePermission(resourceId: string) {
  const { canView, canParticipate, canEdit, getPermission, isLoading } =
    useAdminAccessibleResources();
  return {
    canView: canView(resourceId),
    canParticipate: canParticipate(resourceId),
    canEdit: canEdit(resourceId),
    permission: getPermission(resourceId),
    isLoading,
  };
}
