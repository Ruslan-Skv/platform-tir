import { useCallback, useMemo } from 'react';

import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import { packageLibraryTemplateTabIdFromPreset } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

import { templateLibraryKindLabel } from '../../templatesLibraryPresetUtils';
import type {
  TemplatesLibraryMutationsPersistApi,
  UseTemplatesLibraryMutationsParams,
} from './templatesLibraryMutationsTypes';

type SelectionApi = {
  applyEditingTemplateFromList: (list: ContractTemplatePreset[], id: string) => void;
};

export function useTemplatesLibraryMutationsArchive(
  params: UseTemplatesLibraryMutationsParams,
  persistApi: TemplatesLibraryMutationsPersistApi,
  selectionApi: SelectionApi
) {
  const {
    isSuperAdmin,
    activeLibraryKind,
    activeTemplateTab,
    editingId,
    title,
    items,
    setEditingId,
    setTitle,
    setHtml,
    setVisualDraftHtml,
    resetTemplateHistory,
    setError,
    setTemplateArchivePending,
    templateArchivePending,
    autosaveTimerRef,
    templateArchiveSwitchRef,
  } = params;

  const { persist, flushAutosave } = persistApi;
  const { applyEditingTemplateFromList } = selectionApi;

  const requestArchiveTemplate = useCallback(() => {
    if (!isSuperAdmin || !editingId) return;
    const current = items.find((it) => it.id === editingId);
    if (!current) return;
    if (current.archived) {
      setError('Этот шаблон уже в архиве.');
      return;
    }
    void (async () => {
      await flushAutosave();
      const fresh = items.find((it) => it.id === editingId);
      if (!fresh || fresh.archived) return;
      const name = (fresh.title ?? title).trim() || 'без названия';
      setTemplateArchivePending({ presetId: editingId, name });
    })();
  }, [isSuperAdmin, editingId, items, setError, flushAutosave, title, setTemplateArchivePending]);

  const confirmArchiveTemplate = useCallback(() => {
    const pending = templateArchivePending;
    if (!pending || !isSuperAdmin) return;
    const presetId = pending.presetId;
    void (async () => {
      templateArchiveSwitchRef.current = true;
      try {
        await flushAutosave();
        const tab = activeTemplateTab;
        let next = items.map((it) =>
          it.id === presetId ? { ...it, archived: true, isDefault: false } : it
        );
        let activeOnTab = next.filter(
          (it) => packageLibraryTemplateTabIdFromPreset(it.tabId) === tab && !it.archived
        );
        if (activeOnTab.length > 0 && !activeOnTab.some((it) => it.isDefault)) {
          const pickId = activeOnTab[0].id;
          next = next.map((it) =>
            packageLibraryTemplateTabIdFromPreset(it.tabId) !== tab
              ? it
              : { ...it, isDefault: !it.archived && it.id === pickId }
          );
          activeOnTab = next.filter(
            (it) => packageLibraryTemplateTabIdFromPreset(it.tabId) === tab && !it.archived
          );
        }
        const saved = await persist(next, 'Шаблон перенесён в архив.');
        if (!saved) return;
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        const fallback = activeOnTab.find((it) => it.isDefault)?.id ?? activeOnTab[0]?.id ?? '';
        if (fallback) {
          applyEditingTemplateFromList(next, fallback);
        } else {
          setEditingId('');
          setTitle('');
          setHtml('');
          setVisualDraftHtml('');
          resetTemplateHistory('');
        }
      } finally {
        templateArchiveSwitchRef.current = false;
      }
    })();
  }, [
    templateArchivePending,
    isSuperAdmin,
    templateArchiveSwitchRef,
    flushAutosave,
    activeTemplateTab,
    items,
    persist,
    autosaveTimerRef,
    applyEditingTemplateFromList,
    setEditingId,
    setTitle,
    setHtml,
    setVisualDraftHtml,
    resetTemplateHistory,
  ]);

  const templateArchiveConfirmMessage = useMemo(
    () =>
      templateArchivePending != null
        ? `Шаблон «${templateArchivePending.name}» будет скрыт из пакета «${templateLibraryKindLabel(activeLibraryKind)}» (останется в архиве). Восстановление: «Показать архивные» → «Восстановить».`
        : '',
    [templateArchivePending, activeLibraryKind]
  );

  const restoreArchivedTemplate = useCallback(async () => {
    if (!isSuperAdmin || !editingId) return;
    const current = items.find((it) => it.id === editingId);
    if (!current?.archived) return;
    const next = items.map((it) => (it.id === editingId ? { ...it, archived: false } : it));
    await persist(next, 'Шаблон восстановлен из архива.');
  }, [isSuperAdmin, editingId, items, persist]);

  return {
    requestArchiveTemplate,
    confirmArchiveTemplate,
    restoreArchivedTemplate,
    templateArchiveConfirmMessage,
  };
}
