'use client';

import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdEstimateTab from '@/views/admin/ContractDocuments/styles/estimate-tab.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import { DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT } from '../../families/product-like/print/productWorkOrder';
import {
  type UseMarkupSettingsSectionParams,
  useMarkupSettingsSection,
} from './hooks/useMarkupSettingsSection';

export function MarkupSettingsSection(params: UseMarkupSettingsSectionParams) {
  const {
    title,
    inputId,
    loading,
    saving,
    markupInput,
    setMarkupInput,
    updatedAt,
    parsedMarkup,
    isSuperAdmin,
    handleSave,
  } = useMarkupSettingsSection(params);

  return (
    <section className={cdHub.packageSettingsCard}>
      <h2 className={`${cdEstimateTab.sectionTitle} ${cdHub.packageSettingsCardTitle}`}>{title}</h2>
      {loading ? (
        <p className={cdTemplates.hint}>Загрузка…</p>
      ) : (
        <>
          <p className={cdTemplates.hint} style={{ marginBottom: 12 }}>
            При формировании заказ-наряда цена каждой позиции считается как цена в счёт-заказе минус
            указанный процент (по умолчанию {DEFAULT_WINDOWS_WORK_ORDER_MARKUP_PERCENT}%).
          </p>
          <div className={cdEstimateTab.field}>
            <label htmlFor={inputId}>Наценка при расчёте заказ-наряда, %</label>
            <input
              id={inputId}
              type="text"
              inputMode="numeric"
              value={markupInput}
              disabled={!isSuperAdmin || saving}
              readOnly={!isSuperAdmin}
              autoComplete="off"
              onChange={(e) => setMarkupInput(e.target.value)}
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
                disabled={saving || parsedMarkup === null}
                aria-busy={saving}
                onClick={() => void handleSave()}
              >
                Сохранить
              </button>
            </div>
          ) : (
            <p className={cdTemplates.hint}>Изменить наценку может только суперадмин.</p>
          )}
        </>
      )}
    </section>
  );
}
