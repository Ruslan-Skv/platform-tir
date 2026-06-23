'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { adminEditRouteRedirectTarget, isAdminEditRoute } from '@/shared/config/admin-resources';

import { useAdminAccessibleResources } from '../contexts/AdminAccessibleResourcesContext';
import { AdminSectionPermissionContext } from '../contexts/AdminSectionPermissionContext';
import { useAdminSectionPermission } from '../hooks/useAdminSectionPermission';
import { AdminResourceReadOnlyBanner } from './AdminResourceReadOnlyBanner';

type AdminSectionAccessShellProps = {
  children: React.ReactNode;
};

/**
 * Единая обёртка доступа для всех страниц админки:
 * — редирект при закрытом разделе;
 * — редирект с create/edit и inline-редакторов при «только просмотр»;
 * — баннер режима просмотра;
 * — контекст canEdit для дочерних компонентов;
 * — data-admin-readonly на body (для портальных модалок).
 */
export function AdminSectionAccessShell({ children }: AdminSectionAccessShellProps) {
  const router = useRouter();
  const { hasAccess } = useAdminAccessibleResources();
  const sectionPermission = useAdminSectionPermission();
  const { pathname, resourceId, sectionLabel, canView, canEdit, isLoading } = sectionPermission;

  const isReadOnly = Boolean(!isLoading && resourceId && canView && !canEdit);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    if (isReadOnly) {
      document.body.setAttribute('data-admin-readonly', '');
    } else {
      document.body.removeAttribute('data-admin-readonly');
    }
    return () => document.body.removeAttribute('data-admin-readonly');
  }, [isReadOnly]);

  useEffect(() => {
    if (isLoading || !resourceId) return;

    if (!hasAccess(resourceId)) {
      router.replace('/admin');
      return;
    }

    if (!canEdit && isAdminEditRoute(pathname)) {
      const target = adminEditRouteRedirectTarget(pathname) ?? '/admin';
      router.replace(target);
    }
  }, [canEdit, hasAccess, isLoading, pathname, resourceId, router]);

  if (isLoading) {
    return (
      <AdminSectionPermissionContext.Provider value={sectionPermission}>
        {children}
      </AdminSectionPermissionContext.Provider>
    );
  }

  if (resourceId && !hasAccess(resourceId)) {
    return null;
  }

  if (resourceId && !canEdit && isAdminEditRoute(pathname)) {
    return null;
  }

  const showReadOnlyBanner = isReadOnly && Boolean(sectionLabel);

  return (
    <AdminSectionPermissionContext.Provider value={sectionPermission}>
      {showReadOnlyBanner ? <AdminResourceReadOnlyBanner sectionLabel={sectionLabel!} /> : null}
      {children}
    </AdminSectionPermissionContext.Provider>
  );
}
