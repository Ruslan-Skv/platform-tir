'use client';

import Link from 'next/link';

import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import { SettingsPageLayout } from './SettingsPageLayout';
import { WorkPeriodSettingsSection } from './WorkPeriodSettingsSection';
import type { PackageSettingsPageModel } from './hooks/usePackageSettingsPage';

export function PackageSettingsPageView({
  isSuperAdmin,
  error,
  ok,
  setError,
  setOk,
}: PackageSettingsPageModel) {
  return (
    <SettingsPageLayout
      title="Сроки договоров"
      subtitle={
        <>
          Срок в рабочих днях для каждого направления. Подставляется в «Срок дог.» и в{' '}
          <code>{'{{contract.workPeriod}}'}</code>. После подписания срок не меняется; договоры с
          ручным сроком в карточке массовое обновление не затрагивает. Буквы направлений для
          нумерации — в разделе{' '}
          <Link href="/admin/contract-documents/settings/numbering">Нумерация договоров</Link>.
        </>
      }
      error={error}
      ok={ok}
    >
      <div className={cdHub.contractTermsSettingsStack}>
        <WorkPeriodSettingsSection
          kind="REPAIR"
          isSuperAdmin={isSuperAdmin}
          onError={setError}
          onOk={setOk}
        />
        <WorkPeriodSettingsSection
          kind="WINDOWS"
          isSuperAdmin={isSuperAdmin}
          onError={setError}
          onOk={setOk}
        />
        <WorkPeriodSettingsSection
          kind="DOORS"
          isSuperAdmin={isSuperAdmin}
          onError={setError}
          onOk={setOk}
        />
        <WorkPeriodSettingsSection
          kind="BLINDS"
          isSuperAdmin={isSuperAdmin}
          onError={setError}
          onOk={setOk}
        />
        <WorkPeriodSettingsSection
          kind="CEILINGS"
          isSuperAdmin={isSuperAdmin}
          onError={setError}
          onOk={setOk}
        />
      </div>
    </SettingsPageLayout>
  );
}
