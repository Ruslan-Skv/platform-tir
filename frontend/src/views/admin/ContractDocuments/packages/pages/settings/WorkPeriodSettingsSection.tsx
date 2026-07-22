'use client';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';
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
    confirmState,
    handleDefaultDaysChange,
    handleSaveDefault,
    handleConfirmModal,
    handleDismissAfterSave,
  } = useWorkPeriodSettingsSection(params);

  return (
    <section className={cdHub.packageSettingsCard}>
      <h2 className={`${cdEstimateTab.sectionTitle} ${cdHub.packageSettingsCardTitle}`}>{title}</h2>
      {loading ? (
        <p className={cdTemplates.hint}>Загрузка…</p>
      ) : (
        <>
          <div className={`${cdEstimateTab.field} ${cdHub.packageSettingsDaysField}`}>
            <label htmlFor={inputId}>Срок по умолчанию (раб. дней)</label>
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
                disabled={saving || applyingAll || parsedDefaultDays === null}
                aria-busy={saving || applyingAll}
                onClick={() => void handleSaveDefault()}
              >
                Сохранить
              </button>
            </div>
          ) : (
            <p className={cdTemplates.hint}>Изменить срок может только суперадмин.</p>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={confirmState != null}
        onClose={handleDismissAfterSave}
        onConfirm={handleConfirmModal}
        title={confirmState?.title ?? 'Подтверждение'}
        message={confirmState?.message ?? ''}
        confirmText="Применить"
        cancelText="Только сохранить"
        closeOnConfirm={false}
        confirmLoading={applyingAll}
      />
    </section>
  );
}
