import { useCallback } from 'react';

import {
  type ContractTemplatePreset,
  putContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import { canAutosaveLibraryTemplatePreset } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateSelection';

import { normalizeTemplateEditorHtml } from '../../templatesLibraryHtmlNormalize';
import { normalizeContractTemplatePreset } from '../../templatesLibraryPresetUtils';
import type {
  TemplatesLibraryMutationsPersistApi,
  UseTemplatesLibraryMutationsParams,
} from './templatesLibraryMutationsTypes';

export function useTemplatesLibraryMutationsPersist(
  params: UseTemplatesLibraryMutationsParams
): TemplatesLibraryMutationsPersistApi {
  const {
    isSuperAdmin,
    activeLibraryKind,
    activeTemplateTab,
    showArchivedTemplates,
    editingId,
    title,
    html,
    visualDraftHtml,
    editorMode,
    items,
    itemsByActiveTab,
    setItems,
    setSaving,
    setError,
    setOk,
    setHtml,
    setVisualDraftHtml,
    setAutosaveSavedVisible,
    visualEditorRef,
    autosaveTimerRef,
    lastSavedSnapshotRef,
  } = params;

  const persist = useCallback(
    async (next: ContractTemplatePreset[], successText: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      setOk(null);
      try {
        const normalized = next.map((it) => normalizeContractTemplatePreset(it));
        await putContractDocumentTemplatePresets({ kind: activeLibraryKind, items: normalized });
        setItems(normalized);
        lastSavedSnapshotRef.current = JSON.stringify(normalized);
        setOk(successText);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблоны');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [activeLibraryKind, lastSavedSnapshotRef, setError, setItems, setOk, setSaving]
  );

  const buildItemsForAutosave = useCallback((): ContractTemplatePreset[] | null => {
    if (!isSuperAdmin || !editingId || showArchivedTemplates) return null;
    const t = title.trim();
    const rawContentHtml = (
      editorMode === 'visual' ? (visualEditorRef.current?.innerHTML ?? visualDraftHtml) : html
    ).trim();
    const contentHtml = normalizeTemplateEditorHtml(rawContentHtml);
    if (!t || !contentHtml) return null;
    if (!canAutosaveLibraryTemplatePreset(items, editingId, activeTemplateTab)) return null;
    const exists = items.some((it) => it.id === editingId);
    if (exists) {
      return items.map((it) =>
        it.id === editingId ? { ...it, title: t, html: contentHtml, tabId: activeTemplateTab } : it
      );
    }
    return [
      ...items,
      {
        id: editingId,
        title: t,
        html: contentHtml,
        tabId: activeTemplateTab,
        isDefault: itemsByActiveTab.length === 0,
        archived: false,
      },
    ];
  }, [
    isSuperAdmin,
    editingId,
    showArchivedTemplates,
    title,
    html,
    visualDraftHtml,
    editorMode,
    items,
    activeTemplateTab,
    itemsByActiveTab.length,
    visualEditorRef,
  ]);

  const persistItemsSnapshot = useCallback(
    async (next: ContractTemplatePreset[]) => {
      const snapshot = JSON.stringify(next.map((it) => normalizeContractTemplatePreset(it)));
      if (snapshot === lastSavedSnapshotRef.current) return;
      setSaving(true);
      setError(null);
      try {
        const normalized = next.map((it) => normalizeContractTemplatePreset(it));
        await putContractDocumentTemplatePresets({ kind: activeLibraryKind, items: normalized });
        setItems(normalized);
        lastSavedSnapshotRef.current = JSON.stringify(normalized);
        const savedCurrent = editingId ? normalized.find((it) => it.id === editingId) : undefined;
        if (savedCurrent?.html) {
          setHtml(savedCurrent.html);
          setVisualDraftHtml(savedCurrent.html);
          const editor = visualEditorRef.current;
          if (
            editor &&
            editorMode === 'visual' &&
            document.activeElement !== editor &&
            editor.innerHTML !== savedCurrent.html
          ) {
            editor.innerHTML = savedCurrent.html;
          }
        }
        setAutosaveSavedVisible(true);
        window.setTimeout(() => setAutosaveSavedVisible(false), 1200);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить шаблон');
      } finally {
        setSaving(false);
      }
    },
    [
      activeLibraryKind,
      editingId,
      editorMode,
      lastSavedSnapshotRef,
      setAutosaveSavedVisible,
      setError,
      setHtml,
      setItems,
      setSaving,
      setVisualDraftHtml,
      visualEditorRef,
    ]
  );

  const persistAutosave = useCallback(async () => {
    const next = buildItemsForAutosave();
    if (!next) return;
    await persistItemsSnapshot(next);
  }, [buildItemsForAutosave, persistItemsSnapshot]);

  const flushAutosave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    await persistAutosave();
  }, [autosaveTimerRef, persistAutosave]);

  return {
    persist,
    buildItemsForAutosave,
    persistItemsSnapshot,
    persistAutosave,
    flushAutosave,
  };
}
