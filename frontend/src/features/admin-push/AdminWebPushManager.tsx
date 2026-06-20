'use client';

import { useAuth } from '@/features/auth';

import { useAdminWebPush } from './useAdminWebPush';

export function AdminWebPushManager() {
  const { isAdmin, isAuthenticated } = useAuth();
  useAdminWebPush({ enabled: isAuthenticated && isAdmin });
  return null;
}
