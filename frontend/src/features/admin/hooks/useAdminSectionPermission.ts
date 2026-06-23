'use client';

import { useMemo } from 'react';

import { usePathname } from 'next/navigation';

import {
  getAdminResourceLabel,
  resolveAdminResourceIdByPathname,
} from '@/shared/config/admin-resources';

import { useAdminAccessibleResources } from '../contexts/AdminAccessibleResourcesContext';

/** Права текущего раздела админки по URL (тот же resourceId, что в сайдбаре и модалке «Доступ»). */
export function useAdminSectionPermission() {
  const pathname = usePathname();
  const resourceId = useMemo(() => resolveAdminResourceIdByPathname(pathname), [pathname]);
  const { canView, canParticipate, canEdit, getPermission, isLoading } =
    useAdminAccessibleResources();

  return {
    pathname,
    resourceId,
    sectionLabel: resourceId ? getAdminResourceLabel(resourceId) : null,
    canView: canView(resourceId ?? undefined),
    canParticipate: canParticipate(resourceId ?? undefined),
    canEdit: canEdit(resourceId ?? undefined),
    permission: getPermission(resourceId ?? undefined),
    isLoading,
  };
}
