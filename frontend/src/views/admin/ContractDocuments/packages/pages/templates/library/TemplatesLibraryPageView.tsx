'use client';

import cdBase from '../../../../styles/base.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { TemplatesLibraryControlsSection } from './TemplatesLibraryControlsSection';
import { TemplatesLibraryEditorPane } from './TemplatesLibraryEditorPane';
import { TemplatesLibraryFormatToolbarSection } from './TemplatesLibraryFormatToolbarSection';
import { TemplatesLibraryModals } from './TemplatesLibraryModals';
import { TemplatesLibraryPageHeader } from './TemplatesLibraryPageHeader';
import { TemplatesLibraryPreviewPane } from './TemplatesLibraryPreviewPane';
import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';

export function TemplatesLibraryPageView(props: TemplatesLibraryPageModel) {
  const { loading, error, ok, editingId, showArchivedTemplates, isSuperAdmin } = props;

  return (
    <div
      className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdTemplates.templatesLibraryPage} ${cdDocPreview.templatesLibraryPage} ${cdEstimateTab.templatesLibraryPage}`}
    >
      <TemplatesLibraryPageHeader {...props} loading={loading} />

      <div className={cdTemplates.templatesLibraryMessages}>
        {error ? <p className={cdTemplates.error}>{error}</p> : null}
        {!error && ok ? <p className={cdTemplates.hint}>{ok}</p> : null}
        {!error && !ok && !editingId && !showArchivedTemplates ? (
          <p className={cdTemplates.hint}>
            Нет активного шаблона. Нажмите «+ Новый шаблон», при необходимости переименуйте его
            кнопкой возле заголовка, вставьте текст и нажмите «Сохранить».
          </p>
        ) : null}
      </div>
      {!isSuperAdmin ? (
        <p className={cdTemplates.hint}>
          Режим просмотра: изменение библиотеки шаблонов недоступно без уровня «Редактирование».
        </p>
      ) : null}

      <TemplatesLibraryControlsSection {...props} />

      <TemplatesLibraryFormatToolbarSection {...props} />

      <div className={cdTemplates.contractLiveGrid}>
        <TemplatesLibraryEditorPane {...props} />
        <TemplatesLibraryPreviewPane {...props} />
      </div>

      <TemplatesLibraryModals {...props} />
    </div>
  );
}
