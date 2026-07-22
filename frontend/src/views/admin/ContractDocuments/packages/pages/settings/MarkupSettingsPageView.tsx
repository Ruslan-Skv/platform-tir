'use client';

import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import { MarkupSettingsSection } from './MarkupSettingsSection';
import { SettingsPageLayout } from './SettingsPageLayout';
import type { MarkupSettingsPageModel } from './hooks/useMarkupSettingsPage';
import { MARKUP_SETTINGS_KINDS } from './markupSettingsConstants';

export function MarkupSettingsPageView({
  isSuperAdmin,
  error,
  ok,
  setError,
  setOk,
}: MarkupSettingsPageModel) {
  return (
    <SettingsPageLayout
      title="Наценки договоров"
      subtitle={
        <>
          Наценка при расчёте заказ-наряда по направлениям. Сохранять значение может только
          суперадмин; остальные пользователи видят текущий процент.
        </>
      }
      error={error}
      ok={ok}
    >
      <div className={cdHub.contractTermsSettingsStack}>
        {MARKUP_SETTINGS_KINDS.map((kind) => (
          <MarkupSettingsSection
            key={kind}
            kind={kind}
            isSuperAdmin={isSuperAdmin}
            onError={setError}
            onOk={setOk}
          />
        ))}
      </div>
    </SettingsPageLayout>
  );
}
