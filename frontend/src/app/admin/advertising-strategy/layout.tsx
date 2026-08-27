'use client';

import type { ReactNode } from 'react';

import styles from '@/views/admin/AdvertisingStrategy/shared/AdvertisingStrategy.module.css';
import { AdvertisingStrategyRulesInfoTip } from '@/views/admin/AdvertisingStrategy/shared/AdvertisingStrategyRulesInfoTip';
import { AdvertisingStrategyTabs } from '@/views/admin/AdvertisingStrategy/shared/AdvertisingStrategyTabs';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

export default function AdvertisingStrategyLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage} ${styles.page}`}
    >
      <div className={`${cdHub.editorHeader} ${styles.header}`}>
        <div className={`${cdHub.contractsListHeaderLeft} ${styles.headerLeft}`}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={`${cdHub.title} ${styles.title}`}>Рекламная стратегия</h1>
                <AdvertisingStrategyRulesInfoTip />
              </div>
              <div id="advertising-strategy-header-meta" className={styles.headerMetaSlot} />
            </div>
          </div>
        </div>
        <div className={styles.headerActionsSlot} id="advertising-strategy-header-actions" />
      </div>

      <div className={styles.subtitleSlot} id="advertising-strategy-subtitle" />
      <AdvertisingStrategyTabs />
      {children}
    </div>
  );
}
