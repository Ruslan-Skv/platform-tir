'use client';

import { useCallback, useEffect, useState } from 'react';

import { type AdminOnlineUser, getAdminOnlineAdmins } from '@/shared/api/admin-presence';
import { getAvatarUrl, getInitials } from '@/shared/lib/avatar';

import styles from './AdminHeader.module.css';

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Суперадмин',
  ADMIN: 'Администратор',
  CONTENT_MANAGER: 'Контент-менеджер',
  MODERATOR: 'Модератор',
  SUPPORT: 'Поддержка',
  MANAGER: 'Менеджер',
  TECHNOLOGIST: 'Технолог',
  PARTNER: 'Партнёр',
  TRAINEE: 'Стажёр',
};

const POLL_MS = 20_000;
const MAX_AVATARS = 8;

function displayName(u: AdminOnlineUser): string {
  const n = `${u.firstName || ''} ${u.lastName || ''}`.trim();
  return n || u.email;
}

function roleLabel(role: string): string {
  return ROLE_LABEL[role] || role;
}

export function AdminOnlineAvatars() {
  const [online, setOnline] = useState<AdminOnlineUser[]>([]);

  const load = useCallback(async () => {
    try {
      const data = await getAdminOnlineAdmins();
      setOnline(Array.isArray(data) ? data : []);
    } catch {
      setOnline([]);
    }
  }, []);

  useEffect(() => {
    // Небольшая задержка: сначала успевает уйти heartbeat из layout (тот же сеанс).
    const first = window.setTimeout(() => load(), 400);
    const id = window.setInterval(load, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [load]);

  if (online.length === 0) {
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
        const label = `${displayName(u)} — ${roleLabel(u.role)}`;
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
