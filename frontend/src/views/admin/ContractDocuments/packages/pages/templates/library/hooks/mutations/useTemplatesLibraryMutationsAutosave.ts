import { useCallback, useEffect } from 'react';

import {
  normalizeContractTemplatePreset,
  templateLibraryKindLabel,
} from '../../templatesLibraryPresetUtils';
import type {
  TemplatesLibraryMutationsPersistApi,
  UseTemplatesLibraryMutationsParams,
} from './templatesLibraryMutationsTypes';

export function useTemplatesLibraryMutationsAutosave(
  params: UseTemplatesLibraryMutationsParams,
  persistApi: TemplatesLibraryMutationsPersistApi
) {
  const {
    isSuperAdmin,
    activeLibraryKind,
    showArchivedTemplates,
    loading,
    editingId,
    title,
    html,
    visualDraftHtml,
    editorMode,
    activeTemplateTab,
    items,
    ensureTemplateDraftForEditing,
    setError,
    setOk,
    visualEditorRef,
    autosaveTimerRef,
    lastSavedSnapshotRef,
    isInitialHydrationRef,
    templateTabSwitchRef,
    templateArchiveSwitchRef,
  } = params;

  const { buildItemsForAutosave, persistAutosave } = persistApi;

  const handleSaveNow = useCallback(async () => {
    if (!isSuperAdmin || showArchivedTemplates) return;
    if (!editingId) ensureTemplateDraftForEditing();
    const hasHtml =
      (editorMode === 'visual' ? (visualEditorRef.current?.innerHTML ?? html) : html).trim()
        .length > 0;
    if (!hasHtml) {
      setError('Шаблон пустой. Добавьте текст и сохраните снова.');
      return;
    }
    if (!title.trim()) {
      setError('Укажите название шаблона перед сохранением.');
      return;
    }
    await persistApi.persistAutosave();
    setOk(`Шаблон сохранён для направления «${templateLibraryKindLabel(activeLibraryKind)}».`);
  }, [
    isSuperAdmin,
    showArchivedTemplates,
    editingId,
    ensureTemplateDraftForEditing,
    editorMode,
    html,
    title,
    persistApi,
    activeLibraryKind,
    setError,
    setOk,
    visualEditorRef,
  ]);

  useEffect(() => {
    if (loading || !isSuperAdmin) return;
    if (templateTabSwitchRef.current || templateArchiveSwitchRef.current) return;
    if (isInitialHydrationRef.current) {
      isInitialHydrationRef.current = false;
      const initial = buildItemsForAutosave();
      lastSavedSnapshotRef.current = JSON.stringify(
        initial?.map((it) => normalizeContractTemplatePreset(it)) ?? items
      );
      return;
    }
    if (showArchivedTemplates) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void persistAutosave();
    }, 700);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    loading,
    isSuperAdmin,
    showArchivedTemplates,
    title,
    html,
    visualDraftHtml,
    editorMode,
    editingId,
    activeTemplateTab,
    items,
    buildItemsForAutosave,
    persistAutosave,
    autosaveTimerRef,
    isInitialHydrationRef,
    lastSavedSnapshotRef,
    templateArchiveSwitchRef,
    templateTabSwitchRef,
  ]);

  return { handleSaveNow };
}
