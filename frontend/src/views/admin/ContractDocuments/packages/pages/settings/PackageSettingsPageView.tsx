'use client';

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
          Срок в рабочих днях подставляется в поле «Срок дог.» на вкладке «Данные» и в шаблон{' '}
          <code>{'{{contract.workPeriod}}'}</code>. Менять срок (здесь, в карточке договора и
          массово) могут только пользователи с ролью суперадмин. После подписания договора срок
          изменить нельзя. До подписания суперадмин может задать срок в карточке (ручной режим) —
          такие договоры не затрагивает массовое обновление.
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
      </div>
    </SettingsPageLayout>
  );
}
