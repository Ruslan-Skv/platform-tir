'use client';

import { useAuth } from '@/features/auth';
import { canUseAdminNotificationBell } from '@/shared/config/admin-roles';

import { useAdminWebPush } from './useAdminWebPush';

export function AdminWebPushManager() {
  const { user, isAdmin, isAuthenticated } = useAuth();
  useAdminWebPush({
    enabled: isAuthenticated && isAdmin && canUseAdminNotificationBell(user?.role),
  });
  return null;
}
