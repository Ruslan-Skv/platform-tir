'use client';

import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';

import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';
import { EstimatesArchiveIcon, EstimatesRestoreFromArchiveIcon } from './templatesLibraryIcons';
import { templateLibraryKindLabel } from './templatesLibraryPresetUtils';

export type TemplatesLibraryControlsMetaActionsProps = Pick<
  TemplatesLibraryPageModel,
  | 'activeLibraryKind'
  | 'editingId'
  | 'handleSaveNow'
  | 'isSuperAdmin'
  | 'requestArchiveTemplate'
  | 'requestMoveTemplateToTrash'
  | 'restoreArchivedTemplate'
  | 'saving'
  | 'showArchivedTemplates'
>;

export function TemplatesLibraryControlsMetaActions(
  props: TemplatesLibraryControlsMetaActionsProps
) {
  const {
    isSuperAdmin,
    editingId,
    activeLibraryKind,
    saving,
    showArchivedTemplates,
    handleSaveNow,
    restoreArchivedTemplate,
    requestArchiveTemplate,
    requestMoveTemplateToTrash,
  } = props;

  if (!isSuperAdmin || !editingId) return null;

  return (
    <div
      className={`${cdTemplates.templatesLibraryMetaActions} ${cdEstimatesList.estimatesCardActions}`}
    >
      <button
        data-admin-mutation
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
          data-admin-mutation
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
  );
}
