'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import measurementFormStyles from '@/views/admin/CRM/Measurements/MeasurementFormPage.module.css';
import type { PackageTemplatePreviewCustomerKind } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';
import {
  PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS,
  normalizeLibraryTemplateTabForPackageKind,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

import cdTemplates from '../../../../styles/templates-library.module.css';
import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';
import { TEMPLATE_LIBRARY_KIND_OPTIONS } from './templatesLibraryPresetUtils';

export type TemplatesLibraryControlsMetaFieldsProps = Pick<
  TemplatesLibraryPageModel,
  | 'activeLibraryKind'
  | 'activeTemplateTab'
  | 'createNewTemplate'
  | 'editingId'
  | 'handleActiveLibraryKindChange'
  | 'handleActiveTemplateTabChange'
  | 'handlePreviewCustomerKindChange'
  | 'isSuperAdmin'
  | 'itemsByActiveTab'
  | 'libraryTemplateTabIds'
  | 'loading'
  | 'previewCustomerKind'
  | 'selectTemplate'
  | 'showArchivedTemplates'
  | 'templatesCountByTab'
>;

export function TemplatesLibraryControlsMetaFields(props: TemplatesLibraryControlsMetaFieldsProps) {
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
  } = props;

  return (
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
              normalizeLibraryTemplateTabForPackageKind(e.currentTarget.value, activeLibraryKind)
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
            handlePreviewCustomerKindChange(e.target.value as PackageTemplatePreviewCustomerKind)
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
            showArchivedTemplates ? 'Скрытые шаблоны этой вкладки' : 'Шаблоны, доступные в пакете'
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
  );
}
