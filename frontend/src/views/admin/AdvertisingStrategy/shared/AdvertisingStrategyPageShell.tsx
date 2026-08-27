'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import styles from './AdvertisingStrategy.module.css';

type AdvertisingStrategyPageShellProps = {
  subtitle?: string;
  countLabel?: string;
  countValue?: number | string;
  headerActions?: ReactNode;
  saveNoticeVisible?: boolean;
  children: ReactNode;
};

export function AdvertisingStrategyPageShell({
  subtitle,
  countLabel,
  countValue,
  headerActions,
  saveNoticeVisible = false,
  children,
}: AdvertisingStrategyPageShellProps) {
  const [actionsHost, setActionsHost] = useState<HTMLElement | null>(null);
  const [metaHost, setMetaHost] = useState<HTMLElement | null>(null);
  const [subtitleHost, setSubtitleHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setActionsHost(document.getElementById('advertising-strategy-header-actions'));
    setMetaHost(document.getElementById('advertising-strategy-header-meta'));
    setSubtitleHost(document.getElementById('advertising-strategy-subtitle'));
  }, []);

  const mobileCount =
    countValue ?? (countLabel ? (countLabel.match(/^\d+/)?.[0] ?? countLabel) : null);

  return (
    <>
      {metaHost
        ? createPortal(
            <>
              {countLabel ? (
                <span className={cdHub.contractsListCount} title={countLabel}>
                  <span className={cdHub.contractsListCountDesktop}>{countLabel}</span>
                  <span className={cdHub.contractsListCountMobile}>{mobileCount}</span>
                </span>
              ) : null}
              <AdminSaveNotice visible={saveNoticeVisible} />
            </>,
            metaHost
          )
        : null}

      {actionsHost && headerActions
        ? createPortal(
            <div className={styles.headerActionsInner}>{headerActions}</div>,
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
