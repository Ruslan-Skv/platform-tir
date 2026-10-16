'use client';

import Link from 'next/link';

import isStyles from '@/views/admin/CRM/InstallerSettlements/InstallerSettlements.module.css';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import type { InstallerAdvanceSheetCreatePageModel } from '../hooks/useInstallerAdvanceSheetCreatePage';
import { InstallerAdvanceSheetForm } from '../shared/InstallerAdvanceSheetForm';
import styles from '../shared/InstallerAdvanceSheets.module.css';

export function InstallerAdvanceSheetCreatePageView({
  model,
}: {
  model: InstallerAdvanceSheetCreatePageModel;
}) {
  const { canCreateSheets, installers, loading, submitting, message, submit } = model;

  return (
    <div
      className={`${cdBase.page} ${cdWorkspace.pageWide} ${isStyles.pageFull} ${cdHub.contractsListPage}`}
    >
      <Link href="/admin/installer-advance-sheets" className={styles.detailBackLink}>
        ← Расчётники мастеров
      </Link>

      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <h1 className={cdHub.title}>Новая ведомость авансов</h1>
          </div>
        </div>
      </div>

      {message ? (
        <div className={isStyles.pageMessage}>
          <span>{message}</span>
        </div>
      ) : null}

      {canCreateSheets ? (
        <InstallerAdvanceSheetForm
          mode="create"
          installers={installers}
          submitting={submitting || loading}
          onSubmit={submit}
          cancelHref="/admin/installer-advance-sheets"
        />
      ) : (
        <p className={styles.detailNote}>
          Создавать ведомости могут ведущие специалисты и бригадиры. Обратитесь к администратору.
        </p>
      )}
    </div>
  );
}
