'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { type AdminOnlineUser, getAdminOnlineAdmins } from '@/shared/api/admin-presence';
import { canSeeAdminOnlineAvatars, getRoleLabel } from '@/shared/config/admin-roles';
import { getAvatarUrl, getInitials } from '@/shared/lib/avatar';
import { canRunBackgroundNetwork, whenOnlineSettled } from '@/shared/lib/browser-network';

import styles from './AdminHeader.module.css';

const POLL_MS = 20_000;
const MAX_AVATARS = 8;

function displayName(u: AdminOnlineUser): string {
  const n = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return n || u.email;
}

function displayTitle(u: AdminOnlineUser): string {
  return u.jobTitle?.trim() || getRoleLabel(u.role);
}

export function AdminOnlineAvatars() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const shouldLoadPresence = canSeeAdminOnlineAvatars(user?.role);
  const [online, setOnline] = useState<AdminOnlineUser[]>([]);

  const load = useCallback(async () => {
    if (!canRunBackgroundNetwork()) return;
    try {
      const data = await getAdminOnlineAdmins();
      setOnline(Array.isArray(data) ? data : []);
    } catch {
      setOnline([]);
    }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !shouldLoadPresence) {
      setOnline([]);
      return;
    }

    const first = window.setTimeout(() => load(), 400);
    const id = window.setInterval(load, POLL_MS);
    const onWake = () => {
      void whenOnlineSettled(() => {
        void load();
      });
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
  }, [isAuthenticated, isLoading, load, shouldLoadPresence]);

  if (!shouldLoadPresence || online.length === 0) {
    return null;
  }

  const shown = online.slice(0, MAX_AVATARS);
  const rest = online.length - shown.length;

  return (
    <div
      className={styles.onlineGroup}
      title={`Сейчас в админке: ${online.length}`}
      role="group"
      aria-label={`Сейчас в админке: ${online.length}`}
    >
      {shown.map((u, index) => {
        const src = u.avatar ? getAvatarUrl(u.avatar) : null;
        const label = `${displayName(u)} — ${displayTitle(u)}`;
        return (
          <div key={u.id} className={styles.onlineFace} style={{ zIndex: index + 1 }} title={label}>
            {src ? (
              <img src={src} alt="" className={styles.onlineImg} />
            ) : (
              <span className={styles.onlineInitials} aria-hidden>
                {getInitials(u.firstName, u.lastName, u.email)}
              </span>
            )}
          </div>
        );
      })}
      {rest > 0 ? (
        <div className={styles.onlineMore} title={`Ещё ${rest}`}>
          +{rest}
        </div>
      ) : null}
    </div>
  );
}
