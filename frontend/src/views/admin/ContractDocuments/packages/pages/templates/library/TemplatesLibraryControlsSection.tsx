'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';
import measurementFormStyles from '@/views/admin/CRM/Measurements/MeasurementFormPage.module.css';
import type { PackageTemplatePreviewCustomerKind } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import {
  PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS,
  normalizeLibraryTemplateTabForPackageKind,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';
import { EstimatesArchiveIcon, EstimatesRestoreFromArchiveIcon } from './templatesLibraryIcons';
import {
  TEMPLATE_LIBRARY_KIND_OPTIONS,
  templateLibraryKindLabel,
} from './templatesLibraryPresetUtils';

export type TemplatesLibraryControlsSectionProps = Pick<
  TemplatesLibraryPageModel,
  | 'activeLibraryKind'
  | 'activeTemplateTab'
  | 'archivedCountOnTab'
  | 'createNewTemplate'
  | 'editingId'
  | 'handleActiveLibraryKindChange'
  | 'handleActiveTemplateTabChange'
  | 'handlePreviewCustomerKindChange'
  | 'handleSaveNow'
  | 'isSuperAdmin'
  | 'itemsByActiveTab'
  | 'libraryTemplateTabIds'
  | 'loading'
  | 'previewCustomerKind'
  | 'requestArchiveTemplate'
  | 'requestMoveTemplateToTrash'
  | 'restoreArchivedTemplate'
  | 'saving'
  | 'selectTemplate'
  | 'showArchivedTemplates'
  | 'templatesCountByTab'
>;

export function TemplatesLibraryControlsSection(props: TemplatesLibraryControlsSectionProps) {
  const {
    showArchivedTemplates,
    isSuperAdmin,
    editingId,
    activeLibraryKind,
    handleActiveLibraryKindChange,
    activeTemplateTab,
    handleActiveTemplateTabChange,
    libraryTemplateTabIds,
    templatesCountByTab,
    previewCustomerKind,
    handlePreviewCustomerKindChange,
    itemsByActiveTab,
    loading,
    selectTemplate,
    createNewTemplate,
    saving,
    handleSaveNow,
    restoreArchivedTemplate,
    requestArchiveTemplate,
    requestMoveTemplateToTrash,
    archivedCountOnTab,
  } = props;

  return (
    <div
      className={`${cdTemplates.sectionCard} ${cdTemplates.templatesLibraryControls} ${measurementFormStyles.blankSheet}`}
    >
      {showArchivedTemplates ? (
        <p className={cdTemplates.templatesLibraryModeBanner} role="status">
          Режим архива: видны только скрытые шаблоны. Выберите шаблон и нажмите «Восстановить» или
          снова нажмите иконку архива в шапке.
        </p>
      ) : null}

      <div
        className={`${cdTemplates.templatesLibraryMeta} ${
          isSuperAdmin && editingId ? cdTemplates.templatesLibraryMetaWithActions : ''
        }`}
      >
        <div
          className={`${measurementFormStyles.grid} ${measurementFormStyles.blankMetaGrid} ${cdTemplates.templatesLibraryMetaFields}`}
        >
          <div className={measurementFormStyles.row}>
            <label
              className={measurementFormStyles.label}
              htmlFor="templates-library-kind"
              title="Для какого направления загружается и сохраняется библиотека"
            >
              Направление
            </label>
            <select
              id="templates-library-kind"
              className={measurementFormStyles.select}
              value={activeLibraryKind}
              onChange={(e) =>
                handleActiveLibraryKindChange(e.currentTarget.value as ContractDocumentPackageKind)
              }
            >
              {TEMPLATE_LIBRARY_KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div
            className={`${measurementFormStyles.row} ${cdTemplates.templatesLibraryDocumentTypeField}`}
          >
            <label
              className={measurementFormStyles.label}
              htmlFor="templates-library-tab"
              title="Тип документа в библиотеке шаблонов"
            >
              Тип документа
            </label>
            <select
              id="templates-library-tab"
              className={measurementFormStyles.select}
              value={activeTemplateTab}
              onChange={(e) =>
                handleActiveTemplateTabChange(
                  normalizeLibraryTemplateTabForPackageKind(
                    e.currentTarget.value,
                    activeLibraryKind
                  )
                )
              }
            >
              {libraryTemplateTabIds.map((tab) => (
                <option key={tab} value={tab}>
                  {PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS[tab]} ({templatesCountByTab[tab]})
                </option>
              ))}
            </select>
          </div>
          <div className={measurementFormStyles.row}>
            <label
              className={measurementFormStyles.label}
              htmlFor="templates-library-preview-customer"
              title="Тестовые данные в предпросмотре справа"
            >
              Превью заказчика
            </label>
            <select
              id="templates-library-preview-customer"
              className={measurementFormStyles.select}
              value={previewCustomerKind}
              onChange={(e) =>
                handlePreviewCustomerKindChange(
                  e.target.value as PackageTemplatePreviewCustomerKind
                )
              }
            >
              <option value="PERSON">Физическое лицо</option>
              <option value="COMPANY">Юридическое лицо</option>
              <option value="ENTREPRENEUR">ИП</option>
            </select>
          </div>
          <div className={measurementFormStyles.row}>
            <label
              className={measurementFormStyles.label}
              htmlFor="templates-library-template"
              title={
                showArchivedTemplates
                  ? 'Скрытые шаблоны этой вкладки'
                  : 'Шаблоны, доступные в пакете'
              }
            >
              {showArchivedTemplates ? 'Архивный шаблон' : 'Активный шаблон'}
            </label>
            {itemsByActiveTab.length > 1 ? (
              <select
                id="templates-library-template"
                className={measurementFormStyles.select}
                value={editingId}
                disabled={loading}
                onChange={(e) => selectTemplate(e.target.value)}
              >
                {itemsByActiveTab.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.title}
                  </option>
                ))}
              </select>
            ) : itemsByActiveTab.length === 1 ? (
              <input
                id="templates-library-template"
                className={measurementFormStyles.input}
                value={`Шаблон: ${itemsByActiveTab[0].title}`}
                readOnly
              />
            ) : showArchivedTemplates ? (
              <input
                id="templates-library-template"
                className={measurementFormStyles.input}
                value="Архив пуст"
                readOnly
              />
            ) : (
              <button
                id="templates-library-template"
                type="button"
                className={cdTemplates.templatesLibraryAddButton}
                disabled={!isSuperAdmin || loading}
                onClick={createNewTemplate}
                title="Создать первый шаблон для выбранного типа документа"
              >
                Создать шаблон
              </button>
            )}
          </div>
        </div>
        {isSuperAdmin && editingId ? (
          <div
            className={`${cdTemplates.templatesLibraryMetaActions} ${cdEstimatesList.estimatesCardActions}`}
          >
            <button
              type="button"
              className={cdTemplates.templatesLibraryAddButton}
              disabled={saving || showArchivedTemplates}
              title={
                showArchivedTemplates
                  ? 'Сохранение недоступно в режиме архива'
                  : `Сохранить шаблон в направлении «${templateLibraryKindLabel(activeLibraryKind)}»`
              }
              onClick={() => void handleSaveNow()}
            >
              Сохранить
            </button>
            {showArchivedTemplates ? (
              <button
                type="button"
                className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
                disabled={!editingId || saving}
                aria-label="Восстановить"
                title="Вернуть шаблон в активные"
                onClick={() => void restoreArchivedTemplate()}
              >
                <EstimatesRestoreFromArchiveIcon />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={`${cdEstimatesList.secondaryBtn} ${cdEstimatesList.estimatesIconBtn}`}
                  disabled={!editingId || saving}
                  aria-label="В архив"
                  title="Скрыть из пакета без удаления; восстановление через архив в шапке"
                  onClick={requestArchiveTemplate}
                >
                  <EstimatesArchiveIcon />
                </button>
                <AdminTableIconButton
                  aria-label="В корзину"
                  title="Корзина: восстановление в течение 30 дней"
                  disabled={!editingId || saving}
                  onClick={requestMoveTemplateToTrash}
                >
                  <DeleteIcon />
                </AdminTableIconButton>
              </>
            )}
          </div>
        ) : null}
        <div className={cdTemplates.templatesLibraryMetaRow}>
          {!showArchivedTemplates &&
          itemsByActiveTab.length === 0 &&
          archivedCountOnTab > 0 &&
          !loading ? (
            <span className={cdTemplates.templatesLibraryMetaHint}>
              На этой вкладке только архивные — откройте архив иконкой в шапке ({archivedCountOnTab}
              ).
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
