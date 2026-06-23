'use client';

import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import {
  type UseWorkPeriodSettingsSectionParams,
  useWorkPeriodSettingsSection,
} from './hooks/useWorkPeriodSettingsSection';

export function WorkPeriodSettingsSection(params: UseWorkPeriodSettingsSectionParams) {
  const {
    title,
    inputId,
    loading,
    saving,
    applyingAll,
    defaultDaysInput,
    updatedAt,
    parsedDefaultDays,
    isSuperAdmin,
    handleDefaultDaysChange,
    handleSaveDefault,
    handleApplyToAll,
  } = useWorkPeriodSettingsSection(params);

  return (
    <section className={cdHub.packageSettingsCard}>
      <h2 className={cdEstimateTab.sectionTitle}>{title}</h2>
      {loading ? (
        <p className={cdTemplates.hint}>Загрузка…</p>
      ) : (
        <>
          <div className={cdEstimateTab.field}>
            <label htmlFor={inputId}>Срок договора по умолчанию (рабочих дней)</label>
            <input
              id={inputId}
              inputMode="numeric"
              value={defaultDaysInput}
              onChange={(e) => handleDefaultDaysChange(e.target.value)}
              disabled={!isSuperAdmin}
              readOnly={!isSuperAdmin}
              autoComplete="off"
            />
            {updatedAt ? (
              <span className={cdTemplates.hint}>
                Обновлено: {new Date(updatedAt).toLocaleString('ru-RU')}
              </span>
            ) : null}
          </div>

          {isSuperAdmin ? (
            <div className={cdHub.packageSettingsActions}>
              <button
                data-admin-mutation
                type="button"
                className={cdWorkspace.primaryBtn}
                disabled={saving || parsedDefaultDays === null}
                onClick={() => void handleSaveDefault()}
              >
                {saving ? 'Сохранение…' : 'Сохранить по умолчанию'}
              </button>
              <button
                type="button"
                className={cdWorkspace.secondaryBtn}
                disabled={applyingAll || parsedDefaultDays === null}
                onClick={() => void handleApplyToAll()}
              >
                {applyingAll ? 'Применение…' : `Применить ко всем договорам «${title}»`}
              </button>
            </div>
          ) : (
            <p className={cdTemplates.hint}>
              Изменить срок по умолчанию или применить ко всем договорам может только суперадмин.
            </p>
          )}
        </>
      )}
    </section>
  );
}
