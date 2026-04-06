'use client';

import { useEffect } from 'react';

import { postAdminPresenceHeartbeat } from '@/shared/api/admin-presence';

const INTERVAL_MS = 25_000;

/**
 * Периодически сообщает серверу, что вкладка админки открыта — для списка «кто в админке» (супер-админ).
 */
export function AdminPresenceHeartbeat() {
  useEffect(() => {
    const tick = () => {
      postAdminPresenceHeartbeat().catch(() => {
        /* сеть / 401 — тихо */
      });
    };
    tick();
    const id = window.setInterval(tick, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
