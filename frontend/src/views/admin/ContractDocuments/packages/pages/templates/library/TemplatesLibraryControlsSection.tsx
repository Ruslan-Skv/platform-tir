'use client';

import measurementFormStyles from '@/views/admin/CRM/Measurements/MeasurementFormPage.module.css';

import cdTemplates from '../../../../styles/templates-library.module.css';
import { TemplatesLibraryControlsMetaActions } from './TemplatesLibraryControlsMetaActions';
import { TemplatesLibraryControlsMetaFields } from './TemplatesLibraryControlsMetaFields';
import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';

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
    archivedCountOnTab,
    itemsByActiveTab,
    loading,
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
        <TemplatesLibraryControlsMetaFields {...props} />
        <TemplatesLibraryControlsMetaActions {...props} />
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
