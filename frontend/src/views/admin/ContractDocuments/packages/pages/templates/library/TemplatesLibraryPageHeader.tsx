'use client';

import { PencilSquareIcon } from '@heroicons/react/24/outline';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import {
  AdminToolbarArchiveButton,
  AdminToolbarIconButton,
  AdminToolbarTrashButton,
} from '@/shared/ui/admin/AdminToolbarIconButton';
import measurementFormStyles from '@/views/admin/CRM/Measurements/form/MeasurementFormPage.module.css';
import { PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

import cdTemplates from '../../../../styles/templates-library.module.css';
import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';
import { TemplatesLibraryExportIcon } from './templatesLibraryIcons';
import { templateLibraryKindLabel } from './templatesLibraryPresetUtils';

type TemplatesLibraryPageHeaderProps = Pick<
  TemplatesLibraryPageModel,
  | 'activeLibraryKind'
  | 'activeTemplateTab'
  | 'archivedTemplatesCount'
  | 'autosaveSavedVisible'
  | 'createNewTemplate'
  | 'editingId'
  | 'handleExportSeedJson'
  | 'handleRenameTemplateTitle'
  | 'isSuperAdmin'
  | 'saving'
  | 'setTitle'
  | 'setTitleRenameMode'
  | 'setTrashOpen'
  | 'showArchivedTemplates'
  | 'title'
  | 'titleRenameInputRef'
  | 'titleRenameMode'
  | 'toggleArchiveMode'
  | 'trashCount'
>;

export function TemplatesLibraryPageHeader({
  title,
  titleRenameMode,
  titleRenameInputRef,
  setTitle,
  setTitleRenameMode,
  activeTemplateTab,
  activeLibraryKind,
  isSuperAdmin,
  editingId,
  showArchivedTemplates,
  handleRenameTemplateTitle,
  autosaveSavedVisible,
  createNewTemplate,
  saving,
  handleExportSeedJson,
  archivedTemplatesCount,
  toggleArchiveMode,
  loading,
  trashCount,
  setTrashOpen,
}: TemplatesLibraryPageHeaderProps & { loading: boolean }) {
  return (
    <div className={cdTemplates.editorHeader}>
      <div className={cdTemplates.templatesLibraryTitleWithAutosave}>
        <div className={cdTemplates.templatesLibraryTitleBlock}>
          <div className={cdTemplates.templatesLibraryTitleRow}>
            <h1 className={cdTemplates.title}>Библиотека шаблонов документов</h1>
            {titleRenameMode ? (
              <input
                ref={titleRenameInputRef}
                type="text"
                className={cdTemplates.templatesLibraryCurrentTemplateTitleInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTitleRenameMode(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    setTitleRenameMode(false);
                  }
                }}
                aria-label="Название шаблона"
              />
            ) : (
              <span className={cdTemplates.templatesLibraryCurrentTemplateTitle}>
                {' - '}
                {title.trim() ||
                  `${PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS[activeTemplateTab]} ${templateLibraryKindLabel(activeLibraryKind)}`}
              </span>
            )}
            {isSuperAdmin ? (
              <button
                type="button"
                className={cdTemplates.templatesLibraryRenameTitleBtn}
                aria-label="Переименовать название шаблона"
                title="Переименовать название шаблона"
                disabled={!editingId || showArchivedTemplates}
                onClick={handleRenameTemplateTitle}
              >
                <PencilSquareIcon style={{ width: 12, height: 12 }} />
              </button>
            ) : null}
          </div>
          <p className={cdTemplates.templatesLibrarySaveHelp}>
            Сохранение работает так: первый раз нажмите «Сохранить», чтобы создать шаблон в
            выбранном направлении и типе документа. После этого изменения названия и содержимого
            сохраняются автоматически.
          </p>
        </div>
        {isSuperAdmin ? (
          <span
            className={`${measurementFormStyles.autosaveNotice} ${
              autosaveSavedVisible ? measurementFormStyles.autosaveNoticeVisible : ''
            }`}
            role="status"
            aria-live="polite"
          >
            Сохранено
          </span>
        ) : null}
      </div>
      <div className={cdTemplates.templatesLibraryHeaderActions}>
        <div className={cdTemplates.templatesLibraryHeaderButtons}>
          {isSuperAdmin ? (
            <AdminHelpTooltip
              title="Как создать шаблон"
              steps={[
                'Выберите направление и тип документа.',
                'Нажмите «+ Новый шаблон».',
                'При необходимости переименуйте шаблон у заголовка.',
                'Заполните шаблон (HTML или Визуальный конструктор).',
                'Нажмите «Сохранить» для первичного создания.',
                'Дальше изменения сохраняются автоматически.',
              ]}
              note={`Сейчас будет создан пустой шаблон для «${PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS[activeTemplateTab]}», направление «${templateLibraryKindLabel(activeLibraryKind)}».`}
              align="end"
              disabled={showArchivedTemplates}
              tooltipId="templates-library-create-help"
              wrapClassName={cdTemplates.templatesLibraryAddButtonWithTooltip}
            >
              <button
                data-admin-mutation
                type="button"
                className={cdTemplates.templatesLibraryAddButton}
                disabled={showArchivedTemplates}
                onClick={createNewTemplate}
              >
                + Новый шаблон
              </button>
            </AdminHelpTooltip>
          ) : null}
          {isSuperAdmin ? (
            <AdminToolbarIconButton
              aria-label="Экспорт"
              title="Выгрузка шаблонов на прод"
              disabled={saving}
              onClick={handleExportSeedJson}
            >
              <TemplatesLibraryExportIcon size={18} />
            </AdminToolbarIconButton>
          ) : null}
          <AdminToolbarArchiveButton
            archiveCount={archivedTemplatesCount}
            archiveView={showArchivedTemplates}
            disabled={loading}
            title="Архив шаблонов"
            aria-label="Архив шаблонов"
            onClick={toggleArchiveMode}
          />
          {isSuperAdmin ? (
            <AdminToolbarTrashButton
              trashCount={trashCount}
              onClick={() => setTrashOpen(true)}
              title="Корзина шаблонов"
              aria-label="Корзина шаблонов"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
