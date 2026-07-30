'use client';

import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import { DirectionNumberLettersSection } from './DirectionNumberLettersSection';
import { NumberingEmployeeCodesSection } from './NumberingEmployeeCodesSection';
import { NumberingFormatHelpSection } from './NumberingFormatHelpSection';
import { NumberingOfficePrefixesSection } from './NumberingOfficePrefixesSection';
import styles from './NumberingSettingsPage.module.css';
import { SettingsPageLayout } from './SettingsPageLayout';
import type { NumberingSettingsPageModel } from './hooks/useNumberingSettingsPage';

export function NumberingSettingsPageView({
  isSuperAdmin,
  error,
  ok,
  setError,
  setOk,
  loading,
  offices,
  officeDrafts,
  officeSavingId,
  setOfficeDraft,
  saveOfficePrefix,
  filteredUsers,
  userDrafts,
  userSavingId,
  userFilter,
  setUserFilter,
  setUserDraft,
  saveUserCode,
}: NumberingSettingsPageModel) {
  return (
    <SettingsPageLayout
      title="Нумерация договоров"
      subtitle={
        <>
          Единый справочник для формата <code className={styles.code}>77/1/3д-5</code>: префикс
          офиса, код менеджера, код замерщика, буква направления и порядковый номер (свой у каждого
          менеджера по направлению).
        </>
      }
      error={error}
      ok={ok}
    >
      <div className={styles.stack}>
        <NumberingFormatHelpSection />
        {loading ? (
          <p className={cdTemplates.hint}>Загрузка справочников…</p>
        ) : (
          <>
            <NumberingOfficePrefixesSection
              isSuperAdmin={isSuperAdmin}
              offices={offices}
              officeDrafts={officeDrafts}
              officeSavingId={officeSavingId}
              onDraftChange={setOfficeDraft}
              onSave={(id) => void saveOfficePrefix(id)}
            />
            <NumberingEmployeeCodesSection
              isSuperAdmin={isSuperAdmin}
              users={filteredUsers}
              userDrafts={userDrafts}
              userSavingId={userSavingId}
              userFilter={userFilter}
              onFilterChange={setUserFilter}
              onDraftChange={setUserDraft}
              onSave={(id) => void saveUserCode(id)}
            />
            <DirectionNumberLettersSection
              isSuperAdmin={isSuperAdmin}
              onError={setError}
              onOk={setOk}
            />
          </>
        )}
      </div>
    </SettingsPageLayout>
  );
}
