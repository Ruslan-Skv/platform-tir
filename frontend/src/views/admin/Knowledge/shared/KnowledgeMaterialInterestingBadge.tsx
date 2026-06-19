'use client';

import { type ReactNode, useCallback, useMemo, useState } from 'react';

import {
  type KnowledgeMaterialLiker,
  getKnowledgeMaterialLikers,
} from '@/shared/api/admin-knowledge';
import { getAvatarUrl } from '@/shared/lib/avatar';
import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import helpStyles from '@/shared/ui/admin/AdminHelpTooltip/AdminHelpTooltip.module.css';

import styles from './KnowledgeMaterialInterestingBadge.module.css';
import { getKnowledgeLikerDisplayName } from './knowledge-utils';

type KnowledgeMaterialInterestingBadgeProps = {
  materialId: string;
  likeCount: number;
  className?: string;
  children: ReactNode;
};

const likersCache = new Map<string, KnowledgeMaterialLiker[]>();

function getCacheKey(materialId: string, likeCount: number) {
  return `${materialId}:${likeCount}`;
}

export function KnowledgeMaterialInterestingBadge({
  materialId,
  likeCount,
  className,
  children,
}: KnowledgeMaterialInterestingBadgeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<KnowledgeMaterialLiker[]>([]);

  const loadLikers = useCallback(async () => {
    const cacheKey = getCacheKey(materialId, likeCount);
    const cached = likersCache.get(cacheKey);
    if (cached) {
      setUsers(cached);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getKnowledgeMaterialLikers(materialId);
      likersCache.set(cacheKey, data.users);
      setUsers(data.users);
    } catch (e) {
      setUsers([]);
      setError(e instanceof Error ? e.message : 'Не удалось загрузить список');
    } finally {
      setLoading(false);
    }
  }, [likeCount, materialId]);

  const body = useMemo(() => {
    if (loading) {
      return <p className={styles.status}>Загрузка…</p>;
    }
    if (error) {
      return <p className={styles.statusError}>{error}</p>;
    }
    if (users.length === 0) {
      return <p className={styles.status}>Пока никто не отметил</p>;
    }

    return (
      <ul className={styles.likersList}>
        {users.map((user) => {
          const displayName = getKnowledgeLikerDisplayName(user);
          const label = displayName ?? user.email;
          const avatarUrl = getAvatarUrl(user.avatar);

          return (
            <li key={user.id} className={styles.likerItem}>
              {avatarUrl ? <img src={avatarUrl} alt="" className={styles.likerAvatar} /> : null}
              <span className={styles.likerLabel}>{label}</span>
            </li>
          );
        })}
      </ul>
    );
  }, [error, loading, users]);

  if (likeCount <= 0) {
    return <>{children}</>;
  }

  return (
    <AdminHelpTooltip
      title="Отметили как интересный"
      body={body}
      align="end"
      wrapClassName={[helpStyles.wrap, styles.badgeWrap, className].filter(Boolean).join(' ')}
      panelClassName={`${helpStyles.panelFitContent} ${styles.likesPanel}`}
      onShow={() => void loadLikers()}
    >
      <span className={styles.badgeTrigger}>{children}</span>
    </AdminHelpTooltip>
  );
}
