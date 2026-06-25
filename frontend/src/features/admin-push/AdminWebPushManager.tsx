'use client';

import { useAdminAccessibleResources } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { useAuth } from '@/features/auth';

import { useAdminWebPush } from './useAdminWebPush';

const ADMIN_NOTIFICATIONS_RESOURCE_ID = 'admin.settings.notifications';

export function AdminWebPushManager() {
  const { isAdmin, isAuthenticated } = useAuth();
  const { hasAccess } = useAdminAccessibleResources();
  useAdminWebPush({
    enabled: isAuthenticated && isAdmin && hasAccess(ADMIN_NOTIFICATIONS_RESOURCE_ID),
  });
  return null;
}
