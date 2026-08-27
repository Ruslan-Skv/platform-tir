'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';

import styles from './AdvertisingStrategy.module.css';

type AdvertisingStrategyPageShellProps = {
  subtitle?: string;
  countLabel?: string;
  headerActions?: ReactNode;
  saveNoticeVisible?: boolean;
  children: ReactNode;
};

export function AdvertisingStrategyPageShell({
  subtitle,
  countLabel,
  headerActions,
  saveNoticeVisible = false,
  children,
}: AdvertisingStrategyPageShellProps) {
  const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null);
  const [subtitleHost, setSubtitleHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActionsHost(document.getElementById('advertising-strategy-header-actions'));
    setSubtitleHost(document.getElementById('advertising-strategy-subtitle'));
  }, []);

  return (
    <>
      {actionsHost
        ? createPortal(
            <div className={styles.headerActionsInner}>
              {countLabel ? (
                <span className={styles.countBadge} title={countLabel}>
                  {countLabel}
                </span>
              ) : null}
              <AdminSaveNotice visible={saveNoticeVisible} />
              {headerActions}
            </div>,
            actionsHost
          )
        : null}

      {subtitleHost
        ? createPortal(
            subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null,
            subtitleHost
          )
        : null}

      {children}
    </>
  );
}
