'use client';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import type { TemplatesLibraryPageModel } from './hooks/useTemplatesLibraryPage';
import { TemplateTrashModal } from './modals/TemplateTrashModal';

type TemplatesLibraryModalsProps = Pick<
  TemplatesLibraryPageModel,
  | 'confirmArchiveTemplate'
  | 'confirmMoveTemplateToTrash'
  | 'handleTrashRestored'
  | 'setTemplateArchivePending'
  | 'setTemplateTrashPending'
  | 'setTrashOpen'
  | 'templateArchiveConfirmMessage'
  | 'templateArchivePending'
  | 'templateTrashConfirmMessage'
  | 'templateTrashPending'
  | 'trashOpen'
>;

export function TemplatesLibraryModals({
  templateArchivePending,
  setTemplateArchivePending,
  confirmArchiveTemplate,
  templateArchiveConfirmMessage,
  templateTrashPending,
  setTemplateTrashPending,
  confirmMoveTemplateToTrash,
  templateTrashConfirmMessage,
  trashOpen,
  setTrashOpen,
  handleTrashRestored,
}: TemplatesLibraryModalsProps) {
  return (
    <>
      <ConfirmModal
        isOpen={templateArchivePending != null}
        onClose={() => setTemplateArchivePending(null)}
        onConfirm={confirmArchiveTemplate}
        title="В архив?"
        message={templateArchiveConfirmMessage}
        confirmText="В архив"
        cancelText="Отмена"
        variant="danger"
      />
      <ConfirmModal
        isOpen={templateTrashPending != null}
        onClose={() => setTemplateTrashPending(null)}
        onConfirm={confirmMoveTemplateToTrash}
        title="Переместить в корзину?"
        message={templateTrashConfirmMessage}
        confirmText="В корзину"
        cancelText="Отмена"
        variant="danger"
      />
      <TemplateTrashModal
        isOpen={trashOpen}
        onClose={() => setTrashOpen(false)}
        onRestored={handleTrashRestored}
      />
    </>
  );
}
