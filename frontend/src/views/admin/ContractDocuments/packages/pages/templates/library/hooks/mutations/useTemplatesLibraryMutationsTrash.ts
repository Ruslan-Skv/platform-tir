import { useCallback, useMemo } from 'react';

import { getContractDocumentTemplatePresets } from '@/shared/api/admin-contract-document-packages';
import { trashContractTemplatePreset } from '@/shared/api/contract-documents/admin-contract-document-template-presets-trash';
import { packageLibraryTemplateTabIdFromPreset } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

import {
  filterTemplatesByActiveKind,
  normalizeContractTemplatePreset,
  templateLibraryKindLabel,
} from '../../templatesLibraryPresetUtils';
import type {
  TemplatesLibraryMutationsPersistApi,
  UseTemplatesLibraryMutationsParams,
} from './templatesLibraryMutationsTypes';

type SelectionApi = {
  selectTemplate: (id: string) => void;
};

export function useTemplatesLibraryMutationsTrash(
  params: UseTemplatesLibraryMutationsParams,
  persistApi: TemplatesLibraryMutationsPersistApi,
  selectionApi: SelectionApi
) {
  const {
    isSuperAdmin,
    activeLibraryKind,
    activeTemplateTab,
    showArchivedTemplates,
    editingId,
    title,
    items,
    setItems,
    setSaving,
    setError,
    setOk,
    setEditingId,
    setTitle,
    setHtml,
    setVisualDraftHtml,
    resetTemplateHistory,
    refreshTrashCount,
    setTemplateTrashPending,
    templateTrashPending,
  } = params;

  const { flushAutosave } = persistApi;
  const { selectTemplate } = selectionApi;

  const requestMoveTemplateToTrash = useCallback(() => {
    if (!isSuperAdmin || !editingId) return;
    void (async () => {
      await flushAutosave();
      const current = items.find((it) => it.id === editingId);
      if (!current) return;
      const name = (current.title ?? title).trim() || 'без названия';
      setTemplateTrashPending({ presetId: editingId, name });
    })();
  }, [isSuperAdmin, editingId, flushAutosave, items, title, setTemplateTrashPending]);

  const confirmMoveTemplateToTrash = useCallback(() => {
    const pending = templateTrashPending;
    if (!pending || !isSuperAdmin) return;
    const presetId = pending.presetId;
    void (async () => {
      setSaving(true);
      setError(null);
      try {
        await trashContractTemplatePreset(presetId);
        const templatesRes = await getContractDocumentTemplatePresets(activeLibraryKind);
        const nextRaw = (templatesRes.items ?? []).map((it) => normalizeContractTemplatePreset(it));
        const next = filterTemplatesByActiveKind(nextRaw, activeLibraryKind);
        setItems(next);
        void refreshTrashCount();
        setOk('Шаблон перемещён в корзину.');
        const tabItems = next.filter((it) => {
          if (packageLibraryTemplateTabIdFromPreset(it.tabId) !== activeTemplateTab) return false;
          return showArchivedTemplates ? Boolean(it.archived) : !it.archived;
        });
        const fallback = tabItems.find((it) => it.isDefault)?.id ?? tabItems[0]?.id ?? '';
        if (fallback) selectTemplate(fallback);
        else {
          setEditingId('');
          setTitle('');
          setHtml('');
          setVisualDraftHtml('');
          resetTemplateHistory('');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось переместить шаблон в корзину');
      } finally {
        setSaving(false);
      }
    })();
  }, [
    templateTrashPending,
    isSuperAdmin,
    setSaving,
    setError,
    activeLibraryKind,
    setItems,
    refreshTrashCount,
    setOk,
    activeTemplateTab,
    showArchivedTemplates,
    selectTemplate,
    setEditingId,
    setTitle,
    setHtml,
    setVisualDraftHtml,
    resetTemplateHistory,
  ]);

  const templateTrashConfirmMessage = useMemo(
    () =>
      templateTrashPending != null
        ? `Шаблон «${templateTrashPending.name}» будет перемещён в корзину и скрыт из пакета «${templateLibraryKindLabel(activeLibraryKind)}». Через 30 дней он удалится безвозвратно. Восстановить можно из корзины.`
        : '',
    [templateTrashPending, activeLibraryKind]
  );

  return {
    requestMoveTemplateToTrash,
    confirmMoveTemplateToTrash,
    templateTrashConfirmMessage,
  };
}
