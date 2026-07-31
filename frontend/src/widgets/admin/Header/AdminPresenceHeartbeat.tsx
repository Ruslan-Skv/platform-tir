'use client';

import { useEffect } from 'react';

import { useAuth } from '@/features/auth';
import { postAdminPresenceHeartbeat } from '@/shared/api/admin-presence';
import { canRunBackgroundNetwork, whenOnlineSettled } from '@/shared/lib/browser-network';

const INTERVAL_MS = 25_000;

/**
 * Периодически сообщает серверу, что вкладка админки открыта — для списка «кто в админке».
 */
export function AdminPresenceHeartbeat() {
  const { isAuthenticated, isLoading, token } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !token) return;

    const tick = () => {
      if (!canRunBackgroundNetwork()) return;
      postAdminPresenceHeartbeat().catch(() => {
        /* сеть / 401 — тихо */
      });
    };
    tick();
    const id = window.setInterval(tick, INTERVAL_MS);
    const onWake = () => {
      void whenOnlineSettled(tick);
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [isAuthenticated, isLoading, token]);

  return null;
}
